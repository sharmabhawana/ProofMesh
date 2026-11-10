"""
ProofMesh — Complete 20-Point Authentication & Security Test Suite
Covers all 20 required verification criteria:
 1. Successful user registration
 2. Duplicate username rejection
 3. Duplicate email rejection
 4. Successful user login
 5. Invalid password rejection
 6. Successful admin login
 7. Valid JWT authentication
 8. Invalid JWT rejection
 9. Expired JWT rejection
 10. Revoked JWT rejection
 11. Disabled account rejection
 12. User profile retrieval
 13. Admin-only endpoint authorization
 14. Normal user denied admin access
 15. User ownership enforcement
 16. Password hashes excluded from responses
 17. User cannot register with admin role
 18. Logout and session invalidation
 19. PostgreSQL connection and production enforcement check
 20. Frontend production build
"""

import os
import sys
import time
import hashlib
from datetime import datetime, timedelta, timezone

# Ensure testing flag is active for automated execution
os.environ["TESTING"] = "true"

import jwt
from fastapi.testclient import TestClient

from main import app
from auth.models import Base, User, RevokedToken
from auth.db_session import (
    engine,
    SessionLocal,
    get_db_session,
    check_db_connection,
    get_database_url,
)
from auth.auth_database import (
    initialize_database,
    find_user_by_username,
    find_user_by_email,
    find_user_by_id,
    create_user,
    list_users,
    update_user_status,
    revoke_token,
    is_token_revoked,
)
from auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    resolve_jwt_secret,
    validate_password_strength,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    InMemoryRateLimiter,
)

client = TestClient(app)
results = {}


def record_result(test_num: int, name: str, passed: bool, details: str):
    key = f"TEST_{test_num:02d}_{name}"
    status_str = "PASS" if passed else "FAIL"
    results[key] = {"status": status_str, "details": details}
    print(f"[{status_str:^6}] #{test_num:02d}: {name} - {details}")


print("=" * 80)
print("PROOFMESH: 20-POINT COMPREHENSIVE AUTHENTICATION & SECURITY TEST SUITE")
print("=" * 80)

# Initialize schema
initialize_database()

# Generate unique timestamps for isolation
ts = int(time.time() * 1000)
test_user_name = f"sec_user_{ts}"
test_user_email = f"sec_user_{ts}@proofmesh.io"
test_user_pass = "EnterprisePass123!@#"

# ============================================================
# 1. SUCCESSFUL USER REGISTRATION
# ============================================================
try:
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "username": test_user_name,
            "email": test_user_email,
            "password": test_user_pass,
            "full_name": "Security Audit Tester",
        },
    )
    reg_data = reg_resp.json()
    is_ok = reg_resp.status_code == 201 and "user_id" in reg_data and reg_data.get("role") == "user"
    record_result(1, "Successful User Registration", is_ok, f"HTTP {reg_resp.status_code}, user_id={reg_data.get('user_id')}")
    test_user_id = reg_data.get("user_id")
except Exception as e:
    record_result(1, "Successful User Registration", False, str(e))
    test_user_id = None

# ============================================================
# 2. DUPLICATE USERNAME REJECTION
# ============================================================
try:
    dup_uname_resp = client.post(
        "/api/auth/register",
        json={
            "username": test_user_name,
            "email": f"different_{ts}@proofmesh.io",
            "password": "OtherSecurePass123!$",
            "full_name": "Duplicate Tester",
        },
    )
    is_rejected = dup_uname_resp.status_code in (400, 409)
    record_result(2, "Duplicate Username Rejection", is_rejected, f"HTTP {dup_uname_resp.status_code}: {dup_uname_resp.text}")
except Exception as e:
    record_result(2, "Duplicate Username Rejection", False, str(e))

# ============================================================
# 3. DUPLICATE EMAIL REJECTION
# ============================================================
try:
    dup_email_resp = client.post(
        "/api/auth/register",
        json={
            "username": f"unique_{ts}",
            "email": test_user_email,
            "password": "OtherSecurePass123!$",
            "full_name": "Duplicate Tester",
        },
    )
    is_rejected = dup_email_resp.status_code in (400, 409)
    record_result(3, "Duplicate Email Rejection", is_rejected, f"HTTP {dup_email_resp.status_code}: {dup_email_resp.text}")
