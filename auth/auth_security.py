"""
ProofMesh — Authentication Security Module (Compatibility Layer)

Handles password hashing and JWT token creation/verification.
Uses PyJWT (installed) rather than the deprecated python-jose package.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from dotenv import load_dotenv
from auth.security import (
    hash_password,
    verify_password,
    JWT_SECRET_KEY as SECRET_KEY,
    JWT_ALGORITHM as ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

load_dotenv()

# Compatibility alias for code expecting jose.JWTError
JWTError = jwt.PyJWTError


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT access token.
    Returns the payload dict, or None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
