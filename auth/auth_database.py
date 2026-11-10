"""
ProofMesh Authentication — Database Layer

SQLAlchemy ORM database layer supporting PostgreSQL and SQLite.
Preserves existing method signatures and data contracts.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError

from auth.models import Base, User, RevokedToken
from auth.db_session import (
    engine,
    get_db_session,
    check_db_connection,
    get_database_url,
)


def get_connection():
    """Return a raw database connection for compatibility with legacy test helpers."""
    return engine.raw_connection()


def initialize_database() -> None:
    """
    Initialize database schema (creates tables if they do not exist)
    and ensures default administrator credentials exist.
    """
    # Create all tables defined in SQLAlchemy models
    Base.metadata.create_all(bind=engine)

    # Ensure unique index on username exists even on legacy SQLite
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users(username)"))
            conn.commit()
    except Exception:
        pass

    # Ensure default admin account exists
    from auth.security import hash_password

    admin_user = find_user_by_username("admin")
    if not admin_user:
        create_user(
            username="admin",
            email="admin@proofmesh.local",
            password_hash=hash_password("AdminPass123!"),
            role="admin",
            full_name="System Administrator",
        )


def find_user_by_email(email: str) -> Optional[User]:
    """Find a user by email address (case-insensitive)."""
    clean_email = email.strip().lower()
    with get_db_session() as session:
        user = (
            session.query(User)
            .filter(func.lower(User.email) == clean_email)
            .first()
        )
        if user:
            session.expunge(user)
        return user


def find_user_by_username(username: str) -> Optional[User]:
    """Find a user by username (case-insensitive)."""
    clean_username = username.strip().lower()
    with get_db_session() as session:
        user = (
            session.query(User)
            .filter(func.lower(User.username) == clean_username)
            .first()
        )
        if user:
            session.expunge(user)
        return user


def find_user_by_username_or_email(identifier: str) -> Optional[User]:
    """Find a user by either username or email (case-insensitive)."""
    clean = identifier.strip().lower()
    with get_db_session() as session:
        user = (
            session.query(User)
            .filter(
                or_(
                    func.lower(User.username) == clean,
                    func.lower(User.email) == clean,
                )
            )
            .first()
        )
        if user:
            session.expunge(user)
        return user


def find_user_by_id(user_id: int) -> Optional[User]:
    """Find a user by primary key ID."""
    with get_db_session() as session:
        user = session.query(User).filter(User.id == user_id).first()
        if user:
            session.expunge(user)
        return user


def create_user(
    username: str,
    email: str,
    password_hash: str,
    role: str = "user",
    full_name: Optional[str] = None,
) -> int:
    """
    Create a new user in the database.
    Returns the newly created user ID.
    Raises IntegrityError if username or email already exists.
    """
    clean_username = username.strip()
    clean_email = email.strip().lower()
    clean_name = full_name.strip() if full_name else clean_username

    # Guard against duplicate username or email prior to insertion
    if find_user_by_username(clean_username):
        raise IntegrityError("Username already exists", params=(clean_username,), orig=Exception("Unique constraint violation: username"))

    if find_user_by_email(clean_email):
        raise IntegrityError("Email already exists", params=(clean_email,), orig=Exception("Unique constraint violation: email"))

    with get_db_session() as session:
        new_user = User(
            username=clean_username,
            email=clean_email,
            password_hash=password_hash,
            role=role,
            is_active=True,
            full_name=clean_name,
        )
        session.add(new_user)
        session.flush()
        user_id = new_user.id
        return user_id


def list_users() -> List[Dict[str, Any]]:
    """List all users ordered by ID descending."""
    with get_db_session() as session:
        users = session.query(User).order_by(User.id.desc()).all()
        return [user.to_dict() for user in users]


def update_user_status(user_id: int, is_active: bool) -> bool:
    """
    Update a user's is_active status.
    Returns True if user found and updated, False otherwise.
    """
    with get_db_session() as session:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        user.is_active = bool(is_active)
        return True


def revoke_token(token_hash: str, user_id: int, expires_at: datetime) -> bool:
    """
    Record a revoked JWT hash in the revoked_tokens table.
    Returns True on success.
    """
    # Ensure expires_at has timezone info
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    with get_db_session() as session:
        existing = session.query(RevokedToken).filter(RevokedToken.token_hash == token_hash).first()
        if existing:
            return True
        revoked = RevokedToken(
            token_hash=token_hash,
            user_id=user_id,
            expires_at=expires_at,
        )
        session.add(revoked)
        return True


def is_token_revoked(token_hash: str) -> bool:
    """
    Check if a JWT token hash exists in the revoked_tokens table and has not passed its expiration window.
    """
    now = datetime.now(timezone.utc)
    with get_db_session() as session:
        record = (
            session.query(RevokedToken)
            .filter(
                RevokedToken.token_hash == token_hash,
                RevokedToken.expires_at > now
            )
            .first()
        )
        return record is not None


def cleanup_expired_revoked_tokens() -> int:
    """Purge expired revoked tokens from the database. Returns count of deleted records."""
    now = datetime.now(timezone.utc)
    with get_db_session() as session:
        deleted = (
            session.query(RevokedToken)
            .filter(RevokedToken.expires_at <= now)
            .delete(synchronize_session=False)
        )
        return deleted

