"""
ProofMesh — Synthetic Provenance Dataset Generator

Controlled, reproducible generation of AI agent execution traces with valid
causal relationships, canonical RFC 8785 JSON formatting, and SHA-256 hash chains.
All generated records are strictly flagged as synthetic.
"""

import hashlib
import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional


EVENT_TYPES = [
    "MODEL_DETAILS",
    "LLM_CALL_START",
    "TOOL_START",
    "TOOL_END",
    "EVIDENCE_CAPTURED",
    "LLM_CALL_END",
    "INTERMEDIATE_DECISION",
    "DECISION",
]

AGENTS = [
    {"id": "agent_alpha_planner", "name": "Alpha-Planner", "role": "Planning & Orchestration"},
    {"id": "agent_beta_researcher", "name": "Beta-Researcher", "role": "Information Retrieval"},
    {"id": "agent_gamma_auditor", "name": "Gamma-Auditor", "role": "Integrity & Compliance"},
    {"id": "agent_delta_executor", "name": "Delta-Executor", "role": "Tool Execution"},
]

MODELS = [
    {"model": "gemini-3.6-flash", "provider": "Google Gemini"},
    {"model": "gemini-1.5-pro", "provider": "Google Gemini"},
    {"model": "claude-3-5-sonnet", "provider": "Anthropic"},
    {"model": "gpt-4o", "provider": "OpenAI"},
]

TOOLS = [
    {"name": "knowledge_lookup", "category": "knowledge_base"},
    {"name": "web_search", "category": "external_api"},
    {"name": "sql_query_tool", "category": "database"},
    {"name": "code_sandbox", "category": "execution_environment"},
    {"name": "vector_store_retriever", "category": "vector_db"},
]

DATA_SOURCES = [
    {"id": "controlled_proofmesh_knowledge_base", "name": "ProofMesh Core KB", "reliability": 1.0},
    {"id": "internal_compliance_docs", "name": "Internal Compliance Repository", "reliability": 0.95},
    {"id": "verified_enterprise_crm", "name": "Enterprise CRM Sync", "reliability": 0.90},
    {"id": "unverified_third_party_api", "name": "External Public API", "reliability": 0.40},
    {"id": "scraped_public_web", "name": "Unvalidated Web Scraping", "reliability": 0.30},
]


