"""
ProofMesh Authentication — Database Migration Utility (SQLite -> PostgreSQL)

Migrates users from SQLite (auth/users.db) to target PostgreSQL (or any SQLAlchemy target)
without data loss. Preserves IDs, usernames, emails, password hashes, roles, and statuses.
"""

import sys
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from auth.models import Base, User
from auth.security import verify_password

SQLITE_DB_PATH = Path(__file__).resolve().parent / "users.db"


def backup_sqlite_database() -> Path:
    """Create a timestamped backup copy of the SQLite database."""
    if not SQLITE_DB_PATH.exists():
        raise FileNotFoundError(f"Source database not found at {SQLITE_DB_PATH}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = SQLITE_DB_PATH.parent / f"users_backup_{timestamp}.db"
    shutil.copy2(SQLITE_DB_PATH, backup_path)
    print(f"[MIGRATION] Created pre-migration backup at: {backup_path}")
    return backup_path


def read_sqlite_users(db_path: Optional[Path] = None) -> list:
    """Read all user records from SQLite database."""
    target_path = db_path or SQLITE_DB_PATH
    conn = sqlite3.connect(target_path)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.execute("SELECT * FROM users ORDER BY id ASC")
        rows = [dict(row) for row in cursor.fetchall()]
        return rows
    finally:
        conn.close()


def check_for_duplicates(records: list) -> Dict[str, list]:
    """Verify that usernames and emails are unique before migration."""
    seen_usernames = set()
    seen_emails = set()
    dup_usernames = []
    dup_emails = []

    for r in records:
        uname = r["username"].strip().lower()
        email = r["email"].strip().lower()

        if uname in seen_usernames:
            dup_usernames.append(uname)
        else:
            seen_usernames.add(uname)

        if email in seen_emails:
            dup_emails.append(email)
        else:
            seen_emails.add(email)

    return {"duplicate_usernames": dup_usernames, "duplicate_emails": dup_emails}


def migrate_sqlite_to_target(target_url: str) -> Dict[str, Any]:
    """
    Migrate SQLite users to a target SQLAlchemy database (e.g. PostgreSQL).
    """
    report = {
        "source_count": 0,
        "target_count": 0,
        "backup_path": None,
        "errors": [],
        "password_verification_tests": [],
        "success": False,
    }

    # 1. Backup SQLite database
    backup_file = backup_sqlite_database()
    report["backup_path"] = str(backup_file)

    # 2. Inspect source records
    source_records = read_sqlite_users()
    report["source_count"] = len(source_records)
    print(f"[MIGRATION] Found {len(source_records)} records in source SQLite database.")

    # 3. Check for duplicates
    duplicates = check_for_duplicates(source_records)
    if duplicates["duplicate_usernames"] or duplicates["duplicate_emails"]:
        err = f"Duplicate records found in source DB: {duplicates}"
        report["errors"].append(err)
        print(f"[ERROR] {err}")
        return report

    # 4. Connect to target database
    print(f"[MIGRATION] Connecting to target database: {target_url.split('@')[-1] if '@' in target_url else target_url}")
    target_engine = create_engine(target_url)

    # 5. Create tables on target
    Base.metadata.create_all(bind=target_engine)
    TargetSession = sessionmaker(bind=target_engine)

    # 6. Migrate records preserving IDs, roles, hashes, status
    with TargetSession() as session:
        for r in source_records:
            existing = session.query(User).filter(User.id == r["id"]).first()
            if not existing:
                new_user = User(
                    id=r["id"],
                    username=r["username"].strip(),
                    email=r["email"].strip().lower(),
                    password_hash=r["password_hash"],
                    role=r.get("role", "user"),
                    is_active=bool(r.get("is_active", 1)),
                    full_name=r.get("full_name") or r["username"],
                )
                session.add(new_user)
        session.commit()

        # If PostgreSQL, reset the primary key sequence
        if target_engine.dialect.name == "postgresql":
            try:
                session.execute(
                    text("SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1)) FROM users")
                )
                session.commit()
                print("[MIGRATION] PostgreSQL sequence 'users_id_seq' updated successfully.")
            except Exception as seq_err:
                print(f"[MIGRATION WARNING] Could not update sequence: {seq_err}")

        # 7. Verify record counts
        target_count = session.query(User).count()
        report["target_count"] = target_count
        print(f"[MIGRATION] Target record count: {target_count} (Source: {len(source_records)})")

        if target_count < len(source_records):
            err = f"Target count ({target_count}) is less than source count ({len(source_records)})."
            report["errors"].append(err)
            return report

        # 8. Verify password hashes remain valid
        admin_user = session.query(User).filter(User.username == "admin").first()
        if admin_user:
            valid = verify_password("AdminPass123!", admin_user.password_hash)
            report["password_verification_tests"].append({
                "username": "admin",
                "test_password": "AdminPass123!",
                "verified": valid,
            })
            print(f"[MIGRATION] Admin password verification check: {'PASS' if valid else 'FAIL'}")

    report["success"] = True
    print("[MIGRATION] Database migration completed successfully.")
    return report


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else None
    if not url:
        from auth.db_session import get_database_url
        url = get_database_url()

    print(f"Starting ProofMesh Database Migration...")
    res = migrate_sqlite_to_target(url)
    print("\nMigration Results:", res)

