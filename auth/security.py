"""
ProofMesh — Authentication Security Module

Uses stdlib hashlib (PBKDF2-SHA256) for password hashing and PyJWT
for token creation. No external password library required.
"""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from dotenv import load_dotenv

from auth.auth_database import find_user_by_id

load_dotenv()

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "proofmesh-default-secret-key-please-change-in-production-2024xyz"
)

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ============================================================
# PASSWORD HASHING  (PBKDF2-SHA256, stdlib only)
# ============================================================

def hash_password(password: str) -> str:
    """Return a PBKDF2-SHA256 hash of the password."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        260000,
    )
    return f"pbkdf2:sha256:260000${salt}${key.hex()}"


# Password hashing contexts: supports both stdlib PBKDF2-SHA256 and Passlib schemes
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(
        schemes=["pbkdf2_sha256", "argon2", "bcrypt"],
        deprecated="auto"
    )
except Exception:
    pwd_context = None


def verify_password(plain: str, stored: str) -> bool:
    """Verify a plain password against a stored PBKDF2, Argon2, or BCrypt hash."""
    if not stored or not plain:
        return False

    # Check custom stdlib PBKDF2-SHA256 format
    if stored.startswith("pbkdf2:sha256:"):
        try:
            parts = stored.split("$")
            if len(parts) == 3:
                salt = parts[1]
                stored_key = parts[2]
                key = hashlib.pbkdf2_hmac(
                    "sha256",
                    plain.encode("utf-8"),
                    salt.encode("utf-8"),
                    260000,
                )
                if hmac.compare_digest(key.hex(), stored_key):
                    return True
        except Exception:
            pass

    # Fallback to passlib for argon2 / bcrypt / standard formats
    if pwd_context is not None:
        try:
            return pwd_context.verify(plain, stored)
        except Exception:
            pass

    return False


# ============================================================
# JWT TOKEN HANDLING
# ============================================================

def create_access_token(user_id) -> str:
    """Create a signed JWT access token for the given user ID."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


# ============================================================
# FASTAPI DEPENDENCIES
# ============================================================

def get_current_user(token: str = Depends(oauth2_scheme)):
    """FastAPI dependency: resolve JWT → user row."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        user_id = int(payload.get("sub"))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise credentials_error

    user = find_user_by_id(user_id)

    if not user:
        raise credentials_error

    if not user["is_active"]:
        raise HTTPException(
            status_code=403,
            detail="Your account has been disabled.",
        )

    return dict(user)


def require_admin(current_user=Depends(get_current_user)):
    """FastAPI dependency: require admin role."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Administrator access required.",
        )
    return current_user
