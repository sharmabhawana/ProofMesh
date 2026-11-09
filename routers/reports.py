"""
ProofMesh — Report Management Router

Handles retrieval, generation, and safe download of analytical reports
for workflows, integrity audits, trust assessments, and impact analyses.
Enforces resource ownership and prevents file path traversal.
"""

from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from auth.models import Report
from auth.db_session import get_db_session
from auth.security import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])

ALLOWED_STORAGE_ROOTS = [
    Path("generated_reports").resolve(),
    Path("trust_reports").resolve(),
    Path("impact_reports").resolve(),
]


@router.get("", response_model=List[dict])
def list_reports(
    current_user: dict = Depends(get_current_user),
):
    """List analytical reports accessible to the user (all reports for admin)."""
    with get_db_session() as session:
        query = session.query(Report)
        if current_user["role"] != "admin":
            query = query.filter(Report.user_id == current_user["id"])
        reports = query.order_by(Report.created_at.desc()).all()
        return [r.to_dict() for r in reports]


@router.get("/{report_id}/download")
def download_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Safely download a report file.
    Enforces user ownership, administrator override, and directory traversal protection.
    """
    with get_db_session() as session:
        rep = session.query(Report).filter(Report.report_id == report_id).first()
        if not rep:
            raise HTTPException(status_code=404, detail="Report not found.")

        # Ownership check
        if rep.user_id != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(
                status_code=403,
                detail="Access denied: You do not own this report.",
            )

        file_path = Path(rep.safe_file_reference).resolve()

        # Path traversal guard: verify file resides within allowed directories
        is_safe = any(
            str(file_path).startswith(str(root)) for root in ALLOWED_STORAGE_ROOTS
        )
        if not is_safe or not file_path.exists() or not file_path.is_file():
            raise HTTPException(
                status_code=404,
                detail="The requested report file is not available or path is invalid.",
            )

        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type="application/json",
        )

