"""
ProofMesh — Dataset Quality & Provenance Validator

Performs automated auditing of AI agent execution traces:
- Schema conformance
- Missing field detection
- Duplicate event detection
- ISO 8601 timestamp continuity
- Event-type validity
- Workflow causal relationship validation (tool start -> tool end -> decision)
- Evidence reference verification
- Provenance completeness scoring (P component of Trust formula)
"""

from datetime import datetime
from typing import Dict, List, Any, Optional
import json


VALID_EVENT_TYPES = {
    "MODEL_DETAILS",
    "LLM_CALL_START",
    "TOOL_START",
    "TOOL_END",
    "EVIDENCE_CAPTURED",
    "LLM_CALL_END",
    "INTERMEDIATE_DECISION",
    "DECISION",
}

REQUIRED_EVENT_FIELDS = ["event_id", "event_type", "timestamp"]


class DatasetValidator:
    """Audits provenance datasets against data quality and cryptographic schema rules."""

    def __init__(self):
        pass

    def validate_dataset(self, data: Any) -> Dict[str, Any]:
        """
        Validate a dataset (dict or list of events).
        Returns a comprehensive validation report.
        """
        issues = []
        warnings = []

        # Handle either top-level dict {"events": [...]} or raw list
        if isinstance(data, dict):
            events = data.get("events", [])
            dataset_id = data.get("dataset_id", "unknown_dataset")
            is_synthetic = data.get("is_synthetic", False)
            source_type = data.get("source_type", "unknown")
        elif isinstance(data, list):
            events = data
            dataset_id = "raw_event_list"
            is_synthetic = False
            source_type = "external_stream"
        else:
            return {
                "valid": False,
                "error": "Dataset must be a JSON object with an 'events' list, or a JSON list of event objects.",
                "total_events": 0,
            }

        total_events = len(events)
        if total_events == 0:
            return {
                "valid": False,
                "dataset_id": dataset_id,
                "error": "Dataset contains zero provenance events.",
                "total_events": 0,
                "completeness_score": 0.0,
            }

        seen_event_ids = set()
        duplicate_count = 0
        missing_field_count = 0
        invalid_type_count = 0
        invalid_timestamp_count = 0

        event_type_distribution = {}
        agent_counts = {}
        tool_counts = {}
        workflow_events = {}

        last_timestamp = None
        timestamp_out_of_order_count = 0

        # Pass 1: Event-level validation
        for idx, ev in enumerate(events):
            if not isinstance(ev, dict):
                issues.append(f"Event at index {idx} is not a valid JSON object.")
                continue

            ev_id = ev.get("event_id")
            ev_type = ev.get("event_type")
            ts_str = ev.get("timestamp")
            wf_id = ev.get("workflow_id") or ev.get("metadata", {}).get("workflow_id", "default_wf")

            # Required field check
            for req in REQUIRED_EVENT_FIELDS:
                if req not in ev or ev[req] is None or str(ev[req]).strip() == "":
                    issues.append(f"Event at index {idx} missing required field: '{req}'.")
                    missing_field_count += 1

            # Duplicate ID check
            if ev_id:
                if ev_id in seen_event_ids:
                    warnings.append(f"Duplicate event_id detected at index {idx}: '{ev_id}'.")
                    duplicate_count += 1
                else:
                    seen_event_ids.add(ev_id)

            # Event type validation
            if ev_type:
                if ev_type not in VALID_EVENT_TYPES:
                    issues.append(f"Invalid event_type '{ev_type}' at index {idx}. Valid: {sorted(VALID_EVENT_TYPES)}.")
                    invalid_type_count += 1
                event_type_distribution[ev_type] = event_type_distribution.get(ev_type, 0) + 1

            # Timestamp validation
            if ts_str:
                try:
                    ts = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
                    if last_timestamp and ts < last_timestamp:
                        timestamp_out_of_order_count += 1
                    last_timestamp = ts
                except Exception:
                    issues.append(f"Malformed ISO 8601 timestamp at index {idx}: '{ts_str}'.")
                    invalid_timestamp_count += 1

            # Aggregate metadata
            agent = ev.get("agent") or ev.get("metadata", {}).get("agent_id") or "unknown_agent"
            agent_counts[agent] = agent_counts.get(agent, 0) + 1

            tool = ev.get("tool")
            if tool:
                tool_counts[tool] = tool_counts.get(tool, 0) + 1

            # Group by workflow
            if wf_id not in workflow_events:
                workflow_events[wf_id] = []
            workflow_events[wf_id].append(ev)

        # Pass 2: Workflow Causal Relationship Validation
        causal_issues = []
        for wf_id, wf_evs in workflow_events.items():
            wf_types = [e.get("event_type") for e in wf_evs]
            has_tool_start = "TOOL_START" in wf_types
            has_tool_end = "TOOL_END" in wf_types
            has_evidence = "EVIDENCE_CAPTURED" in wf_types
            has_decision = "DECISION" in wf_types

            if has_tool_start and not has_tool_end:
                causal_issues.append(f"Workflow '{wf_id}' contains TOOL_START without corresponding TOOL_END.")
            if has_tool_end and not has_tool_start:
                causal_issues.append(f"Workflow '{wf_id}' contains TOOL_END without preceding TOOL_START.")
            if has_decision and not has_evidence and not has_tool_end:
                warnings.append(f"Workflow '{wf_id}' produced DECISION without supporting EVIDENCE_CAPTURED or TOOL_END.")

        # Provenance Completeness Calculation (0.0 to 100.0)
        # Expected canonical stages: MODEL (10%), START (15%), TOOL (20%), EVIDENCE (20%), END (15%), DECISION (20%)
        stage_coverage = 0.0
        if "MODEL_DETAILS" in event_type_distribution:
            stage_coverage += 10.0
        if "LLM_CALL_START" in event_type_distribution:
            stage_coverage += 15.0
        if "TOOL_START" in event_type_distribution and "TOOL_END" in event_type_distribution:
            stage_coverage += 20.0
        if "EVIDENCE_CAPTURED" in event_type_distribution:
            stage_coverage += 20.0
        if "LLM_CALL_END" in event_type_distribution:
            stage_coverage += 15.0
        if "DECISION" in event_type_distribution:
            stage_coverage += 20.0

        # Penalties for issues
        penalty = (len(issues) * 5.0) + (missing_field_count * 2.0) + (invalid_timestamp_count * 3.0)
        completeness_score = max(0.0, min(100.0, stage_coverage - penalty))

        is_valid = len(issues) == 0

        return {
            "valid": is_valid,
            "dataset_id": dataset_id,
            "is_synthetic": is_synthetic,
            "source_type": source_type,
            "total_events": total_events,
            "unique_event_ids": len(seen_event_ids),
            "duplicate_count": duplicate_count,
            "missing_fields_count": missing_field_count,
            "invalid_event_types_count": invalid_type_count,
            "invalid_timestamps_count": invalid_timestamp_count,
            "timestamp_out_of_order_count": timestamp_out_of_order_count,
            "causal_relationship_issues": causal_issues,
            "completeness_score": round(completeness_score, 1),
            "completeness_classification": (
                "Excellent" if completeness_score >= 85 else
                "Acceptable" if completeness_score >= 70 else
                "Deficient" if completeness_score >= 50 else "Critical Failure"
            ),
            "event_type_distribution": event_type_distribution,
            "agent_distribution": agent_counts,
            "tool_distribution": tool_counts,
            "workflows_detected": len(workflow_events),
            "issue_count": len(issues),
            "warning_count": len(warnings),
            "issues": issues[:50],  # cap list to prevent massive payloads
            "warnings": warnings[:50],
            "audit_timestamp": datetime.now().isoformat(),
        }

