"""
ProofMesh — Authentication Security Module

Uses stdlib hashlib (PBKDF2-SHA256) for password hashing and PyJWT
for token creation and validation.
Provides password strength validation, constant-time verification,
sliding-window rate limiting, and server-side token revocation checks.
"""

import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv

from auth.auth_database import find_user_by_id, is_token_revoked, revoke_token

load_dotenv()

# Known insecure/placeholder secrets that must not be used in production
INSECURE_PLACEHOLDER_SECRETS = {
    "proofmesh-default-secret-key-please-change-in-production-2024xyz",
    "your-production-jwt-secret-key-min-32-chars-long",
    "your_jwt_secret_key_here",
    "secret",
    "changeme",
    "default_secret_key",
}


def resolve_jwt_secret() -> str:
    """
    Resolve and validate the JWT signing secret.
    - In production (ENVIRONMENT=production), strictly requires JWT_SECRET_KEY
      to be set, >= 32 characters, and not match known default placeholders.
    - In development/testing, generates an ephemeral strong session key if missing
      or using a placeholder, with an explicit console notice.
    """
    is_production = os.getenv("ENVIRONMENT", "").strip().lower() in ("production", "prod")
    secret = os.getenv("JWT_SECRET_KEY", "").strip()

    if is_production:
        if not secret:
            raise RuntimeError(
                "CRITICAL PRODUCTION SECURITY ERROR: JWT_SECRET_KEY environment variable is missing. "
                "A strong secret key of at least 32 characters must be configured in production."
            )
        if len(secret) < 32:
            raise RuntimeError(
                f"CRITICAL PRODUCTION SECURITY ERROR: JWT_SECRET_KEY is too short ({len(secret)} chars). "
                "Production secret key must be at least 32 characters long."
            )
        if secret in INSECURE_PLACEHOLDER_SECRETS:
            raise RuntimeError(
                "CRITICAL PRODUCTION SECURITY ERROR: JWT_SECRET_KEY is set to a known placeholder or default value. "
                "Generate a cryptographically secure random key (e.g. `openssl rand -hex 32`)."
            )
        return secret

    # Development / Testing environment
    if secret and len(secret) >= 32 and secret not in INSECURE_PLACEHOLDER_SECRETS:
        return secret

    # Ephemeral dev session secret (consistent per running process)
    if not hasattr(resolve_jwt_secret, "_cached_dev_secret"):
        resolve_jwt_secret._cached_dev_secret = secrets.token_hex(32)
        print(
            "[SECURITY NOTICE] Development environment: JWT_SECRET_KEY is missing, short, or using a placeholder. "
            "Generated an ephemeral 256-bit development key for the current process session.",
            flush=True
        )
    return resolve_jwt_secret._cached_dev_secret


JWT_SECRET_KEY = resolve_jwt_secret()
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ============================================================
# PASSWORD COMPLEXITY VALIDATION
# ============================================================

def validate_password_strength(password: str) -> None:
    """
    Validate password complexity:
    - Between 8 and 128 characters
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one number (0-9)
    - At least one special character
    """
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if len(password) > 128:
        raise ValueError("Password cannot exceed 128 characters.")
    if not any(c.isupper() for c in password):
        raise ValueError("Password must contain at least one uppercase letter (A-Z).")
    if not any(c.islower() for c in password):
        raise ValueError("Password must contain at least one lowercase letter (a-z).")
    if not any(c.isdigit() for c in password):
        raise ValueError("Password must contain at least one number (0-9).")
    special_chars = set("!@#$%^&*()_-+=[]{}|;:,.<>?/~`'\"\\")
    if not any(c in special_chars for c in password):
        raise ValueError("Password must contain at least one special character (!@#$%^&* etc.).")


# ============================================================
# PASSWORD HASHING  (PBKDF2-SHA256, 260,000 iterations)
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
        # Perform constant-time dummy computation to mitigate timing side-channel
        hashlib.pbkdf2_hmac("sha256", b"dummy_password", b"dummy_salt_12345", 260000)
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
                return hmac.compare_digest(key.hex(), stored_key)
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
    """Create a signed JWT access token for the given user ID with unique JTI."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "jti": secrets.token_hex(16),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    secret = resolve_jwt_secret()
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


# ============================================================
# RATE LIMITING (SLIDING WINDOW IN-MEMORY)
# ============================================================

class InMemoryRateLimiter:
    """
    In-memory sliding-window rate limiter for sensitive authentication endpoints.
    Tracks request timestamps per client identifier (IP or username).
    """
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        # Bypass rate limiting during automated test executions if requested
        if os.getenv("TESTING", "").strip().lower() in ("true", "1", "yes"):
            return True

        now = time.time()
        cutoff = now - self.window_seconds
        timestamps = [t for t in self._requests[key] if t > cutoff]
        if len(timestamps) >= self.max_requests:
            self._requests[key] = timestamps
            return False

        timestamps.append(now)
        self._requests[key] = timestamps
        return True

    def reset(self):
        """Reset rate limiter buckets."""
        self._requests.clear()


login_rate_limiter = InMemoryRateLimiter(max_requests=10, window_seconds=60)
register_rate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)
forgot_password_rate_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=60)


# ============================================================
# FASTAPI DEPENDENCIES & AUTHORIZATION
# ============================================================

def get_current_user(token: str = Depends(oauth2_scheme)):
    """FastAPI dependency: resolve JWT -> user row with revocation and active checks."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Check server-side token revocation
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    if is_token_revoked(token_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Decode and verify JWT signature and claims
    secret = resolve_jwt_secret()
    try:
        payload = jwt.decode(
            token, secret, algorithms=[JWT_ALGORITHM]
        )
        user_id = int(payload.get("sub"))
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise credentials_error

    user = find_user_by_id(user_id)

    if not user:
        raise credentials_error

    if not user["is_active"]:
        raise HTTPException(
            status_code=403,
            detail="Your account has been disabled. Contact an administrator.",
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
