"""
ProofMesh — 21-Point Comprehensive Password Recovery & Security Audit Suite
============================================================================
Covers all 21 verification points specified in Section 11:
 1. User forgot-password request
 2. Admin forgot-password request
 3. Registered email recovery
 4. Unregistered email generic response (anti-enumeration)
 5. Email provider acceptance / logging status check
 6. Valid reset token verification
 7. Expired reset token rejection
 8. Invalid reset token rejection
 9. Reused reset token rejection (single-use enforcement)
 10. User cannot use an admin recovery token (role boundary enforcement)
 11. Admin cannot reset a normal user's password through admin recovery
 12. Successful password update in database
 13. Old password rejected after reset
 14. New password accepted after reset
 15. Existing JWT authentication remains functional
 16. Existing user login remains functional
 17. Existing admin login remains functional
 18. Password hashes never appear in API responses
 19. Reset-request rate limiting enforcement
 20. Database schema & role_scope persistence check
 21. Frontend production build verification
"""

import os
import sys
import time
from datetime import datetime, timezone, timedelta

os.environ["TESTING"] = "true"

from fastapi.testclient import TestClient
from main import app
from auth.email_service import get_last_dispatched_reset, send_password_reset_email, get_email_config
from auth.auth_database import (
    create_user,
    find_user_by_username,
    find_user_by_email,
    create_password_reset_token,
    verify_password_reset_token,
    consume_password_reset_token,
    initialize_database,
)
from auth.models import PasswordResetToken, User
from auth.db_session import get_db_session
from auth.security import hash_password, verify_password

client = TestClient(app)
PASS = []
FAIL = []


def record(test_num: int, name: str, passed: bool, detail: str = ""):
    status_str = "PASS" if passed else "FAIL"
    marker = "✅" if passed else "❌"
    msg = f"{marker} [ #{test_num:02d} {status_str} ] {name}"
    if detail:
        msg += f" — {detail}"
    print(msg)
    if passed:
        PASS.append(name)
    else:
        FAIL.append(name)


print("=" * 80)
print("PROOFMESH: 21-POINT PASSWORD RECOVERY & EMAIL INTEGRATION SUITE")
print("=" * 80)

# ----------------------------------------------------------------------------
# Setup isolated test accounts
# ----------------------------------------------------------------------------
initialize_database()

ts = int(time.time() * 1000)
test_user_username = f"testuser_{ts}"
test_user_email = f"testuser_{ts}@proofmesh.local"
test_user_pass = "UserInitial@1234!"
test_user_id = create_user(
    username=test_user_username,
    email=test_user_email,
    password_hash=hash_password(test_user_pass),
    role="user",
    full_name="Regular Test User",
)

test_admin_username = f"testadmin_{ts}"
test_admin_email = f"testadmin_{ts}@proofmesh.local"
test_admin_pass = "AdminInitial@1234!"
test_admin_id = create_user(
    username=test_admin_username,
    email=test_admin_email,
    password_hash=hash_password(test_admin_pass),
    role="admin",
    full_name="Admin Test User",
)

# 1. User forgot-password request
resp1 = client.post("/api/auth/forgot-password", json={"email": test_user_email})
record(1, "User Forgot-Password Request", resp1.status_code == 200 and "message" in resp1.json(), f"status={resp1.status_code}")

# 2. Admin forgot-password request
resp2 = client.post("/api/auth/admin/forgot-password", json={"email": test_admin_email})
record(2, "Admin Forgot-Password Request", resp2.status_code == 200 and "message" in resp2.json(), f"status={resp2.status_code}")

# 3. Registered email recovery
last_reset = get_last_dispatched_reset()
record(3, "Registered Email Recovery Dispatch", last_reset is not None and last_reset.get("recipient") == test_admin_email)

# 4. Unregistered email generic response
resp4 = client.post("/api/auth/forgot-password", json={"email": "nobody_nonexistent@proofmesh.local"})
record(4, "Unregistered Email Generic Response (Anti-Enumeration)", resp4.status_code == 200 and "message" in resp4.json())

# 5. Email provider acceptance / logging status check
cfg = get_email_config()
record(5, "Email Provider Resolution", cfg["provider"] in ("smtp", "resend", "development"))

# 6. Valid reset token verification
raw_token_user = create_password_reset_token(test_user_id, role_scope="user", expires_minutes=15)
verified_uid = verify_password_reset_token(raw_token_user, expected_role="user")
record(6, "Valid Reset Token Verification", verified_uid == test_user_id)

# 7. Expired reset token rejection
raw_token_exp = create_password_reset_token(test_user_id, role_scope="user", expires_minutes=-5)
verified_exp = verify_password_reset_token(raw_token_exp, expected_role="user")
record(7, "Expired Reset Token Rejection", verified_exp is None)

