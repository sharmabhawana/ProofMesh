"""
ProofMesh — Customer Upload Center Router

Handles ingestion, validation, cryptographic hashing, parsing,
agent data exploration, and graph conversion for externally submitted
AI-agent execution logs and provenance records.
"""

import csv
import hashlib
import io
import json
import os
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from auth.models import Upload, Report
from auth.db_session import get_db_session
from auth.security import get_current_user

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

UPLOAD_STORAGE_DIR = Path("uploads_storage")
UPLOAD_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

REPORTS_DIR = Path("generated_reports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB upload limit
MAX_ZIP_ENTRIES = 1000
ALLOWED_EXTENSIONS = {".json", ".jsonl", ".csv", ".txt", ".zip"}


def calculate_sha256(data: bytes) -> str:
    """Compute standard SHA-256 digest of binary content."""
    return hashlib.sha256(data).hexdigest()


def parse_events_from_content(content_bytes: bytes, filename: str) -> List[dict]:
    """
    Parse events from supported formats (JSON, JSONL, CSV, TXT, ZIP).
    Guards against code execution and path traversal.
    """
    ext = Path(filename).suffix.lower()
    events = []

    if ext == ".json":
        text = content_bytes.decode("utf-8", errors="replace").strip()
        parsed = json.loads(text)
        if isinstance(parsed, list):
            events = parsed
        elif isinstance(parsed, dict):
            # If wrapped in an object like {"events": [...]} or single event
            if "events" in parsed and isinstance(parsed["events"], list):
                events = parsed["events"]
            else:
                events = [parsed]

    elif ext == ".jsonl" or ext == ".txt":
        text = content_bytes.decode("utf-8", errors="replace")
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
                if isinstance(ev, dict):
                    events.append(ev)
            except Exception:
                # If plain text line, convert to a text log event
                events.append({
                    "event_type": "TEXT_LOG",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "output": line,
                })

    elif ext == ".csv":
        text = content_bytes.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            events.append(dict(row))

    elif ext == ".zip":
        with zipfile.ZipFile(io.BytesIO(content_bytes), "r") as zf:
            entries = zf.infolist()
            if len(entries) > MAX_ZIP_ENTRIES:
                raise ValueError("ZIP archive contains too many entries.")
            total_uncompressed = 0
            for zip_info in entries:
                # Reject unsafe names and bound decompression to mitigate ZIP bombs.
                member_path = Path(zip_info.filename)
                if (
                    zip_info.is_dir()
                    or ".." in member_path.parts
                    or member_path.is_absolute()
                    or member_path.drive
                ):
                    continue
                inner_ext = member_path.suffix.lower()
                if inner_ext in {".json", ".jsonl", ".csv", ".txt"}:
                    total_uncompressed += zip_info.file_size
                    if total_uncompressed > MAX_FILE_SIZE_BYTES:
                        raise ValueError("ZIP archive expands beyond the 25 MB processing limit.")
                    with zf.open(zip_info, "r") as member:
                        inner_bytes = member.read(MAX_FILE_SIZE_BYTES + 1)
                    if len(inner_bytes) > MAX_FILE_SIZE_BYTES:
                        raise ValueError("ZIP member exceeds the 25 MB processing limit.")
                    sub_events = parse_events_from_content(inner_bytes, zip_info.filename)
                    events.extend(sub_events)

    return events


def normalize_event(ev: dict, index: int, upload_id: str) -> dict:
    """Normalize extracted event into a standard ProofMesh event structure."""
    event_id = ev.get("event_id") or ev.get("id") or f"{upload_id}_ev_{index + 1}"
    event_type = ev.get("event_type") or ev.get("type") or "AGENT_STEP"
    agent = ev.get("agent") or ev.get("agent_name") or ev.get("agent_id") or "External-Agent"
    model = ev.get("model") or ev.get("model_name") or ev.get("llm") or "Unspecified Model"
    tool = ev.get("tool") or ev.get("tool_name") or ev.get("action")
    timestamp = ev.get("timestamp") or ev.get("time") or datetime.now(timezone.utc).isoformat()
    inp = ev.get("input") or ev.get("input_data") or ev.get("prompt") or ev.get("query")
    out = ev.get("output") or ev.get("output_data") or ev.get("response") or ev.get("result")
    evidence = ev.get("evidence") or ev.get("data_source") or ev.get("source")
    metadata = ev.get("metadata") or {}

    return {
        "event_id": str(event_id),
        "sequence": index + 1,
        "event_type": str(event_type),
        "agent": str(agent),
        "model": str(model),
        "tool": str(tool) if tool else None,
        "timestamp": str(timestamp),
        "input": inp,
        "output": out,
        "evidence": evidence,
        "metadata": metadata if isinstance(metadata, dict) else {},
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_agent_data(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Ingest, validate, and process customer-uploaded AI-agent execution logs.
    Enforces file type and size restrictions, extracts provenance events,
    generates validation summaries, and stores upload records in PostgreSQL.
    """
    filename = Path(file.filename).name  # Safe basename
    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: JSON, JSONL, CSV, TXT, ZIP.",
        )

    # Read in bounded chunks so oversized requests cannot be loaded fully into memory.
    chunks = []
    total_bytes = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
            )
        chunks.append(chunk)
    content = b"".join(chunks)

    # Parse before persisting any user-controlled file.
    try:
        raw_events = parse_events_from_content(content, filename)
        if not isinstance(raw_events, list) or any(not isinstance(ev, dict) for ev in raw_events):
            raise ValueError("The uploaded data must contain JSON objects representing events.")
    except Exception as parse_err:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse uploaded file: {str(parse_err)}",
        )

    upload_id = f"upl_{uuid.uuid4().hex[:12]}"
    user_id = current_user["id"]
    safe_filename = f"{upload_id}_{filename}"
    storage_path = UPLOAD_STORAGE_DIR / safe_filename

    # Calculate SHA-256 snapshot digest and persist only after validation.
    snapshot_hash = calculate_sha256(content)
    with open(storage_path, "wb") as f:
        f.write(content)

    normalized_events = [normalize_event(ev, idx, upload_id) for idx, ev in enumerate(raw_events)]

    # Extract unique entities
    unique_agents = set()
    unique_workflows = set()
    tools_used = set()
    models_detected = set()

    for ev in normalized_events:
        if ev.get("agent"):
            unique_agents.add(ev["agent"])
        if ev.get("model"):
            models_detected.add(ev["model"])
        if ev.get("tool"):
            tools_used.add(ev["tool"])
        wf_ref = ev.get("metadata", {}).get("workflow_id")
        if wf_ref:
            unique_workflows.add(wf_ref)

    if not unique_workflows:
        unique_workflows.add(upload_id)

    # Validation summary
    val_summary = {
        "upload_id": upload_id,
        "filename": filename,
        "snapshot_sha256": snapshot_hash,
        "total_events": len(normalized_events),
        "total_agents": len(unique_agents),
        "total_workflows": len(unique_workflows),
        "agents": list(unique_agents),
        "models": list(models_detected),
        "tools": list(tools_used),
        "status": "VALIDATED" if normalized_events else "NO_EVENTS_DETECTED",
        "ingestion_timestamp": datetime.now(timezone.utc).isoformat(),
        "integrity_category": "Snapshot hashed at ingestion",
    }

    # Save parsed normalized events to storage
    events_filepath = UPLOAD_STORAGE_DIR / f"{upload_id}_events.json"
    with open(events_filepath, "w", encoding="utf-8") as ef:
        json.dump(normalized_events, ef, indent=2)

    # Save validation report
    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    report_filepath = REPORTS_DIR / f"{upload_id}_validation_report.json"
    with open(report_filepath, "w", encoding="utf-8") as rf:
        json.dump(val_summary, rf, indent=2)

    # Persist in PostgreSQL
    with get_db_session() as session:
        upload_record = Upload(
            upload_id=upload_id,
            user_id=user_id,
            original_filename=filename,
            file_type=ext.replace(".", ""),
            storage_reference=str(storage_path.as_posix()),
            processing_status="processed" if normalized_events else "failed",
            total_agents=len(unique_agents),
            total_workflows=len(unique_workflows),
            total_events=len(normalized_events),
            validation_summary=json.dumps(val_summary),
        )
        session.add(upload_record)

        rep_record = Report(
            report_id=report_id,
            user_id=user_id,
            workflow_id=upload_id,
            report_type="upload_validation",
            report_name=f"Ingestion Audit: {filename}",
            safe_file_reference=str(report_filepath.as_posix()),
            created_at=datetime.now(timezone.utc),
        )
        session.add(rep_record)

    return {
        "upload_id": upload_id,
        "filename": filename,
        "file_type": ext.replace(".", ""),
        "total_events": len(normalized_events),
        "total_agents": len(unique_agents),
        "total_workflows": len(unique_workflows),
        "snapshot_sha256": snapshot_hash,
        "report_id": report_id,
        "validation_summary": val_summary,
    }


@router.get("", response_model=List[dict])
def list_user_uploads(
    current_user: dict = Depends(get_current_user),
):
    """List all upload records belonging to the current user (or all if admin)."""
    with get_db_session() as session:
        query = session.query(Upload)
        if current_user["role"] != "admin":
            query = query.filter(Upload.user_id == current_user["id"])
        uploads = query.order_by(Upload.created_at.desc()).all()
        return [u.to_dict() for u in uploads]


@router.get("/{upload_id}")
def get_upload_details(
    upload_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve metadata of a specific upload, enforcing resource ownership."""
    with get_db_session() as session:
        upload = session.query(Upload).filter(Upload.upload_id == upload_id).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found.")

        if upload.user_id != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(
                status_code=403,
                detail="Access denied: You do not have permission to view this upload.",
            )

        return upload.to_dict()


@router.get("/{upload_id}/events")
def get_upload_events(
    upload_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve normalized provenance events for an upload with ownership checks."""
    with get_db_session() as session:
        upload = session.query(Upload).filter(Upload.upload_id == upload_id).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found.")

        if upload.user_id != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Access denied.")

        storage_ref = upload.storage_reference
        filename = upload.original_filename or "upload.json"

    events_filepath = UPLOAD_STORAGE_DIR / f"{upload_id}_events.json"
    if events_filepath.exists():
        with open(events_filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    # Fallback: recover events from raw storage_reference if _events.json is missing
    if storage_ref and Path(storage_ref).exists():
        try:
            with open(storage_ref, "r", encoding="utf-8") as rf:
                raw_data = json.load(rf)
                events = []
                if isinstance(raw_data, dict) and "events" in raw_data:
                    events = raw_data["events"]
                elif isinstance(raw_data, list):
                    events = raw_data

                if events:
                    # Cache normalized events file
                    with open(events_filepath, "w", encoding="utf-8") as ef:
                        json.dump(events, ef, indent=2)
                    return events
        except Exception:
            # Try raw parsing if file wasn't clean JSON
            try:
                with open(storage_ref, "rb") as rf:
                    content = rf.read()
                raw_events = parse_events_from_content(content, filename)
                normalized = [normalize_event(ev, idx, upload_id) for idx, ev in enumerate(raw_events)]
                if normalized:
                    with open(events_filepath, "w", encoding="utf-8") as ef:
                        json.dump(normalized, ef, indent=2)
                    return normalized
            except Exception:
                pass

    return []


@router.get("/{upload_id}/analysis")
def get_upload_analysis(
    upload_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Generate and return analytical metrics for an uploaded agent log."""
    with get_db_session() as session:
        upload = session.query(Upload).filter(Upload.upload_id == upload_id).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found.")

        if upload.user_id != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Access denied.")

        summary = upload.to_dict().get("validation_summary") or {}

    events_filepath = UPLOAD_STORAGE_DIR / f"{upload_id}_events.json"
    events = []
    if events_filepath.exists():
        with open(events_filepath, "r", encoding="utf-8") as f:
            events = json.load(f)

    tool_counts = {}
    event_type_counts = {}
    models = set()

    for ev in events:
        t = ev.get("tool")
        if t:
            tool_counts[t] = tool_counts.get(t, 0) + 1
        et = ev.get("event_type", "UNKNOWN")
        event_type_counts[et] = event_type_counts.get(et, 0) + 1
        m = ev.get("model")
        if m:
            models.add(m)

    # Completeness heuristic: tool events + decisions + model info
    has_model = len(models) > 0
    has_tools = len(tool_counts) > 0
    has_decisions = any("DECISION" in et for et in event_type_counts)
    completeness_score = 0
    if has_model:
        completeness_score += 35
    if has_tools:
        completeness_score += 35
    if has_decisions:
        completeness_score += 30

    return {
        "upload_id": upload_id,
        "total_events": len(events),
        "models_detected": list(models),
        "tool_usage_breakdown": tool_counts,
        "event_type_distribution": event_type_counts,
        "provenance_completeness_score": completeness_score,
        "integrity_status": "Snapshot hashed at ingestion",
        "validation_summary": summary,
    }


@router.get("/{upload_id}/graph")
def get_upload_graph(
    upload_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Format uploaded events into React Flow graph nodes and edges.
    """
    with get_db_session() as session:
        upload = session.query(Upload).filter(Upload.upload_id == upload_id).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found.")

        if upload.user_id != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Access denied.")

        agent_name = upload.original_filename.split(".")[0]

    events_filepath = UPLOAD_STORAGE_DIR / f"{upload_id}_events.json"
    if not events_filepath.exists():
        return {"nodes": [], "edges": []}

    with open(events_filepath, "r", encoding="utf-8") as f:
        events = json.load(f)

    nodes = []
    edges = []
    seen_nodes = set()

    # Create root Agent Node
    agent_id = f"agent_{upload_id}"
    nodes.append({
        "id": agent_id,
        "type": "custom",
        "data": {
            "label": f"Agent: {agent_name}",
            "type": "Agent",
            "model": "Uploaded Log",
            "status": "Active",
        },
        "position": {"x": 250, "y": 50},
    })
    seen_nodes.add(agent_id)

    x_step = 220
    y_step = 160
    current_x = 100
    current_y = 200

    last_step_id = agent_id

    for i, ev in enumerate(events[:15]):  # Up to 15 nodes for clean visual graph
        node_id = f"node_{upload_id}_{i}"
        label = f"{ev.get('event_type')}"
        if ev.get("tool"):
            label += f": {ev.get('tool')}"

        nodes.append({
            "id": node_id,
            "type": "custom",
            "data": {
                "label": label,
                "type": ev.get("event_type", "Step"),
                "timestamp": ev.get("timestamp"),
                "output": str(ev.get("output", ""))[:80],
            },
            "position": {"x": current_x, "y": current_y},
        })

        edges.append({
            "id": f"edge_{last_step_id}_{node_id}",
            "source": last_step_id,
            "target": node_id,
            "label": "TRANSITION",
            "animated": True,
        })

        last_step_id = node_id
        current_x = (current_x + x_step) % 800
        current_y += y_step

    return {"nodes": nodes, "edges": edges}


@router.get("/{upload_id}/integrity")
def verify_upload_integrity(
    upload_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Verify the cryptographic snapshot integrity of an uploaded log file.
    Explains the scope of protection (snapshot hash vs historical chain).
    """
    with get_db_session() as session:
        upload = session.query(Upload).filter(Upload.upload_id == upload_id).first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found.")

        if upload.user_id != current_user["id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Access denied.")

        storage_ref = Path(upload.storage_reference)
        if not storage_ref.exists():
            raise HTTPException(status_code=404, detail="Original storage file missing.")

        with open(storage_ref, "rb") as f:
            current_bytes = f.read()

        current_hash = calculate_sha256(current_bytes)
        summary = upload.to_dict().get("validation_summary") or {}
        stored_hash = summary.get("snapshot_sha256")

        verified = (stored_hash == current_hash) if stored_hash else True

        return {
            "upload_id": upload_id,
            "verified": verified,
            "algorithm": "SHA-256",
            "current_snapshot_hash": current_hash,
            "ingested_snapshot_hash": stored_hash,
            "integrity_category": "Snapshot hashed at ingestion",
            "tampering_detected": not verified,
            "explanation": (
                "Verification confirms that the stored file is byte-for-byte identical to the snapshot "
                "ingested into ProofMesh. Notice: Ingestion hashing protects against modification since upload, "
                "but does not verify the pre-upload historical chain unless external cryptographic signatures were provided."
            ),
        }

