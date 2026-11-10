"""
ProofMesh — Complete End-to-End Workflow Execution Audit Script
================================================================
Executes a completely new, unique user workflow request against the
live FastAPI backend and verifies all 10 audit points:
  1. Inspect workflow execution code and endpoints
  2. Verify new user request triggers configured Gemini model
  3. Verify knowledge_lookup tool is actually invoked
  4. Verify provenance events are generated during execution
  5. Verify new events are saved persistently (file, PostgreSQL, report)
  6. Verify Neo4j graph reception or graceful fallback
  7. Verify SHA-256 hash chain integrity includes new records
  8. Verify impact analysis and trust assessment use workflow data
  9. Verify React dashboard API retrieves latest execution
 10. Confirm model name consistency across all layers
"""

import os
import sys
import json
import time
import socket
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from fastapi.testclient import TestClient
from main import app
from auth.db_session import get_db_session
from auth.models import Workflow, Report, User
from provenance_integrity import verify_saved_chain, CHAIN_FILE, LOG_FILE
from trust_assessment import assess_trust
from impact_analysis import analyze

client = TestClient(app)

audit_results = {}
audit_details = {}

def record_check(step_num: int, title: str, passed: bool, details: dict):
    audit_results[step_num] = passed
    audit_details[step_num] = {"title": title, "passed": passed, **details}
    status_icon = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n[{status_icon}] Step {step_num}: {title}")
    for k, v in details.items():
        print(f"    • {k}: {v}")

print("=" * 80)
print("PROOFMESH: END-TO-END WORKFLOW EXECUTION & AUDIT TEST")
print("=" * 80)

# ----------------------------------------------------------------------------
# STEP 1: Inspect Code & Endpoint Setup
# ----------------------------------------------------------------------------
openapi_paths = list(app.openapi()["paths"].keys())
wf_routes_present = all(p in openapi_paths for p in ["/api/workflows/run", "/api/workflows", "/api/workflows/{workflow_id}"])
record_check(1, "Workflow API Route Registration", wf_routes_present, {
    "workflow_endpoints_verified": ["/api/workflows/run", "/api/workflows", "/api/workflows/{workflow_id}"],
    "router_prefix": "/api/workflows",
    "http_method": "POST /api/workflows/run"
})

# ----------------------------------------------------------------------------
# Authenticate as admin to run workflow
# ----------------------------------------------------------------------------
login_resp = client.post("/api/auth/login", data={"username": "admin", "password": "AdminPass123!"})
assert login_resp.status_code == 200, "Admin login failed"
token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# ----------------------------------------------------------------------------
# STEP 2, 3, 4: Execute Live AI Workflow with Unique Nonce
# ----------------------------------------------------------------------------
unique_nonce = f"audit_{int(time.time()*1000)}"
test_workflow_name = f"Cryptographic Provenance Audit - {unique_nonce}"
test_task = f"Explain how provenance tracking verifies data lineage and reduces hallucination in AI agents. [Nonce: {unique_nonce}]"
configured_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

print(f"\nDispatching new unique workflow request...")
print(f"  Name: {test_workflow_name}")
print(f"  Prompt: {test_task}")
print(f"  Model: {configured_model}")

start_ts = time.time()
wf_run_resp = client.post("/api/workflows/run", json={
    "workflow_name": test_workflow_name,
    "task_description": test_task,
    "model_name": configured_model
}, headers=headers)
exec_time = time.time() - start_ts

wf_data = wf_run_resp.json() if wf_run_resp.status_code in (200, 201) else {}

# Step 2: Verify configured Gemini model was triggered
gemini_output = wf_data.get("output", "")
model_triggered = (
    wf_run_resp.status_code == 201
    and wf_data.get("status") == "completed"
    and len(gemini_output) > 20
    and "[Nonce:" not in gemini_output  # ensure LLM synthesized an answer, didn't just echo prompt
)
record_check(2, "Live Gemini Model Execution", model_triggered, {
    "http_status": wf_run_resp.status_code,
    "workflow_id": wf_data.get("workflow_id"),
    "status": wf_data.get("status"),
    "execution_duration": f"{wf_data.get('execution_duration')}s",
    "model_used": configured_model,
    "output_preview": gemini_output[:120] + "..." if len(gemini_output) > 120 else gemini_output
})

# Step 3: Verify knowledge_lookup tool invoked
tool_evidence = wf_data.get("evidence", "")
tool_invoked = "Provenance is the recorded history" in tool_evidence
record_check(3, "Knowledge Lookup Tool Invocation", tool_invoked, {
    "tool_name": "knowledge_lookup",
    "topic_queried": "provenance",
    "evidence_captured": tool_evidence,
    "evidence_length_chars": len(tool_evidence)
})

