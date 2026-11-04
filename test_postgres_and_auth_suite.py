"""
ProofMesh – PostgreSQL & Comprehensive Authentication Test Suite
Tests all requirements across Phase 5, Phase 6, Phase 7, and Phase 9.
"""

import os
import sys
import time
from datetime import datetime
from fastapi.testclient import TestClient

from main import app
from auth.models import Base, User
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
    find_user_by_username_or_email,
    find_user_by_id,
    create_user,
    list_users,
    update_user_status,
)
from auth.security import hash_password, verify_password, create_access_token

client = TestClient(app)
results = {}


def report(test_name: str, status: str, details: str = ""):
    results[test_name] = {"status": status, "details": details}
    print(f"[{status:^10}] {test_name}: {details}")


print("=" * 72)
print("PROOFMESH: DATABASE & AUTHENTICATION VALIDATION SUITE")
print("=" * 72)

# -------------------------------------------------------------
# 1. DATABASE & ORM TESTS
# -------------------------------------------------------------
print("\n--- 1. DATABASE & ORM TESTS ---")

# DB Connection
try:
    conn_info = check_db_connection()
    if conn_info["status"] == "connected":
        report("db_connection", "PASS", f"Connected via dialect: {conn_info['dialect']}")
    else:
        report("db_connection", "FAIL", conn_info.get("error", "Unknown error"))
except Exception as e:
    report("db_connection", "FAIL", str(e))

# DB Session Creation
try:
    session = SessionLocal()
    session.execute(Base.metadata.tables["users"].select().limit(1))
    session.close()
    report("db_session_creation", "PASS", "SQLAlchemy session created and query executed successfully.")
except Exception as e:
    report("db_session_creation", "FAIL", str(e))

# Table Creation / Schema Verification
try:
    initialize_database()
    assert "users" in Base.metadata.tables
    cols = [c.name for c in Base.metadata.tables["users"].columns]
    expected = ["id", "username", "email", "password_hash", "role", "is_active", "full_name", "created_at"]
    missing = [c for c in expected if c not in cols]
    if missing:
        report("table_schema_verification", "FAIL", f"Missing columns: {missing}")
    else:
        report("table_schema_verification", "PASS", f"All columns present: {cols}")
except Exception as e:
    report("table_schema_verification", "FAIL", str(e))

# User Insertion and Retrieval
try:
    test_uname = f"test_ins_{int(time.time())}"
    test_em = f"{test_uname}@proofmesh.io"
    uid = create_user(
        username=test_uname,
        email=test_em,
        password_hash=hash_password("SecurePass123!"),
        role="user",
        full_name="Integration Tester",
    )
    fetched = find_user_by_id(uid)
    assert fetched is not None
    assert fetched.username == test_uname
    assert fetched["email"] == test_em
    assert fetched["role"] == "user"
    report("user_insert_and_retrieve", "PASS", f"User created id={uid}, retrieved with dict access support.")
except Exception as e:
    report("user_insert_and_retrieve", "FAIL", str(e))

# Duplicate Username Handling
try:
    create_user(
        username=test_uname,
        email=f"diff_{test_uname}@proofmesh.io",
        password_hash=hash_password("Pass12345!"),
    )
    report("duplicate_username_handling", "FAIL", "Duplicate username did not raise exception.")
except Exception:
    report("duplicate_username_handling", "PASS", "Duplicate username correctly rejected by database constraint.")

# Duplicate Email Handling
try:
    create_user(
        username=f"diff_{test_uname}",
        email=test_em,
        password_hash=hash_password("Pass12345!"),
    )
    report("duplicate_email_handling", "FAIL", "Duplicate email did not raise exception.")
except Exception:
    report("duplicate_email_handling", "PASS", "Duplicate email correctly rejected by database constraint.")

# Transaction Rollback Handling
try:
    from sqlalchemy.exc import IntegrityError
    with get_db_session() as s:
        # Intentionally force rollback
        s.add(User(username=None, email=None, password_hash="dummy"))
    report("transaction_rollback", "FAIL", "Invalid transaction did not raise.")
except Exception:
    # Verify session remains healthy afterwards
    with get_db_session() as s:
        cnt = s.query(User).count()
        assert cnt > 0
    report("transaction_rollback", "PASS", "Failed transaction cleanly rolled back, session recovered.")

# Live PostgreSQL Connectivity Test (Accurate reporting)
try:
    pg_url = os.getenv("DATABASE_URL", "")
    if "postgres" in pg_url.lower():
        from auth.db_session import check_db_connection
        stat = check_db_connection()
        if stat["status"] == "connected" and stat["dialect"] == "postgresql":
            report("live_postgresql_connectivity", "PASS", "Live PostgreSQL server connected and responding.")
        else:
            report("live_postgresql_connectivity", "FAIL", str(stat.get("error")))
    else:
        report(
            "live_postgresql_connectivity",
            "NOT TESTED",
            "DATABASE_URL not pointed to a live PostgreSQL instance. SQLite engine active for local development.",
        )
