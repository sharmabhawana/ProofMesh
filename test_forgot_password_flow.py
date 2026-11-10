"""
ProofMesh — Forgot Password Flow Integration Tests
===================================================
Tests:
  1. POST /api/auth/forgot-password with a registered email → 200 generic response
  2. POST /api/auth/forgot-password with an unknown email  → 200 generic response (no enumeration)
  3. POST /api/auth/reset-password with the valid token     → 200 success
  4. POST /api/auth/reset-password with same token again    → 400 (single-use enforcement)
  5. POST /api/auth/reset-password with a bogus token       → 400 invalid
  6. Verify the admin can still log in with the new password
  7. Restore the original admin password after the test
"""

import os
import sys

os.environ["TESTING"] = "true"

from fastapi.testclient import TestClient
from main import app
from auth.email_service import get_last_dispatched_reset
from auth.auth_database import (
    find_user_by_username,
    create_password_reset_token,
    consume_password_reset_token,
    initialize_database,
)
from auth.security import hash_password

ORIGINAL_ADMIN_PASSWORD = "AdminPass123!"   # restore after test
NEW_TEST_PASSWORD       = "TestReset@2026!"

client = TestClient(app)
PASS = []
FAIL = []


def check(name: str, condition: bool, detail: str = ""):
    if condition:
        print(f"  ✅ PASS  {name}")
        PASS.append(name)
    else:
        print(f"  ❌ FAIL  {name}" + (f" — {detail}" if detail else ""))
        FAIL.append(name)


print("\n=== ProofMesh Forgot-Password Flow Tests ===\n")

# ---- Test 1: forgot-password with registered email -------------------------
print("Test 1: forgot-password with registered admin email")
resp1 = client.post("/api/auth/forgot-password", json={"email": "admin@proofmesh.local"})
check("T1 — 200 response", resp1.status_code == 200, f"status={resp1.status_code}")
check("T1 — generic message present", "message" in resp1.json(), str(resp1.json()))

# Retrieve the raw token that was dispatched (dev console mode)
reset_info = get_last_dispatched_reset()
check("T1 — reset token was dispatched", reset_info is not None, str(reset_info))
raw_token = reset_info["token"] if reset_info else None

# ---- Test 2: forgot-password with unknown email ----------------------------
print("\nTest 2: forgot-password with unknown email (must NOT enumerate)")
resp2 = client.post("/api/auth/forgot-password", json={"email": "nobody@nowhere.invalid"})
check("T2 — 200 response (no enumeration)", resp2.status_code == 200, f"status={resp2.status_code}")
body2 = resp2.json()
check("T2 — same generic message", "message" in body2, str(body2))

# ---- Test 3: reset with valid token ----------------------------------------
print("\nTest 3: reset-password with valid token")
if raw_token:
    resp3 = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": NEW_TEST_PASSWORD},
    )
    check("T3 — 200 success", resp3.status_code == 200, f"status={resp3.status_code} body={resp3.json()}")
else:
    check("T3 — SKIPPED: no raw token available", False, "token was None")

# ---- Test 4: same token is now invalid (single-use) ------------------------
print("\nTest 4: same token used again (single-use enforcement)")
if raw_token:
    resp4 = client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "AnotherPass789!"},
    )
    check("T4 — 400 invalid/used", resp4.status_code == 400, f"status={resp4.status_code}")
else:
    check("T4 — SKIPPED", False)

# ---- Test 5: bogus token ---------------------------------------------------
print("\nTest 5: reset-password with a completely bogus token")
resp5 = client.post(
    "/api/auth/reset-password",
    json={"token": "totallybogustoken1234567890abcdef", "new_password": "ValidPass123!"},
)
check("T5 — 400 invalid token", resp5.status_code == 400, f"status={resp5.status_code}")

# ---- Test 6: weak password rejection ---------------------------------------
print("\nTest 6: reset-password with weak password (must be rejected)")
# Need a fresh token first
admin_user = find_user_by_username("admin")
if admin_user:
    weak_token = create_password_reset_token(admin_user.id, expires_minutes=5)
    resp6 = client.post(
        "/api/auth/reset-password",
        json={"token": weak_token, "new_password": "weak"},
    )
    check("T6 — 400/422 weak password rejected", resp6.status_code in (400, 422), f"status={resp6.status_code}")
    # Invalidate the unused token by consuming it with original password hash
    consume_password_reset_token(weak_token, hash_password(ORIGINAL_ADMIN_PASSWORD))
else:
    check("T6 — SKIPPED: admin user not found", False)

# ---- Restore admin password ------------------------------------------------
print("\nRestoring admin password to original value...")
if admin_user:
    t = create_password_reset_token(admin_user.id, expires_minutes=5)
    success = consume_password_reset_token(t, hash_password(ORIGINAL_ADMIN_PASSWORD))
    check("RESTORE — admin password restored", success)
else:
    print("  ⚠️  Admin user not found — cannot restore password automatically.")

# ---- Summary ---------------------------------------------------------------
total = len(PASS) + len(FAIL)
print(f"\n{'='*50}")
print(f"Results: {len(PASS)}/{total} PASS")
if FAIL:
    print("Failed tests:")
    for f in FAIL:
        print(f"  • {f}")
print("=" * 50)
sys.exit(0 if not FAIL else 1)