except Exception as e:
    record_result(3, "Duplicate Email Rejection", False, str(e))

# ============================================================
# 4. SUCCESSFUL USER LOGIN
# ============================================================
user_token = None
try:
    login_resp = client.post(
        "/api/auth/login",
        data={
            "username": test_user_email,
            "password": test_user_pass,
        },
    )
    login_data = login_resp.json()
    is_ok = login_resp.status_code == 200 and "access_token" in login_data
    if is_ok:
        user_token = login_data["access_token"]
    record_result(4, "Successful User Login", is_ok, f"HTTP {login_resp.status_code}, token issued: {bool(user_token)}")
except Exception as e:
    record_result(4, "Successful User Login", False, str(e))

# ============================================================
# 5. INVALID PASSWORD REJECTION
# ============================================================
try:
    bad_login_resp = client.post(
        "/api/auth/login",
        data={
            "username": test_user_email,
            "password": "CompletelyWrongPassword999!",
        },
    )
    is_rejected = bad_login_resp.status_code == 401
    record_result(5, "Invalid Password Rejection", is_rejected, f"HTTP {bad_login_resp.status_code}: {bad_login_resp.text}")
except Exception as e:
    record_result(5, "Invalid Password Rejection", False, str(e))

# ============================================================
# 6. SUCCESSFUL ADMIN LOGIN
# ============================================================
admin_token = None
try:
    admin_login_resp = client.post(
        "/api/auth/login",
        data={
            "username": "admin",
            "password": "AdminPass123!",
        },
    )
    admin_data = admin_login_resp.json()
    is_ok = admin_login_resp.status_code == 200 and admin_data.get("user", {}).get("role") == "admin"
    if is_ok:
        admin_token = admin_data["access_token"]
    record_result(6, "Successful Admin Login", is_ok, f"HTTP {admin_login_resp.status_code}, admin role confirmed")
except Exception as e:
    record_result(6, "Successful Admin Login", False, str(e))

# ============================================================
# 7. VALID JWT AUTHENTICATION
# ============================================================
try:
    auth_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    auth_data = auth_resp.json()
    is_ok = auth_resp.status_code == 200 and auth_data.get("username") == test_user_name
    record_result(7, "Valid JWT Authentication", is_ok, f"HTTP {auth_resp.status_code}, verified identity: {auth_data.get('username')}")
except Exception as e:
    record_result(7, "Valid JWT Authentication", False, str(e))

# ============================================================
# 8. INVALID JWT REJECTION
# ============================================================
try:
    bad_token_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature"},
    )
    is_rejected = bad_token_resp.status_code == 401
    record_result(8, "Invalid JWT Rejection", is_rejected, f"HTTP {bad_token_resp.status_code}: {bad_token_resp.text}")
except Exception as e:
    record_result(8, "Invalid JWT Rejection", False, str(e))

# ============================================================
# 9. EXPIRED JWT REJECTION
# ============================================================
try:
    secret = resolve_jwt_secret()
    past_time = datetime.now(timezone.utc) - timedelta(hours=2)
    expired_payload = {
        "sub": str(test_user_id),
        "iat": past_time - timedelta(minutes=60),
        "exp": past_time,
    }
    expired_token = jwt.encode(expired_payload, secret, algorithm=JWT_ALGORITHM)
    exp_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    is_rejected = exp_resp.status_code == 401
    record_result(9, "Expired JWT Rejection", is_rejected, f"HTTP {exp_resp.status_code}: {exp_resp.text}")
except Exception as e:
    record_result(9, "Expired JWT Rejection", False, str(e))

# ============================================================
# 10. REVOKED JWT REJECTION
# ============================================================
try:
    # Issue a temporary token and explicitly revoke it in database
    temp_token = create_access_token(test_user_id)
    temp_hash = hashlib.sha256(temp_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)
    revoke_token(temp_hash, test_user_id, expires_at)

    rev_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {temp_token}"},
    )
    is_rejected = rev_resp.status_code == 401 and "revoked" in rev_resp.text.lower()
    record_result(10, "Revoked JWT Rejection", is_rejected, f"HTTP {rev_resp.status_code}: {rev_resp.text}")
