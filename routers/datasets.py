"""
ProofMesh — Datasets Router

Endpoints for:
- Listing generation profiles
- Generating reproducible synthetic provenance datasets
- Validating external/internal datasets against schema and causal rules
- Running empirical scale benchmarks (100, 1k, 10k events)
"""

import json
import os
import uuid
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth.security import get_current_user
from auth.db_session import get_db_session
from auth.models import Upload
from datasets_engine.generator import SyntheticProvenanceGenerator
from datasets_engine.validator import DatasetValidator
from datasets_engine.benchmarks import run_benchmark_scale

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

UPLOAD_DIR = Path("uploads_storage")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class GenerateDatasetRequest(BaseModel):
    profile: str = Field(default="normal_execution")
    target_events: int = Field(default=100, ge=10, le=50000)
    dataset_name: Optional[str] = None
    seed: Optional[int] = Field(default=42)
    save_to_upload_center: bool = Field(default=True)


class ValidateDatasetRequest(BaseModel):
    upload_id: Optional[str] = None
    dataset_payload: Optional[Dict[str, Any]] = None


@router.get("/profiles")
def list_generation_profiles():
    """List all available synthetic dataset generation profiles and their characteristics."""
    descriptions = {
        "normal_execution": "Standard end-to-end AI trace with full model details, tool executions, evidence, and decision.",
        "multi_agent_execution": "Multi-agent orchestration trace involving planner, researcher, auditor, and executor agents.",
        "missing_provenance": "Controlled scenario with missing intermediate evidence records to test completeness detection.",
        "unreliable_source": "Trace generated with low-reliability data sources (unverified public APIs) to evaluate trust penalties.",
        "tool_failure": "Controlled tool exception and connection timeout trace with error propagation.",
        "integrity_tampering": "Isolated synthetic trace where an event payload was altered post-chain calculation to test tamper detection.",
        "conflicting_evidence": "Trace containing contradictory evidence assertions from disparate data sources.",
        "incomplete_execution": "Agent trace abruptly terminated prior to tool completion or final decision.",
        "large_workflow": "High-volume batch execution across multiple coordinated workflows for load testing.",
        "mixed_execution": "Realistic distribution of successful workflows, retried tools, and multi-agent branches.",
    }
    return {
        "profiles": [
            {"id": p, "name": p.replace("_", " ").title(), "description": descriptions.get(p, "")}
            for p in SyntheticProvenanceGenerator.PROFILES
        ]
    }


@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_synthetic_dataset(
    request: GenerateDatasetRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a controlled synthetic dataset.
    Optionally registers the dataset directly into the customer's Upload Center.
    """
    generator = SyntheticProvenanceGenerator(seed=request.seed)
    try:
        data = generator.generate_dataset(
            profile=request.profile,
            target_events=request.target_events,
            dataset_name=request.dataset_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    saved_upload_id = None
    if request.save_to_upload_center:
        upload_id = f"upl_{uuid.uuid4().hex[:12]}"
        safe_filename = f"synthetic_{request.profile}_{upload_id}.json"
        dest_path = UPLOAD_DIR / safe_filename

        with open(dest_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        # Also store normalized events in standard upload events path
        events_filepath = UPLOAD_DIR / f"{upload_id}_events.json"
        with open(events_filepath, "w", encoding="utf-8") as ef:
            json.dump(data.get("events", []), ef, indent=2)

        file_size = dest_path.stat().st_size
        head_hash = data["metadata"]["chain_head"] or "0" * 64

        with get_db_session() as session:
            upload_rec = Upload(
                upload_id=upload_id,
                user_id=current_user["id"],
                original_filename=safe_filename,
                storage_reference=str(dest_path.as_posix()),
                file_type="json",
                total_events=data["total_events"],
                total_agents=len(set(e.get("agent") for e in data["events"] if e.get("agent"))),
                total_workflows=data["metadata"].get("generated_workflows", 1),
                processing_status="processed",
                validation_summary=json.dumps({
                    "is_synthetic": True,
                    "profile": request.profile,
                    "seed": request.seed,
                    "snapshot_sha256": head_hash,
                    "file_size_bytes": file_size,
                    "generated_by": current_user["username"],
                }),
            )
            session.add(upload_rec)

        saved_upload_id = upload_id

    return {
        "dataset_id": data["dataset_id"],
        "dataset_name": data["dataset_name"],
        "profile": data["profile"],
        "total_events": data["total_events"],
        "is_synthetic": True,
        "saved_upload_id": saved_upload_id,
        "chain_head": data["metadata"]["chain_head"],
        "sample_events": data["events"][:5],
    }


@router.post("/validate")
def validate_dataset_endpoint(
    request: ValidateDatasetRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Validate a dataset by upload_id or by direct JSON payload.
    Returns comprehensive schema conformance, causal consistency, and completeness scores.
    """
    validator = DatasetValidator()

    if request.upload_id:
        with get_db_session() as session:
            upload = session.query(Upload).filter(Upload.upload_id == request.upload_id).first()
            if not upload:
                raise HTTPException(status_code=404, detail="Upload dataset not found.")
            if upload.user_id != current_user["id"] and current_user["role"] != "admin":
                raise HTTPException(status_code=403, detail="Access denied to this dataset.")

            file_path = Path(upload.storage_reference)
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="Underlying dataset file missing.")

            with open(file_path, "r", encoding="utf-8") as f:
                payload = json.load(f)

            return validator.validate_dataset(payload)

    elif request.dataset_payload:
        return validator.validate_dataset(request.dataset_payload)

    else:
        raise HTTPException(
            status_code=400,
            detail="Must provide either 'upload_id' or 'dataset_payload' for validation.",
        )


@router.get("/benchmarks")
def get_benchmarks(
    current_user: dict = Depends(get_current_user),
):
    """
    Execute and return empirical performance benchmarks
    across small (100), medium (1,000), and large (10,000) event scales.
    """
    return run_benchmark_scale([100, 1000, 10000])
