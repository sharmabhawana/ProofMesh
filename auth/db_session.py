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
    """
    Create and configure the SQLAlchemy engine.
    In production (ENVIRONMENT=production), PostgreSQL is strictly required and
    failure to connect raises a RuntimeError instead of falling back to SQLite.
    In development/testing, an automatic fallback to local SQLite is maintained.
    """
    db_url = get_database_url()
    is_production = os.getenv("ENVIRONMENT", "").strip().lower() in ("production", "prod")

    if is_production:
        if not db_url or db_url.startswith("sqlite"):
            raise RuntimeError(
                "CRITICAL PRODUCTION CONFIGURATION ERROR: ProofMesh requires a production "
                "PostgreSQL database (DATABASE_URL) in production mode. Local SQLite fallback is disabled."
            )
        try:
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                pool_recycle=300,
                echo=False,
            )
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return engine
        except Exception as pg_err:
            raise RuntimeError(
                f"CRITICAL PRODUCTION DATABASE ERROR: Failed to connect to PostgreSQL database: {pg_err}. "
                "Silent fallback to SQLite is strictly forbidden in production."
            )

    if db_url.startswith("sqlite"):
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            echo=False,
        )
    else:
        # Development / Testing PostgreSQL with fallback to SQLite
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
                f"[DATABASE NOTICE] PostgreSQL connection not available ({pg_err}). "
                f"Falling back to local SQLite at {DEFAULT_SQLITE_PATH.as_posix()} for local development.",
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