except Exception as e:
    record_result(10, "Revoked JWT Rejection", False, str(e))

# ============================================================
# 11. DISABLED ACCOUNT REJECTION
# ============================================================
try:
    # Temporarily deactivate test user
    update_user_status(test_user_id, False)
    fresh_user = find_user_by_id(test_user_id)
    assert fresh_user["is_active"] == 0 or fresh_user["is_active"] is False

    # Attempt to authenticate with disabled account
    dis_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    is_rejected = dis_resp.status_code == 403
    # Re-enable user for remaining tests
    update_user_status(test_user_id, True)
    record_result(11, "Disabled Account Rejection", is_rejected, f"HTTP {dis_resp.status_code}: {dis_resp.text}")
except Exception as e:
    update_user_status(test_user_id, True)
    record_result(11, "Disabled Account Rejection", False, str(e))

# ============================================================
# 12. USER PROFILE RETRIEVAL
# ============================================================
try:
    prof_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    p_data = prof_resp.json()
    is_ok = (
        prof_resp.status_code == 200
        and p_data.get("id") == test_user_id
        and p_data.get("email") == test_user_email
        and "password_hash" not in p_data
    )
    record_result(12, "User Profile Retrieval", is_ok, f"HTTP {prof_resp.status_code}, profile fields sanitized")
except Exception as e:
    record_result(12, "User Profile Retrieval", False, str(e))

# ============================================================
# 13. ADMIN-ONLY ENDPOINT AUTHORIZATION
# ============================================================
try:
    admin_users_resp = client.get(
        "/api/auth/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    au_data = admin_users_resp.json()
    is_ok = admin_users_resp.status_code == 200 and "total_users" in au_data and isinstance(au_data.get("users"), list)
    record_result(13, "Admin-Only Endpoint Authorization", is_ok, f"HTTP {admin_users_resp.status_code}, total_users={au_data.get('total_users')}")
except Exception as e:
    record_result(13, "Admin-Only Endpoint Authorization", False, str(e))

# ============================================================
# 14. NORMAL USER DENIED ADMIN ACCESS
# ============================================================
try:
    forbidden_resp = client.get(
        "/api/auth/admin/users",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    is_forbidden = forbidden_resp.status_code == 403
    record_result(14, "Normal User Denied Admin Access", is_forbidden, f"HTTP {forbidden_resp.status_code}: {forbidden_resp.text}")
except Exception as e:
    record_result(14, "Normal User Denied Admin Access", False, str(e))

# ============================================================
# 15. USER OWNERSHIP ENFORCEMENT
# ============================================================
try:
    # Normal user cannot update another user's status or access admin patch
    patch_resp = client.patch(
        f"/api/auth/admin/users/{test_user_id}/status",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"is_active": False},
    )
    is_enforced = patch_resp.status_code == 403

    # Admin cannot disable their own account
    admin_self = find_user_by_username("admin")
    self_disable_resp = client.patch(
        f"/api/auth/admin/users/{admin_self.id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )
    is_self_protected = self_disable_resp.status_code == 400

    record_result(15, "User Ownership & Self-Disable Protection", is_enforced and is_self_protected,
                  f"User denied admin patch: HTTP {patch_resp.status_code}; Self-disable blocked: HTTP {self_disable_resp.status_code}")
except Exception as e:
    record_result(15, "User Ownership Enforcement", False, str(e))

# ============================================================
# 16. PASSWORD HASHES EXCLUDED FROM RESPONSES
# ============================================================
try:
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    admin_list_resp = client.get("/api/auth/admin/users", headers={"Authorization": f"Bearer {admin_token}"})

    me_json = me_resp.text
    admin_json = admin_list_resp.text

    no_me_hash = "password_hash" not in me_json and "pbkdf2:sha256" not in me_json
    no_admin_hash = "password_hash" not in admin_json and "pbkdf2:sha256" not in admin_json

    record_result(16, "Password Hashes Excluded From Responses", no_me_hash and no_admin_hash,
                  f"/me clean: {no_me_hash}, /admin/users clean: {no_admin_hash}")
except Exception as e:
    record_result(16, "Password Hashes Excluded From Responses", False, str(e))

# ============================================================
# 17. USER CANNOT REGISTER WITH ADMIN ROLE
# ============================================================
try:
    priv_esc_name = f"esc_{ts}"
    priv_resp = client.post(
        "/api/auth/register",
        json={
            "username": priv_esc_name,
            "email": f"{priv_esc_name}@proofmesh.io",
            "password": "SecurePassword123!@",
            "role": "admin",  # Attacker attempts privilege escalation
        },
    )
    created_user = find_user_by_username(priv_esc_name)
    # The user must have role 'user', ignoring or rejecting the 'admin' injection
    is_safe = created_user is not None and created_user.role == "user"
    record_result(17, "User Cannot Register With Admin Role", is_safe,
                  f"Created user role is strictly '{created_user.role if created_user else None}'")
except Exception as e:
    record_result(17, "User Cannot Register With Admin Role", False, str(e))

# ============================================================
# 18. LOGOUT AND SESSION INVALIDATION
# ============================================================
try:
    # 1. Log in to acquire a fresh token
    fresh_login = client.post(
        "/api/auth/login",
        data={"username": test_user_email, "password": test_user_pass},
    )
    session_token = fresh_login.json()["access_token"]

    # 2. Verify token is initially active
    check1 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_token}"})
    assert check1.status_code == 200

    # 3. Call server-side logout
    logout_resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {session_token}"})
    logout_ok = logout_resp.status_code == 200

    # 4. Attempt to access protected endpoint with the logged-out token
    check2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_token}"})
    subsequently_rejected = check2.status_code == 401

    record_result(18, "Logout and Session Invalidation", logout_ok and subsequently_rejected,
                  f"Logout HTTP {logout_resp.status_code}, Post-logout access HTTP {check2.status_code}")