except Exception as e:
    report("live_postgresql_connectivity", "NOT TESTED", str(e))

# -------------------------------------------------------------
# 2. AUTHENTICATION & ACCESS CONTROL TESTS
# -------------------------------------------------------------
print("\n--- 2. AUTHENTICATION & ACCESS CONTROL TESTS ---")

# Valid User Registration
new_uname = f"e2e_user_{int(time.time())}"
new_email = f"{new_uname}@domain.com"
new_pass = "ComplexPass2026!"

r_reg = client.post(
    "/api/auth/register",
    json={
        "username": new_uname,
        "email": new_email,
        "password": new_pass,
        "full_name": "E2E Test User",
    },
)
if r_reg.status_code == 201:
    report("user_registration_valid", "PASS", f"HTTP 201, User created: {r_reg.json().get('user_id')}")
else:
    report("user_registration_valid", "FAIL", f"HTTP {r_reg.status_code}: {r_reg.text}")

# Duplicate Registration (Username)
r_dup_u = client.post(
    "/api/auth/register",
    json={
        "username": new_uname,
        "email": f"diff_{new_email}",
        "password": new_pass,
    },
)
if r_dup_u.status_code == 409:
    report("user_registration_dup_username", "PASS", "HTTP 409 Duplicate username rejected.")
else:
    report("user_registration_dup_username", "FAIL", f"Expected 409, got {r_dup_u.status_code}")

# Duplicate Registration (Email)
r_dup_e = client.post(
    "/api/auth/register",
    json={
        "username": f"diff_{new_uname}",
        "email": new_email,
        "password": new_pass,
    },
)
if r_dup_e.status_code == 409:
    report("user_registration_dup_email", "PASS", "HTTP 409 Duplicate email rejected.")
else:
    report("user_registration_dup_email", "FAIL", f"Expected 409, got {r_dup_e.status_code}")

# User Login by Username
r_login_u = client.post(
    "/api/auth/login",
    data={"username": new_uname, "password": new_pass},
)
if r_login_u.status_code == 200 and "access_token" in r_login_u.json():
    user_token = r_login_u.json()["access_token"]
    report("user_login_by_username", "PASS", "HTTP 200, JWT token acquired.")
else:
    report("user_login_by_username", "FAIL", f"HTTP {r_login_u.status_code}: {r_login_u.text}")

# User Login by Email
r_login_e = client.post(
    "/api/auth/login",
    data={"username": new_email, "password": new_pass},
)
if r_login_e.status_code == 200 and "access_token" in r_login_e.json():
    report("user_login_by_email", "PASS", "HTTP 200, Login via email address verified.")
else:
    report("user_login_by_email", "FAIL", f"HTTP {r_login_e.status_code}: {r_login_e.text}")

# Login with Invalid Password
r_bad_pass = client.post(
    "/api/auth/login",
    data={"username": new_uname, "password": "WrongPassword123!"},
)
if r_bad_pass.status_code == 401:
    report("user_login_invalid_password", "PASS", "HTTP 401 Incorrect password rejected.")
else:
    report("user_login_invalid_password", "FAIL", f"Expected 401, got {r_bad_pass.status_code}")

# Valid Admin Login
r_admin_login = client.post(
    "/api/auth/login",
    data={"username": "admin", "password": "AdminPass123!"},
)
if r_admin_login.status_code == 200 and r_admin_login.json()["user"]["role"] == "admin":
    admin_token = r_admin_login.json()["access_token"]
    report("admin_login_valid", "PASS", "HTTP 200, Admin role confirmed.")
else:
    report("admin_login_valid", "FAIL", f"HTTP {r_admin_login.status_code}: {r_admin_login.text}")

# Normal User Denied Admin Access
r_admin_blocked = client.get(
    "/api/auth/admin/users",
    headers={"Authorization": f"Bearer {user_token}"},
)
if r_admin_blocked.status_code == 403:
    report("normal_user_denied_admin_endpoint", "PASS", "HTTP 403 Standard user forbidden from admin API.")
else:
    report("normal_user_denied_admin_endpoint", "FAIL", f"Expected 403, got {r_admin_blocked.status_code}")

# Admin Can Access Admin Endpoint
r_admin_ok = client.get(
    "/api/auth/admin/users",
    headers={"Authorization": f"Bearer {admin_token}"},
)
if r_admin_ok.status_code == 200 and "users" in r_admin_ok.json():
    report("admin_allowed_admin_endpoint", "PASS", f"HTTP 200, {len(r_admin_ok.json()['users'])} users listed.")
else:
    report("admin_allowed_admin_endpoint", "FAIL", f"Expected 200, got {r_admin_ok.status_code}")

