"""
ProofMesh — SQLAlchemy Relational Models

Defines database schemas for:
- Users (authentication & RBAC)
- Workflows (live AI workflow metadata & execution logs)
- Reports (analytical reports generated and owned by users)
- Uploads (customer-submitted provenance logs & audit artifacts)
"""

from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Float,
    DateTime,
    Text,
    ForeignKey,
    CheckConstraint,
    Index,
)
from sqlalchemy.orm import declarative_base, relationship

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

    # Relationships
    workflows = relationship("Workflow", back_populates="owner", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="owner", cascade="all, delete-orphan")
    uploads = relationship("Upload", back_populates="owner", cascade="all, delete-orphan")

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
        return self.to_dict().get(key, default)

    def keys(self):
        return self.to_dict().keys()

    def values(self):
        return self.to_dict().values()

    def items(self):
        return self.to_dict().items()

    def __repr__(self):
        return f"<User id={self.id} username='{self.username}' role='{self.role}'>"


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    workflow_id = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="pending", index=True)  # pending, running, completed, failed
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    execution_duration = Column(Float, nullable=True)  # in seconds
    error_message = Column(Text, nullable=True)
    results_summary = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", back_populates="workflows")

    __table_args__ = (
        Index("ix_workflows_user_id_created", "user_id", "created_at"),
    )

    def to_dict(self):
        res_summary = None
        if self.results_summary:
            try:
                res_summary = json.loads(self.results_summary)
            except Exception:
                res_summary = self.results_summary

        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "user_id": self.user_id,
            "workflow_name": self.workflow_name,
            "description": self.description or "",
            "status": self.status,
            "started_at": str(self.started_at) if self.started_at else None,
            "completed_at": str(self.completed_at) if self.completed_at else None,
            "execution_duration": round(self.execution_duration, 2) if self.execution_duration else None,
            "error_message": self.error_message,
            "results_summary": res_summary,
            "created_at": str(self.created_at) if self.created_at else "",
        }

    def __getitem__(self, key):
        return self.to_dict()[key]


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    report_id = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_id = Column(String(64), nullable=True, index=True)
    report_type = Column(String(50), nullable=False, index=True)  # provenance, integrity, trust, impact, upload_validation
    report_name = Column(String(150), nullable=False)
    safe_file_reference = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", back_populates="reports")

    def to_dict(self):
        return {
            "id": self.id,
            "report_id": self.report_id,
            "user_id": self.user_id,
            "workflow_id": self.workflow_id,
            "report_type": self.report_type,
            "report_name": self.report_name,
            "safe_file_reference": self.safe_file_reference,
            "created_at": str(self.created_at) if self.created_at else "",
        }

    def __getitem__(self, key):
        return self.to_dict()[key]


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    upload_id = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # json, jsonl, csv, txt, zip
    storage_reference = Column(String(255), nullable=False)
    processing_status = Column(String(30), nullable=False, default="pending", index=True)  # pending, processed, failed
    total_agents = Column(Integer, default=0)
    total_workflows = Column(Integer, default=0)
    total_events = Column(Integer, default=0)
    validation_summary = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", back_populates="uploads")

    def to_dict(self):
        val_summary = None
        if self.validation_summary:
            try:
                val_summary = json.loads(self.validation_summary)
            except Exception:
                val_summary = self.validation_summary

        return {
            "id": self.id,
            "upload_id": self.upload_id,
            "user_id": self.user_id,
            "original_filename": self.original_filename,
            "file_type": self.file_type,
            "storage_reference": self.storage_reference,
            "processing_status": self.processing_status,
            "total_agents": self.total_agents,
            "total_workflows": self.total_workflows,
            "total_events": self.total_events,
            "validation_summary": val_summary,
            "created_at": str(self.created_at) if self.created_at else "",
        }

    def __getitem__(self, key):
        return self.to_dict()[key]


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    revoked_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "token_hash": self.token_hash,
            "user_id": self.user_id,
            "revoked_at": str(self.revoked_at) if self.revoked_at else "",
            "expires_at": str(self.expires_at) if self.expires_at else "",
        }

    def __getitem__(self, key):
        return self.to_dict()[key]


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used_at = Column(DateTime(timezone=True), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "token_hash": self.token_hash,
            "user_id": self.user_id,
            "created_at": str(self.created_at) if self.created_at else "",
            "expires_at": str(self.expires_at) if self.expires_at else "",
            "used_at": str(self.used_at) if self.used_at else None,
        }

    def __getitem__(self, key):
        return self.to_dict()[key]