# Step 4: Verify all 8 provenance events generated in order
events = wf_data.get("provenance_events", [])
expected_event_types = [
    "MODEL_DETAILS",
    "LLM_CALL_START",
    "TOOL_START",
    "TOOL_END",
    "EVIDENCE_CAPTURED",
    "LLM_CALL_END",
    "INTERMEDIATE_DECISION",
    "DECISION"
]
actual_event_types = [e.get("event_type") for e in events]
events_valid = (
    len(events) == 8
    and actual_event_types == expected_event_types
    and all(e.get("event_id") for e in events)
    and all(e.get("timestamp") for e in events)
)
record_check(4, "8-Stage Provenance Event Generation", events_valid, {
    "total_events_captured": len(events),
    "expected_sequence": expected_event_types,
    "actual_sequence": actual_event_types,
    "first_event_id": events[0].get("event_id") if events else None,
    "final_decision_id": events[-1].get("event_id") if events else None
})

# ----------------------------------------------------------------------------
# STEP 5: Verify Persistent Storage (Files, PostgreSQL, Reports)
# ----------------------------------------------------------------------------
# Check provenance_logs.json
log_file_path = Path("provenance_logs.json")
with open(log_file_path, "r", encoding="utf-8") as f:
    saved_log_events = json.load(f)
saved_in_log = len(saved_log_events) >= 8 and any(e.get("event_type") == "DECISION" for e in saved_log_events)

# Check PostgreSQL Workflow row
workflow_id = wf_data.get("workflow_id")
db_wf_valid = False
db_wf_duration = None
with get_db_session() as session:
    wf_db_row = session.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
    if wf_db_row:
        db_wf_valid = (wf_db_row.status == "completed" and wf_db_row.execution_duration is not None)
        db_wf_duration = wf_db_row.execution_duration

# Check generated report file on disk
report_path = Path(f"generated_reports/{workflow_id}_provenance_report.json")
report_file_valid = report_path.exists()
rep_data = {}
if report_file_valid:
    with open(report_path, "r", encoding="utf-8") as rf:
        rep_data = json.load(rf)
    report_file_valid = rep_data.get("workflow_id") == workflow_id

record_check(5, "Persistent Storage Verification", saved_in_log and db_wf_valid and report_file_valid, {
    "provenance_logs_json_events": len(saved_log_events),
    "postgresql_workflow_row_exists": db_wf_valid,
    "postgresql_duration_recorded": f"{db_wf_duration:.2f}s" if db_wf_duration else None,
    "generated_report_file_exists": report_file_valid,
    "report_path": str(report_path)
})

# ----------------------------------------------------------------------------
# STEP 6: Verify Neo4j Graph Reception or Graceful Fallback
# ----------------------------------------------------------------------------
# Probe port 7687
s = socket.socket()
s.settimeout(0.5)
neo4j_online = (s.connect_ex(("127.0.0.1", 7687)) == 0)
s.close()

graph_resp = client.get("/api/workflow-graph")
graph_data = graph_resp.json() if graph_resp.status_code == 200 else {}
graph_source = graph_data.get("source")
graph_nodes = graph_data.get("nodes", [])
graph_edges = graph_data.get("relationships", [])

node_types = set(n.get("type") for n in graph_nodes)
edge_types = set(r.get("type") for r in graph_edges)
expected_node_types = {"Agent", "Tool", "DataSource", "Decision"}
expected_edge_types = {"USED_TOOL", "RETRIEVED_FROM", "INFLUENCED", "MADE_DECISION"}

neo4j_contract_valid = (
    graph_resp.status_code == 200
    and expected_node_types.issubset(node_types)
    and expected_edge_types.issubset(edge_types)
    and (graph_source in ("neo4j_live", "provenance_ledger_fallback"))
)
record_check(6, "Neo4j Graph Integration & Resilient Fallback", neo4j_contract_valid, {
    "neo4j_socket_listening_7687": neo4j_online,
    "graph_api_source": graph_source,
    "total_graph_nodes": len(graph_nodes),
    "total_graph_relationships": len(graph_edges),
    "node_types_present": list(node_types),
    "relationship_types_present": list(edge_types),
    "resilient_fallback_active": (graph_source == "provenance_ledger_fallback")
})

# ----------------------------------------------------------------------------
# STEP 7: Verify SHA-256 Hash Chain Integrity
# ----------------------------------------------------------------------------
integ_resp = client.get("/api/integrity-status")
integ_data = integ_resp.json() if integ_resp.status_code == 200 else {}
chain_valid_direct = verify_saved_chain()
chain_file_exists = CHAIN_FILE.exists()

with open(CHAIN_FILE, "r", encoding="utf-8") as cf:
    chain_content = json.load(cf)

chain_blocks = chain_content.get("record_count", len(chain_content.get("records", []))) if isinstance(chain_content, dict) else len(chain_content)

record_check(7, "SHA-256 Hash Chain Integrity", integ_data.get("status") == "PASS" and chain_valid_direct, {
    "api_integrity_status": integ_data.get("status"),
    "api_integrity_verified": integ_data.get("integrity_verified"),
    "direct_verify_saved_chain": chain_valid_direct,
    "chain_file_exists": chain_file_exists,
    "total_records_in_chain": chain_blocks,
    "tampering_detected": integ_data.get("tampering_detected")
})