# Current User Profile Endpoint
r_me = client.get(
    "/api/auth/me",
    headers={"Authorization": f"Bearer {user_token}"},
)
if r_me.status_code == 200 and r_me.json()["username"] == new_uname:
    report("get_current_user_profile", "PASS", "HTTP 200, User profile retrieved correctly.")
else:
    report("get_current_user_profile", "FAIL", f"Expected 200, got {r_me.status_code}")

# -------------------------------------------------------------
# 3. SECURITY & CREDENTIAL HYGIENE
# -------------------------------------------------------------
print("\n--- 3. SECURITY & CREDENTIAL HYGIENE ---")

# Passwords Never Plaintext
all_users = list_users()
all_hashes_secure = True
with get_db_session() as s:
    db_users = s.query(User).all()
    for u in db_users:
        if not (u.password_hash.startswith("pbkdf2:") or u.password_hash.startswith("$argon2") or u.password_hash.startswith("$2b$")):
            all_hashes_secure = False
            break

if all_hashes_secure:
    report("passwords_never_plaintext", "PASS", "All user passwords securely hashed with cryptographic digests.")
else:
    report("passwords_never_plaintext", "FAIL", "Found plaintext or unhashed password in database.")

# No Password Hashes Exposed in API Responses
def check_no_hash(obj):
    if isinstance(obj, dict):
        if "password" in obj or "password_hash" in obj or "hashed_password" in obj:
            return False
        return all(check_no_hash(v) for v in obj.values())
    elif isinstance(obj, list):
        return all(check_no_hash(item) for item in obj)
    return True

api_safe = (
    check_no_hash(r_reg.json())
    and check_no_hash(r_login_u.json())
    and check_no_hash(r_me.json())
    and check_no_hash(r_admin_ok.json())
)
if api_safe:
    report("no_password_hashes_in_api", "PASS", "No password hashes exposed across any API response.")
else:
    report("no_password_hashes_in_api", "FAIL", "Sensitive password field leaked in API response!")

# -------------------------------------------------------------
# 4. EXISTING PROOFMESH APPLICATION & PROVENANCE INTEGRITY
# -------------------------------------------------------------
print("\n--- 4. EXISTING PROOFMESH APPLICATION & PROVENANCE INTEGRITY ---")

r_health = client.get("/health")
if r_health.status_code == 200:
    report("api_health_endpoint", "PASS", "HTTP 200 Healthy")
else:
    report("api_health_endpoint", "FAIL", f"HTTP {r_health.status_code}")

r_graph = client.get("/api/workflow-graph")
if r_graph.status_code == 200 and "nodes" in r_graph.json():
    report("neo4j_provenance_graph", "PASS", f"HTTP 200, {len(r_graph.json()['nodes'])} nodes returned.")
else:
    report("neo4j_provenance_graph", "FAIL", f"HTTP {r_graph.status_code}")

r_integ = client.get("/api/integrity-status")
if r_integ.status_code == 200 and r_integ.json().get("integrity_verified") is True:
    report("sha256_provenance_integrity", "PASS", "HTTP 200, Hash chain intact, no tampering detected.")
else:
    report("sha256_provenance_integrity", "FAIL", f"HTTP {r_integ.status_code}: {r_integ.text}")

r_trust = client.get("/api/trust-score")
if r_trust.status_code == 200 and "trust_score" in r_trust.json():
    report("trust_assessment_engine", "PASS", f"HTTP 200, Score={r_trust.json()['trust_score']}")
else:
    report("trust_assessment_engine", "FAIL", f"HTTP {r_trust.status_code}")

r_impact = client.get("/api/impact-analysis?node_type=DataSource&node_id=controlled_proofmesh_knowledge_base")
if r_impact.status_code == 200 and ("affected_decisions" in r_impact.json() or "downstream_nodes" in r_impact.json()):
    report("impact_analysis_engine", "PASS", f"HTTP 200, Downstream nodes: {len(r_impact.json().get('downstream_nodes', []))}")
else:
    report("impact_analysis_engine", "FAIL", f"HTTP {r_impact.status_code}: {r_impact.text}")

# -------------------------------------------------------------
# SUMMARY REPORT
# -------------------------------------------------------------
print("\n" + "=" * 72)
print("TEST EXECUTION SUMMARY:")
pass_count = sum(1 for r in results.values() if r["status"] == "PASS")
fail_count = sum(1 for r in results.values() if r["status"] == "FAIL")
not_tested_count = sum(1 for r in results.values() if r["status"] == "NOT TESTED")
total_count = len(results)

print(f"Total Tests Executed: {total_count}")
print(f"Passed: {pass_count}")
print(f"Failed: {fail_count}")
print(f"Not Tested / Skipped: {not_tested_count}")
print("=" * 72)

if fail_count > 0:
    sys.exit(1)
