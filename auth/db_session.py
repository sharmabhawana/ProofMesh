"""
ProofMesh Authentication — Database Connection and Session Management

Provides SQLAlchemy engine, sessionmaker, and session lifecycle
management for both PostgreSQL (primary) and SQLite (fallback).
"""

import os
from contextlib import contextmanager
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv()

DEFAULT_SQLITE_PATH = Path(__file__).resolve().parent / "users.db"


def get_database_url() -> str:
    """
    Resolve the database connection URL from environment or fallback to SQLite.
    Normalizes PostgreSQL URLs (e.g. postgres:// -> postgresql+psycopg2://).
    """
    url = os.getenv("DATABASE_URL", "").strip()

    if not url:
        return f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"

    # Normalize Heroku/Supabase/legacy postgres:// syntax
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

    return url


def create_db_engine():
    """Create and configure the SQLAlchemy engine with automatic SQLite fallback."""
    db_url = get_database_url()

    if db_url.startswith("sqlite"):
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            echo=False,
        )
    else:
        # PostgreSQL with connection pooling and health pre-ping
        try:
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                pool_recycle=300,
                echo=False,
            )
            # Verify live connectivity
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except Exception as pg_err:
            print(
                f"[DATABASE NOTICE] PostgreSQL connection not available. "
                f"Falling back to local SQLite at {DEFAULT_SQLITE_PATH.as_posix()}",
                flush=True,
            )
            sqlite_url = f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"
            engine = create_engine(
                sqlite_url,
                connect_args={"check_same_thread": False},
                echo=False,
            )

    return engine


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def get_db_session():
    """
    Context manager for database sessions.
    Handles commit on success and rollback on exceptions.
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db():
    """FastAPI dependency for yielding database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> dict:
    """
    Test the database connection and return dialect and connectivity status.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            return {
                "status": "connected",
                "dialect": engine.dialect.name,
                "url_type": "postgresql" if engine.dialect.name == "postgresql" else "sqlite",
            }
    except Exception as e:
        return {
            "status": "disconnected",
            "error": str(e),
            "dialect": engine.dialect.name,
            "url_type": "postgresql" if engine.dialect.name == "postgresql" else "sqlite",
        }

