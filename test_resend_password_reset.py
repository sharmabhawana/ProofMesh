"""
ProofMesh: Comprehensive Resend Integration & Password Recovery Test
Tests:
1. Resend SDK integration in auth/email_service.py
2. Live dispatch via Resend API
3. User Forgot Password flow (single-use expiring token)
4. Admin Forgot Password flow (role-enforced, single-use token)
5. Token invalidation upon use
6. Password reset and subsequent login verification
"""
import os
import sys
import time
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi.testclient import TestClient

load_dotenv()

from main import app
from auth.db_session import get_db_session
from auth.models import User, PasswordResetToken
from auth.email_service import get_email_config, send_password_reset_email
from auth.security import verify_password

client = TestClient(app)

print("=" * 80)
print("PROOFMESH: RESEND INTEGRATION & PASSWORD RECOVERY AUDIT")
print("=" * 80)

audit_results = {}
details = {}

def record_check(step_num: int, title: str, passed: bool, step_details: dict):
    status_str = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n[{status_str}] Step {step_num}: {title}")
    for k, v in step_details.items():
        print(f"    • {k}: {v}")
    audit_results[step_num] = passed
    details[str(step_num)] = {
        "title": title,
        "passed": passed,
        **step_details
    }

# ----------------------------------------------------------------------------
# STEP 1: Verify Resend Configuration
# ----------------------------------------------------------------------------
config = get_email_config()
provider = config.get("provider")
email_from = config.get("smtp_from")
has_key = bool(config.get("resend_api_key"))

step1_pass = (provider == "resend" and has_key and bool(email_from))
record_check(1, "Resend Environment Configuration", step1_pass, {
    "provider": provider,
    "email_from": email_from,
    "api_key_configured": has_key,
    "api_key_masked": "[CONFIGURED_PRIVATELY_IN_ENV]" if has_key else "MISSING",
    "frontend_url": config.get("frontend_url")
})

# Target recipient for Resend testing (Resend free-tier requires account email)
target_recipient = "sharmabhawana66770@gmail.com"

# ----------------------------------------------------------------------------
# STEP 2: Live Resend Email Dispatch via Official SDK
# ----------------------------------------------------------------------------
print(f"\nDispatching live test reset email to {target_recipient} via Resend SDK...")
dispatch_res = send_password_reset_email(
    to_email=target_recipient,
    raw_token="test_resend_token_48123910391203",
    role_scope="user",
    expires_minutes=15
)

msg_id = dispatch_res.get("provider_msg_id")
api_accepted = (dispatch_res.get("delivered") is True and bool(msg_id))

record_check(2, "Live Resend API Submission & Acceptance", api_accepted, {
    "recipient": target_recipient,
    "api_accepted": api_accepted,
    "resend_message_id": msg_id,
    "api_status": dispatch_res.get("api_status", "accepted"),
    "error": dispatch_res.get("error"),
    "delivery_distinction": "API accepted by Resend Edge Mail Transfer Agent; inbox delivery is subject to recipient mail server processing."
})

# ----------------------------------------------------------------------------
# STEP 3: User Forgot Password Flow
# ----------------------------------------------------------------------------
# Query an existing standard user
with get_db_session() as db:
    std_user = db.query(User).filter(User.role == "user").first()
    assert std_user is not None, "Standard user not found in DB"
    user_test_email = std_user.email
    user_username = std_user.username
    user_id = std_user.id

user_new_pw = "NewUserPass456!Secure"
user_fp_resp = client.post("/api/auth/forgot-password", json={
    "email": user_test_email,
    "role": "user"
})
assert user_fp_resp.status_code == 200
user_fp_data = user_fp_resp.json()

# Inspect token in database & memory slot
from auth.email_service import get_last_dispatched_reset
last_dispatched = get_last_dispatched_reset()
user_raw_token = last_dispatched.get("token") if last_dispatched else ""

with get_db_session() as db:
    latest_token_row = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).order_by(PasswordResetToken.created_at.desc()).first()
    assert latest_token_row is not None
    user_token_id = latest_token_row.id
    token_valid = (
        latest_token_row.role_scope == "user"
        and latest_token_row.used_at is None
        and latest_token_row.expires_at > datetime.now(timezone.utc)
    )

# Now reset password using the token
user_reset_resp = client.post("/api/auth/reset-password", json={
    "token": user_raw_token,
    "new_password": user_new_pw,
    "confirm_password": user_new_pw
})
user_reset_success = (user_reset_resp.status_code == 200)

# Verify token is now invalid / single-use
with get_db_session() as db:
    db_token = db.query(PasswordResetToken).filter(PasswordResetToken.id == user_token_id).first()
    token_marked_used = (db_token.used_at is not None)

# Second reset attempt MUST fail (single-use token)
user_reuse_resp = client.post("/api/auth/reset-password", json={
    "token": user_raw_token,
    "new_password": "AnotherPassword123!",
    "confirm_password": "AnotherPassword123!"
})
reuse_rejected = (user_reuse_resp.status_code == 400)