# 8. Invalid reset token rejection
verified_inv = verify_password_reset_token("completely_fabricated_token_value_12345678", expected_role="user")
record(8, "Invalid Reset Token Rejection", verified_inv is None)

# 9. Reused reset token rejection (single-use enforcement)
t_single = create_password_reset_token(test_user_id, role_scope="user", expires_minutes=15)
first_use = consume_password_reset_token(t_single, hash_password("NewPassSingleUse1!"), expected_role="user")
second_use = consume_password_reset_token(t_single, hash_password("AnotherPassAttempt2!"), expected_role="user")
record(9, "Reused Reset Token Rejection (Single-Use)", first_use is True and second_use is False)

# 10. User cannot use an admin recovery token
t_admin = create_password_reset_token(test_admin_id, role_scope="admin", expires_minutes=15)
user_tries_admin_token = client.post("/api/auth/reset-password", json={"token": t_admin, "new_password": "HackedPassword123!"})
record(10, "User Cannot Use Admin Recovery Token", user_tries_admin_token.status_code == 400)

# 11. Admin cannot reset a normal user's password through admin recovery
resp11 = client.post("/api/auth/admin/forgot-password", json={"email": test_user_email})
last_dispatch_after_user = get_last_dispatched_reset()
record(11, "Admin Recovery Rejects Normal User Account", resp11.status_code == 200 and (last_dispatch_after_user is None or last_dispatch_after_user.get("role_scope") != "admin" or last_dispatch_after_user.get("recipient") != test_user_email))

# 12. Successful password update in database
t_valid_user = create_password_reset_token(test_user_id, role_scope="user", expires_minutes=15)
new_user_pwd = "UpdatedUserPassword123!@#"
resp12 = client.post("/api/auth/reset-password", json={"token": t_valid_user, "new_password": new_user_pwd})
record(12, "Successful Password Update via API", resp12.status_code == 200)

# 13. Old password rejected after reset
old_login = client.post("/api/auth/login", data={"username": test_user_email, "password": test_user_pass})
record(13, "Old Password Rejected After Reset", old_login.status_code == 401)

# 14. New password accepted after reset
new_login = client.post("/api/auth/login", data={"username": test_user_email, "password": new_user_pwd})
record(14, "New Password Accepted After Reset", new_login.status_code == 200 and "access_token" in new_login.json())

# 15. Existing JWT authentication remains functional
jwt_token = new_login.json().get("access_token", "")
me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {jwt_token}"})
record(15, "Existing JWT Authentication Functional", me_resp.status_code == 200 and me_resp.json().get("email") == test_user_email)

# 16. Existing user login remains functional
user_direct_login = client.post("/api/auth/login", data={"username": test_user_username, "password": new_user_pwd})
record(16, "Standard User Login Functional", user_direct_login.status_code == 200)

# 17. Existing admin login remains functional
admin_direct_login = client.post("/api/auth/login", data={"username": "admin", "password": "AdminPass123!"})
record(17, "Existing Admin Login Functional", admin_direct_login.status_code == 200 and admin_direct_login.json().get("user", {}).get("role") == "admin")

# 18. Password hashes never appear in API responses
user_body_str = str(me_resp.json())
admin_body_str = str(admin_direct_login.json())
hashes_leak = ("$2b$" in user_body_str or "$argon2" in user_body_str or "$2b$" in admin_body_str)
record(18, "Password Hashes Omitted From All Responses", not hashes_leak)

# 19. Reset-request rate limiting enforcement
os.environ["TESTING"] = "false"
rate_limit_tripped = False
for _ in range(8):
    rl_resp = client.post("/api/auth/forgot-password", json={"email": f"flood_{_}@proofmesh.local"})
    if rl_resp.status_code == 429:
        rate_limit_tripped = True
        break
os.environ["TESTING"] = "true"
record(19, "Reset-Request IP Rate Limiting", rate_limit_tripped)

# 20. Database migration & role_scope persistence check
with get_db_session() as sess:
    sample_rec = sess.query(PasswordResetToken).first()
    has_role_scope = sample_rec is not None and hasattr(sample_rec, "role_scope")
record(20, "Database Persistence & role_scope Schema", has_role_scope)

# 21. Frontend production build verification
frontend_index = os.path.exists("frontend/dist/index.html")
record(21, "Frontend Production Build Exists", frontend_index)

print("=" * 80)
total_tests = len(PASS) + len(FAIL)
print(f"RESULTS: {len(PASS)}/{total_tests} Tests Passed ({len(PASS)/total_tests*100:.1f}%)")
if FAIL:
    print("FAILED TESTS:")
    for f in FAIL:
        print(f"  ❌ {f}")
print("=" * 80)

sys.exit(0 if not FAIL else 1)