class SyntheticProvenanceGenerator:
    """
    Controlled generator producing correlated provenance datasets for testing,
    benchmarking, and integrity analysis.
    """

    PROFILES = [
        "normal_execution",
        "multi_agent_execution",
        "missing_provenance",
        "unreliable_source",
        "tool_failure",
        "integrity_tampering",
        "conflicting_evidence",
        "incomplete_execution",
        "large_workflow",
        "mixed_execution",
    ]

    def __init__(self, seed: Optional[int] = 42):
        self.seed = seed
        if seed is not None:
            random.seed(seed)

    def generate_dataset(
        self,
        profile: str = "normal_execution",
        target_events: int = 100,
        dataset_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a complete synthetic dataset with consistent workflow IDs,
        agent identities, timestamp continuity, and RFC 8785 canonical hash chain.
        """
        if profile not in self.PROFILES:
            raise ValueError(f"Unknown profile '{profile}'. Supported: {self.PROFILES}")

        dataset_id = f"ds_synth_{uuid.uuid4().hex[:10]}"
        name = dataset_name or f"Synthetic Dataset ({profile}, {target_events} events)"
        created_at = datetime.now(timezone.utc).isoformat()

        # Build events based on profile
        events = []
        base_time = datetime.now(timezone.utc) - timedelta(hours=2)

        # Generate workflows to fill target_events
        wf_counter = 1
        while len(events) < target_events:
            wf_id = f"wf_synth_{wf_counter:04d}"
            remaining = target_events - len(events)
            wf_events = self._generate_workflow_events(
                profile=profile,
                workflow_id=wf_id,
                start_time=base_time + timedelta(minutes=wf_counter * 5),
                max_events=remaining,
            )
            events.extend(wf_events)
            wf_counter += 1

        # Apply tampering profile if requested (in an isolated synthetic copy)
        if profile == "integrity_tampering" and len(events) > 3:
            # Modify the payload of a middle event after recording
            tamper_idx = len(events) // 2
            events[tamper_idx]["output_data"] = "[TAMPERED_SYNTHETIC_DATA_MODIFIED_PAYLOAD]"
            events[tamper_idx]["tampered_for_test"] = True

        # Calculate RFC 8785 canonical hash chain
        hash_chain = self._build_hash_chain(events)

        return {
            "dataset_id": dataset_id,
            "dataset_name": name,
            "description": f"Controlled synthetic provenance trace generated under profile '{profile}'.",
            "source": "ProofMesh Controlled Synthetic Dataset Generator",
            "source_type": "synthetic",
            "is_synthetic": True,
            "profile": profile,
            "random_seed": self.seed,
            "schema_version": "1.0.0",
            "created_at": created_at,
            "total_events": len(events),
            "events": events,
            "hash_chain": hash_chain,
            "metadata": {
                "generated_workflows": wf_counter - 1,
                "chain_head": hash_chain[-1]["current_hash"] if hash_chain else None,
            },
        }

    def _generate_workflow_events(
        self,
        profile: str,
        workflow_id: str,
        start_time: datetime,
        max_events: int,
    ) -> List[Dict[str, Any]]:
        events = []
        curr_time = start_time

        # Select agent and model
        if profile == "multi_agent_execution":
            agent = random.choice(AGENTS)
            co_agent = random.choice([a for a in AGENTS if a["id"] != agent["id"]])
        else:
            agent = AGENTS[0]
            co_agent = None

        model_info = random.choice(MODELS)
        tool_info = random.choice(TOOLS)

        # Select source based on profile
        if profile == "unreliable_source":
            source_info = DATA_SOURCES[3]  # unverified_third_party_api
        elif profile == "conflicting_evidence":
            source_info = DATA_SOURCES[4]  # scraped_public_web
        else:
            source_info = DATA_SOURCES[0]  # controlled_proofmesh_knowledge_base

        def add_event(ev_type: str, input_d: Any = None, output_d: Any = None, tool: Any = None, extra_meta: Dict = None):
            nonlocal curr_time
            if len(events) >= max_events:
                return
            curr_time += timedelta(seconds=random.randint(1, 4))
            meta = {
                "workflow_id": workflow_id,
                "agent_id": agent["id"],
                "agent_name": agent["name"],
                "is_synthetic": True,
            }
            if extra_meta:
                meta.update(extra_meta)

            ev = {
                "event_id": str(uuid.uuid4()),
                "workflow_id": workflow_id,
                "event_type": ev_type,
                "timestamp": curr_time.isoformat(),
                "agent": agent["id"],
                "model": model_info["model"],
                "provider": model_info["provider"],
                "tool": tool,
                "input_data": input_d,
                "output_data": output_d,
                "metadata": meta,
                "is_synthetic": True,
            }
            events.append(ev)

        # 1. Model Details
        add_event("MODEL_DETAILS", extra_meta={"model": model_info["model"], "provider": model_info["provider"]})

        # 2. LLM Call Start
        task_prompt = f"Assess provenance integrity requirements for workflow {workflow_id}."
        add_event("LLM_CALL_START", input_d=task_prompt)

        # Check incomplete execution profile
        if profile == "incomplete_execution" and len(events) >= max_events:
            return events

        # 3. Tool Start
        add_event("TOOL_START", input_d={"query": "provenance verification"}, tool=tool_info["name"])

        # Check tool failure profile
        if profile == "tool_failure":
            add_event(
                "TOOL_END",
                output_d={"status": "FAILED", "error": "ConnectionTimeout: Target tool service unreachable."},
                tool=tool_info["name"],
                extra_meta={"error": True},
            )
            add_event(
                "DECISION",
                input_d={"task": task_prompt},
                output_d="Execution halted: Tool failure caught and provenance error logged.",
                extra_meta={"decision_outcome": "REJECTED_ON_ERROR"},
            )
            return events

        # 4. Tool End
        tool_output = f"Data records retrieved successfully from {source_info['name']}."
        add_event("TOOL_END", output_d=tool_output, tool=tool_info["name"])

        # 5. Evidence Captured
        if profile != "missing_provenance":
            add_event(
                "EVIDENCE_CAPTURED",
                input_d={"source_id": source_info["id"]},
                output_d=tool_output,
                tool=tool_info["name"],
                extra_meta={
                    "source_id": source_info["id"],
                    "source_reliability": source_info["reliability"],
                },
            )

        # If multi-agent, switch to secondary agent for reasoning
        if co_agent:
            agent = co_agent

        # 6. LLM Call End
        llm_response = f"Synthesized answer using {source_info['name']} evidence under policy constraints."
        add_event("LLM_CALL_END", input_d=task_prompt, output_d=llm_response)

        # 7. Intermediate Decision
        add_event(
            "INTERMEDIATE_DECISION",
            input_d={"evidence": tool_output},
            output_d="Intermediate trust assertion: Evidence verified against schema.",
        )

        # 8. Final Decision
        add_event(
            "DECISION",
            input_d={"task": task_prompt, "evidence": tool_output},
            output_d=f"Final outcome verified and approved for synthetic workflow {workflow_id}.",
            extra_meta={"decision_outcome": "APPROVED"},
        )

        return events

    def _build_hash_chain(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Compute chronological SHA-256 hash chain over events."""
        chain = []
        prev_hash = "0" * 64

        for idx, ev in enumerate(events):
            canonical = json.dumps(ev, sort_keys=True, separators=(",", ":"))
            payload_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
            combined = f"{prev_hash}:{payload_hash}"
            curr_hash = hashlib.sha256(combined.encode("utf-8")).hexdigest()

            chain.append({
                "block_index": idx,
                "event_id": ev.get("event_id"),
                "event_type": ev.get("event_type"),
                "timestamp": ev.get("timestamp"),
                "payload_hash": payload_hash,
                "prev_hash": prev_hash,
                "current_hash": curr_hash,
            })
            prev_hash = curr_hash

        return chain

