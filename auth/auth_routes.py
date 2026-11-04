import re

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field

from auth.auth_database import (
    create_user,
    find_user_by_email,
    find_user_by_username,
    find_user_by_username_or_email,
    list_users,
    update_user_status,
)

from auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
)

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
    user_dict = dict(user)
    return {
        "id": user_dict["id"],
        "username": user_dict["username"],
        "email": user_dict["email"],
        "full_name": user_dict.get("full_name") or user_dict["username"],
        "role": user_dict["role"],
        "is_active": bool(user_dict["is_active"]),
        "created_at": user_dict["created_at"],
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(data: RegisterRequest):
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

    # Password strength check
    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long."
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
    form_data: OAuth2PasswordRequestForm = Depends()
):
    identifier = form_data.username.strip()
    user = find_user_by_username_or_email(identifier)

    if not user or not verify_password(
        form_data.password,
        user["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=403,
            detail="Your account has been disabled. Contact an administrator."
        )

    token = create_access_token(user["id"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": public_user(user)
    }


@router.get("/me")
def get_profile(
    current_user=Depends(get_current_user)
):
    return public_user(current_user)


@router.get("/admin/users")
def admin_get_users(
    admin=Depends(require_admin)
):
    return {
        "total_users": len(list_users()),
        "users": list_users()
    }


@router.patch("/admin/users/{user_id}/status")
def admin_update_user(
    user_id: int,
    data: UserStatusRequest,
    admin=Depends(require_admin)
):
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