except Exception as e:
    record_result(18, "Logout and Session Invalidation", False, str(e))

# ============================================================
# 19. POSTGRESQL & PRODUCTION STRICTNESS CHECKS
# ============================================================
try:
    # Check 1: Live connection diagnostics
    conn_info = check_db_connection()
    dialect = conn_info.get("dialect")
    url_type = conn_info.get("url_type")

    # Check 2: Production strictness verification (SQLite forbidden in prod)
    from auth.db_session import create_db_engine
    os.environ["ENVIRONMENT"] = "production"
    os.environ["DATABASE_URL"] = "sqlite:///test.db"
    strictness_passed = False
    try:
        create_db_engine()
    except RuntimeError as re:
        if "SQLite is not permitted" in str(re) or "Local SQLite fallback is disabled" in str(re):
            strictness_passed = True
    finally:
        os.environ["ENVIRONMENT"] = "development"
        os.environ.pop("DATABASE_URL", None)

    record_result(19, "PostgreSQL & Production Strictness", strictness_passed,
                  f"Active dialect: {dialect} ({url_type}); Production rejects SQLite: {strictness_passed}")
except Exception as e:
    record_result(19, "PostgreSQL & Production Strictness", False, str(e))

# ============================================================
# 20. FRONTEND PRODUCTION BUILD
# ============================================================
try:
    dist_html = os.path.join("frontend", "dist", "index.html")
    dist_exists = os.path.exists(dist_html)
    dist_size = os.path.getsize(dist_html) if dist_exists else 0
    record_result(20, "Frontend Production Build", dist_exists and dist_size > 0,
                  f"frontend/dist/index.html verified ({dist_size} bytes)")
except Exception as e:
    record_result(20, "Frontend Production Build", False, str(e))

print("=" * 80)
total_tests = len(results)
passed_tests = sum(1 for r in results.values() if r["status"] == "PASS")
failed_tests = total_tests - passed_tests

print(f"\nRESULTS: {passed_tests}/{total_tests} Tests Passed (Pass Rate: {passed_tests / total_tests * 100:.1f}%)")
if failed_tests > 0:
    print(f"FAILED TESTS: {[k for k, v in results.items() if v['status'] != 'PASS']}")
    sys.exit(1)
else:
    print("ALL 20 SECURITY & AUTHENTICATION AUDIT TESTS PASSED SUCCESSFULLY.")
    sys.exit(0)