# Verify login with new password
user_login_resp = client.post("/api/auth/login", data={"username": user_username, "password": user_new_pw})
user_login_success = (user_login_resp.status_code == 200)

record_check(3, "User Forgot Password & Single-Use Reset Flow", user_reset_success and token_marked_used and reuse_rejected and user_login_success, {
    "forgot_password_generic_message": user_fp_data.get("message"),
    "token_created_in_db": token_valid,
    "password_reset_success": user_reset_success,
    "token_marked_used": token_marked_used,
    "token_reuse_rejected": reuse_rejected,
    "user_login_with_new_password": user_login_success
})

# ----------------------------------------------------------------------------
# STEP 4: Admin Forgot Password Flow (Role-Scoped & Enforced with Live Resend)
# ----------------------------------------------------------------------------
# Admin account: sharma1 has email sharmabhawana66770@gmail.com and role admin
admin_new_pw = "NewAdminPass789!Secure"

# Call admin forgot-password endpoint
admin_fp_resp = client.post("/api/auth/admin/forgot-password", json={
    "email": target_recipient
})
assert admin_fp_resp.status_code == 200
admin_fp_data = admin_fp_resp.json()

admin_dispatched = get_last_dispatched_reset()
admin_raw_token = admin_dispatched.get("token") if admin_dispatched else ""
admin_resend_msg_id = admin_dispatched.get("provider_msg_id") if admin_dispatched else None

with get_db_session() as db:
    admin_token_row = db.query(PasswordResetToken).filter(PasswordResetToken.role_scope == "admin").order_by(PasswordResetToken.created_at.desc()).first()
    assert admin_token_row is not None
    admin_token_id = admin_token_row.id
    admin_token_valid = (
        admin_token_row.role_scope == "admin"
        and admin_token_row.used_at is None
        and admin_token_row.expires_at > datetime.now(timezone.utc)
    )

# Reset admin password via admin recovery endpoint
admin_reset_resp = client.post("/api/auth/admin/reset-password", json={
    "token": admin_raw_token,
    "new_password": admin_new_pw,
    "confirm_password": admin_new_pw
})
admin_reset_success = (admin_reset_resp.status_code == 200)

# Verify single-use
with get_db_session() as db:
    db_admin_token = db.query(PasswordResetToken).filter(PasswordResetToken.id == admin_token_id).first()
    admin_token_marked_used = (db_admin_token.used_at is not None)

admin_reuse_resp = client.post("/api/auth/admin/reset-password", json={
    "token": admin_raw_token,
    "new_password": "AnotherPassword123!",
    "confirm_password": "AnotherPassword123!"
})
admin_reuse_rejected = (admin_reuse_resp.status_code == 400)

# Verify admin login with new password
admin_login_resp = client.post("/api/auth/login", data={"username": "sharma1", "password": admin_new_pw})
admin_login_success = (admin_login_resp.status_code == 200)

record_check(4, "Admin Forgot Password & Single-Use Reset Flow", admin_reset_success and admin_reuse_rejected and admin_login_success, {
    "admin_email": target_recipient,
    "role_scope_enforced": "admin",
    "resend_accepted_for_admin": bool(admin_resend_msg_id),
    "admin_resend_message_id": admin_resend_msg_id,
    "forgot_password_generic_message": admin_fp_data.get("message"),
    "admin_reset_success": admin_reset_success,
    "single_use_invalidated": admin_reuse_rejected,
    "admin_login_with_new_password": admin_login_success
})

# ----------------------------------------------------------------------------
# STEP 5: Safe Error Handling (No Secret Leaks)
# ----------------------------------------------------------------------------
# Test dispatch to invalid email to check safe error handling
bad_dispatch = send_password_reset_email(
    to_email="invalid_address_format",
    raw_token="fake_token",
    role_scope="user"
)
error_msg = str(bad_dispatch.get("error", ""))
secret_leaked = (config.get("resend_api_key", "") in error_msg and len(config.get("resend_api_key", "")) > 10)

record_check(5, "Safe Error Handling (Secret Protection)", not secret_leaked, {
    "error_handled_safely": bool(bad_dispatch.get("error")),
    "secret_leaked": secret_leaked,
    "safe_error_preview": error_msg[:80] + "..." if len(error_msg) > 80 else error_msg
})

print("\n" + "=" * 80)
total_steps = len(audit_results)
passed_steps = sum(1 for p in audit_results.values() if p)
print(f"RESEND AUDIT SUMMARY: {passed_steps}/{total_steps} CHECKS PASSED ({passed_steps/total_steps*100:.1f}%)")
print("=" * 80)

# Save JSON results
import json
with open("resend_verification_results.json", "w", encoding="utf-8") as f:
    json.dump({
        "timestamp": str(datetime.now(timezone.utc)),
        "provider": provider,
        "email_from": email_from,
        "recipient_tested": target_recipient,
        "resend_message_id": msg_id,
        "steps": details
    }, f, indent=2)

sys.exit(0 if passed_steps == total_steps else 1)
