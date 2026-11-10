"""
ProofMesh — Submission Package Builder
Creates a clean, production-ready, verifiable submission archive
strictly excluding credentials, databases, backups, virtualenvs, node_modules, and cache files.
"""

import os
import zipfile
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
ZIP_NAME = "ProofMesh_Final_Submission.zip"
OUTPUT_ZIP = ROOT_DIR / ZIP_NAME

EXCLUDE_DIRS = {
    ".venv",
    "node_modules",
    "dist",
    "__pycache__",
    ".vscode",
    ".git",
    ".idea",
}

EXCLUDE_FILES = {
    ".env",
    "users.db",
    ZIP_NAME,
}

EXCLUDE_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".db",
    ".log",
    ".sqlite",
    ".bak",
}


def build_submission_zip():
    print(f"Building clean submission archive: {OUTPUT_ZIP}...")
    included_count = 0
    total_size = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(ROOT_DIR):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]

            for file in files:
                file_path = Path(root) / file
                rel_path = file_path.relative_to(ROOT_DIR)

                # Security check: never include .env, credential databases, or backups
                file_lower = file.lower()
                if file_lower == ".env" or (file_lower.startswith(".env.") and file_lower != ".env.example"):
                    continue
                if file in EXCLUDE_FILES:
                    continue
                if file_path.suffix.lower() in EXCLUDE_EXTENSIONS:
                    continue
                if any(k in file_lower for k in [".db", ".sqlite", ".bak", "backup"]):
                    continue

                zipf.write(file_path, arcname=str(rel_path.as_posix()))
                included_count += 1
                total_size += file_path.stat().st_size

    zip_size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    print(f"SUCCESS: Created {ZIP_NAME}!")
    print(f"Files included: {included_count}")
    print(f"Uncompressed size: {total_size / (1024 * 1024):.2f} MB")
    print(f"Archive size: {zip_size_mb:.2f} MB")


if __name__ == "__main__":
    build_submission_zip()

