"""
ProofMesh — Authentication Routes

Provides endpoints for:
- User registration with password complexity enforcement and rate limiting
- User and admin login (OAuth2 password flow) with rate limiting
- Server-side logout and token revocation
- Forgot password / password reset (single-use token, email delivery)
- Current user profile retrieval (/me)
- Administrator user management (/admin/users, /admin/users/{id}/status)
"""

import hashlib
import re
from datetime import datetime, timezone, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field

from auth.auth_database import (
    create_user,
    find_user_by_email,
    find_user_by_username,
    find_user_by_username_or_email,
    list_users,
    update_user_status,
    revoke_token,
    create_password_reset_token,
    verify_password_reset_token,
    consume_password_reset_token,
)

from auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
    validate_password_strength,
    login_rate_limiter,
    register_rate_limiter,
    forgot_password_rate_limiter,
    oauth2_scheme,
    resolve_jwt_secret,
    JWT_ALGORITHM,
)

from auth.email_service import send_password_reset_email

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=100)


class UserStatusRequest(BaseModel):
    is_active: bool


def public_user(user):
    """Return a safe dictionary representation of a user without password hashes."""
    user_dict = dict(user)
    return {
        "id": user_dict["id"],
        "username": user_dict["username"],
        "email": user_dict["email"],
        "full_name": user_dict.get("full_name") or user_dict["username"],
        "role": user_dict["role"],
        "is_active": bool(user_dict["is_active"]),
        "created_at": str(user_dict.get("created_at", "")),
    }


def get_client_ip(request: Request) -> str:
    """Extract client IP safely from request headers or socket address."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(data: RegisterRequest, request: Request):
    """
    Register a new user account.
    Enforces password complexity, unique username/email, and rate limiting.
    Always assigns the standard 'user' role.
    """
    client_ip = get_client_ip(request)
    if not register_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please try again later."
        )

    username = data.username.strip()
    email = data.email.strip().lower()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Username cannot be empty."
        )

    # Validate username character restrictions (alphanumeric, dot, underscore, dash)
    if not re.fullmatch(r"[a-zA-Z0-9_.-]{3,50}", username):
        raise HTTPException(
            status_code=400,
            detail="Username must be 3-50 characters long and contain only letters, numbers, underscores, dots, or hyphens."
        )

    if not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+",
        email
    ):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid email address."
        )

    # Check for duplicate email
    if find_user_by_email(email):
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists."
        )

    # Check for duplicate username
    if find_user_by_username(username):
        raise HTTPException(
            status_code=409,
            detail="An account with this username already exists."
        )

    # Validate password complexity
    try:
        validate_password_strength(data.password)
    except ValueError as val_err:
        raise HTTPException(
            status_code=400,
            detail=str(val_err)
        )

    password_hash = hash_password(data.password)

    try:
        user_id = create_user(
            username=username,
            email=email,
            password_hash=password_hash,
            role="user",
            full_name=data.full_name
        )
    except Exception:
        raise HTTPException(
            status_code=409,
            detail="Unable to create account. The email or username may already exist."
        )

    return {
        "message": "Account created successfully.",
        "user_id": user_id,
        "role": "user"
    }


@router.post("/login")
def login_user(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    Authenticate user via OAuth2 password grant.
    Enforces rate limiting, constant-time verification, and checks active account status.
    """
    client_ip = get_client_ip(request)
    if not login_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later."
        )

    identifier = form_data.username.strip()
    user = find_user_by_username_or_email(identifier)

    # Verify password with constant-time computation
    stored_hash = user["password_hash"] if user else ""
    is_valid = verify_password(form_data.password, stored_hash)

    if not user or not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Contact an administrator."
        )

    token = create_access_token(user["id"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": public_user(user)
    }


@router.post("/logout")
def logout_user(
    token: str = Depends(oauth2_scheme),
    current_user: dict = Depends(get_current_user),
):
    """
    Server-side logout: Invalidates current JWT by recording its SHA-256 hash
    in the revoked_tokens database table. Subsequent requests with this token are rejected.
    """
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    secret = resolve_jwt_secret()

    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
        exp_timestamp = payload.get("exp")
        if exp_timestamp:
            expires_at = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        else:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    except Exception:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    revoke_token(token_hash, current_user["id"], expires_at)

    return {
        "message": "Logged out successfully. Session invalidated.",
        "revoked": True
    }


@router.get("/me")
def get_profile(
    current_user=Depends(get_current_user)
):
    """Return the profile of the currently authenticated user."""
    return public_user(current_user)


@router.get("/admin/users")
def admin_get_users(
    admin=Depends(require_admin)
):
    """Administrator-only: list all registered users."""
    users = list_users()
    return {
        "total_users": len(users),
        "users": users
    }


@router.patch("/admin/users/{user_id}/status")
def admin_update_user(
    user_id: int,
    data: UserStatusRequest,
    admin=Depends(require_admin)
):
    """Administrator-only: update user active/disabled status. Prevents self-disabling."""
    if user_id == admin["id"] and not data.is_active:
        raise HTTPException(
            status_code=400,
            detail="You cannot disable your own account."
        )

    if not update_user_status(
        user_id,
        data.is_active
    ):
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    return {
        "message": "User account status updated.",
        "user_id": user_id,
        "is_active": data.is_active
    }


# ---------------------------------------------------------------------------
# Password Reset Flow
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: str = Field(max_length=254)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, request: Request):
    """
    Request a password-reset link.

    Always returns HTTP 200 with a generic message regardless of whether the
    email address is registered. This prevents user-enumeration attacks.
    Rate-limited to 5 requests per 60 seconds per client IP.
    """
    client_ip = get_client_ip(request)
    if not forgot_password_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )

    # Generic response — never reveal whether the email is registered
    generic_response = {
        "message": (
            "If an account with that email exists, "
            "a password reset link has been sent."
        )
    }

    email = data.email.strip().lower()
    user = find_user_by_email(email)
    if user and user.get("is_active"):
        raw_token = create_password_reset_token(user["id"], expires_minutes=15)
        send_password_reset_email(
            to_email=email,
            raw_token=raw_token,
            expires_minutes=15,
        )

    return generic_response


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest):
    """
    Validate a single-use password-reset token and update the user's password.

    The token is consumed (invalidated) on first successful use.
    Returns HTTP 400 for invalid, expired, or already-used tokens.
    """
    user_id = verify_password_reset_token(data.token)
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "This password reset link is invalid or has expired. "
                "Please request a new one."
            ),
        )

    # Validate new password strength before consuming the token
    try:
        validate_password_strength(data.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    new_hash = hash_password(data.new_password)
    success = consume_password_reset_token(data.token, new_hash)

    if not success:
        raise HTTPException(
            status_code=400,
            detail=(
                "This password reset link is invalid or has expired. "
                "Please request a new one."
            ),
        )

    return {
        "message": (
            "Your password has been updated successfully. "
            "You can now sign in with your new password."
        )
    }
