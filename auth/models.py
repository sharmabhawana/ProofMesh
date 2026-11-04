"""
ProofMesh Authentication — SQLAlchemy Models
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    CheckConstraint,
    Index,
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    username = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(254), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        String(20),
        nullable=False,
        default="user",
        server_default="user"
    )
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1"
    )
    full_name = Column(String(100), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'user')", name="check_user_role"),
        Index("ix_users_username_lower", "username"),
        Index("ix_users_email_lower", "email"),
    )

    def to_dict(self):
        """Serialize User instance to a safe dictionary without password hashes."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "is_active": 1 if self.is_active else 0,
            "full_name": self.full_name or self.username,
            "created_at": str(self.created_at) if self.created_at else "",
        }

    def __getitem__(self, key):
        """Enable dict-like access: user['id'], user['role'], user['password_hash'], etc."""
        if key == "password_hash":
            return self.password_hash
        d = self.to_dict()
        if key in d:
            return d[key]
        raise KeyError(key)

    def get(self, key, default=None):
        """Support dict .get() method."""
        return self.to_dict().get(key, default)

    def keys(self):
        """Enable dict(user) conversion."""
        return self.to_dict().keys()

    def values(self):
        return self.to_dict().values()

    def items(self):
        return self.to_dict().items()

    def __repr__(self):
        return f"<User id={self.id} username='{self.username}' role='{self.role}'>"