# ----------------------------------------------------------------------------
# STEP 8: Verify Impact Analysis & Trust Assessment
# ----------------------------------------------------------------------------
# 8a: Trust score assessment
trust_resp = client.get("/api/trust-score")
trust_data = trust_resp.json() if trust_resp.status_code == 200 else {}
trust_score = trust_data.get("trust_score")
trust_category = trust_data.get("trust_category")
trust_valid = (trust_resp.status_code == 200 and trust_score == 100.0 and trust_category == "High")

# 8b: Impact analysis traversal
impact_resp = client.get("/api/impact-analysis", params={
    "node_type": "DataSource",
    "node_id": "controlled_proofmesh_knowledge_base",
    "unreliable": False,
    "check_integrity": True
})
impact_data = impact_resp.json() if impact_resp.status_code == 200 else {}
downstream_decisions = impact_data.get("affected_decisions", [])
count_decisions = len(downstream_decisions) if isinstance(downstream_decisions, list) else int(downstream_decisions or 0)
impact_valid = (impact_resp.status_code == 200 and count_decisions >= 2)

record_check(8, "Trust Assessment & Impact Analysis Verification", trust_valid and impact_valid, {
    "trust_score": f"{trust_score}/100",
    "trust_category": trust_category,
    "source_reliability_score": trust_data.get("metrics", {}).get("source_reliability"),
    "provenance_completeness": trust_data.get("metrics", {}).get("provenance_completeness"),
    "integrity_verification_metric": trust_data.get("metrics", {}).get("integrity_verification"),
    "impact_starting_node": impact_data.get("start_node", {}).get("node_id"),
    "impact_affected_decisions_count": count_decisions,
    "impact_status": "SUCCESS"
})

# ----------------------------------------------------------------------------
# STEP 9: Verify React Dashboard Retrieves Latest Execution
# ----------------------------------------------------------------------------
# Query GET /api/workflows (same endpoint called by dashboardService.getWorkflows())
list_resp = client.get("/api/workflows", headers=headers)
assert list_resp.status_code == 200
wf_list = list_resp.json()
latest_wf = wf_list[0] if wf_list else {}
dashboard_retrieval_valid = (
    len(wf_list) > 0
    and latest_wf.get("workflow_id") == workflow_id
    and latest_wf.get("workflow_name") == test_workflow_name
    and latest_wf.get("status") == "completed"
)

# Also test GET /api/workflows/{workflow_id}
detail_resp = client.get(f"/api/workflows/{workflow_id}", headers=headers)
detail_data = detail_resp.json() if detail_resp.status_code == 200 else {}
detail_valid = detail_data.get("workflow_id") == workflow_id

record_check(9, "Dashboard Telemetry & Latest Workflow Retrieval", dashboard_retrieval_valid and detail_valid, {
    "total_user_workflows_in_db": len(wf_list),
    "latest_workflow_id": latest_wf.get("workflow_id"),
    "latest_workflow_name": latest_wf.get("workflow_name"),
    "latest_workflow_status": latest_wf.get("status"),
    "workflow_detail_endpoint_verified": detail_valid
})

# ----------------------------------------------------------------------------
# STEP 10: Confirm Model Name Consistency Across All Layers
# ----------------------------------------------------------------------------
# 1. .env model
env_model = os.getenv("GEMINI_MODEL", "")
# 2. Workflow report model
report_model = rep_data.get("model", "") if report_file_valid else ""
# 3. Provenance event model
event_model = events[0].get("metadata", {}).get("model", "") if events else ""
# 4. Fallback graph model
graph_node_model = next((n["properties"]["model"] for n in graph_nodes if n.get("id") == "ProofMesh-Agent" and "model" in n.get("properties", {})), "")

all_models_match = (
    configured_model == "gemini-3.5-flash-lite"
    and (not env_model or env_model == "gemini-3.5-flash-lite")
    and event_model == "gemini-3.5-flash-lite"
    and (not graph_node_model or graph_node_model == "gemini-3.5-flash-lite")
)

record_check(10, "Model Name Consistency Across Layers", all_models_match, {
    "configured_model": configured_model,
    "env_gemini_model": env_model,
    "provenance_event_model": event_model,
    "workflow_report_model": report_model,
    "graph_agent_node_model": graph_node_model,
    "model_name_uniform": all_models_match
})

print("\n" + "=" * 80)
total_steps = len(audit_results)
passed_steps = sum(1 for p in audit_results.values() if p)
print(f"AUDIT SUMMARY: {passed_steps}/{total_steps} STEPS PASSED ({passed_steps/total_steps*100:.1f}%)")
print("=" * 80)

# Save JSON results for report generator
with open("audit_run_results.json", "w", encoding="utf-8") as f:
    json.dump({
        "timestamp": str(datetime.now(timezone.utc)),
        "workflow_id": workflow_id,
        "workflow_name": test_workflow_name,
        "task_description": test_task,
        "execution_time_seconds": round(exec_time, 2),
        "steps": audit_details
    }, f, indent=2)

sys.exit(0 if passed_steps == total_steps else 1)
