"""
Test Stage 3 (AI Workflow Execution) and Stage 4 (Customer Uploads & Reports)
"""

import io
import json
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("--- TESTING STAGE 3 & 4 APIS ---")

# 1. Register and login as test user to get auth token
client.post(
    "/api/auth/register",
    json={
        "username": "stage3_test_user",
        "email": "stage3_test@proofmesh.local",
        "password": "UserPass123!",
        "full_name": "Stage 3 Tester",
    },
)
r_login = client.post("/api/auth/login", data={"username": "stage3_test_user", "password": "UserPass123!"})
assert r_login.status_code == 200, f"Login failed: {r_login.text}"
token = r_login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("[PASS] User authentication token acquired.")

# 2. Test POST /api/workflows/run
r_run = client.post(
    "/api/workflows/run",
    headers=headers,
    json={
        "workflow_name": "Autonomous Compliance Audit",
        "task_description": "Verify provenance for data source compliance and audit rules.",
        "model_name": "gemini-3.6-flash",
    },
)
assert r_run.status_code == 201, f"Workflow execution failed: {r_run.text}"
wf_data = r_run.json()
wf_id = wf_data["workflow_id"]
assert wf_data["status"] == "completed", f"Status not completed: {wf_data}"
print(f"[PASS] Workflow executed: ID={wf_id}, Status={wf_data['status']}, Duration={wf_data['execution_duration']}s")

# 3. Test GET /api/workflows
r_list = client.get("/api/workflows", headers=headers)
assert r_list.status_code == 200
wf_list = r_list.json()
assert any(w["workflow_id"] == wf_id for w in wf_list), "Created workflow not found in list."
print(f"[PASS] Workflow listed: {len(wf_list)} total workflows for user.")

# 4. Test GET /api/workflows/{id}
r_get = client.get(f"/api/workflows/{wf_id}", headers=headers)
assert r_get.status_code == 200
assert r_get.json()["workflow_id"] == wf_id
print(f"[PASS] Workflow details retrieved for {wf_id}.")

# 5. Test POST /api/uploads
sample_log = [
    {
        "event_id": "test_ev_01",
        "event_type": "TOOL_START",
        "agent": "SecurityAgent-Alpha",
        "model": "gemini-3.6-flash",
        "tool": "cve_scanner",
        "input": "scan target host",
        "timestamp": "2026-11-04T12:00:00Z",
    },
    {
        "event_id": "test_ev_02",
        "event_type": "TOOL_END",
        "agent": "SecurityAgent-Alpha",
        "tool": "cve_scanner",
        "output": "0 vulnerabilities found",
        "timestamp": "2026-11-04T12:00:05Z",
    },
    {
        "event_id": "test_ev_03",
        "event_type": "DECISION",
        "agent": "SecurityAgent-Alpha",
        "output": "Target system approved for deployment",
        "timestamp": "2026-11-04T12:00:08Z",
    },
]

file_bytes = json.dumps(sample_log).encode("utf-8")
r_upload = client.post(
    "/api/uploads",
    headers=headers,
    files={"file": ("agent_security_audit.json", io.BytesIO(file_bytes), "application/json")},
)
assert r_upload.status_code == 201, f"Upload failed: {r_upload.text}"
upl_data = r_upload.json()
upl_id = upl_data["upload_id"]
assert upl_data["total_events"] == 3
print(f"[PASS] Upload processed: ID={upl_id}, Total Events={upl_data['total_events']}, SHA-256={upl_data['snapshot_sha256'][:16]}...")

# 6. Test GET /api/uploads/{id}/events
r_ev = client.get(f"/api/uploads/{upl_id}/events", headers=headers)
assert r_ev.status_code == 200
events = r_ev.json()
assert len(events) == 3
print(f"[PASS] Upload events retrieved: {len(events)} events.")

# 7. Test GET /api/uploads/{id}/integrity
r_integ = client.get(f"/api/uploads/{upl_id}/integrity", headers=headers)
assert r_integ.status_code == 200
assert r_integ.json()["verified"] is True
print(f"[PASS] Upload cryptographic snapshot integrity verified.")

# 8. Test GET /api/uploads/{id}/graph
r_graph = client.get(f"/api/uploads/{upl_id}/graph", headers=headers)
assert r_graph.status_code == 200
graph = r_graph.json()
assert len(graph["nodes"]) > 0
print(f"[PASS] Upload React Flow graph nodes created: {len(graph['nodes'])} nodes.")

# 9. Test GET /api/reports and download
r_rep = client.get("/api/reports", headers=headers)
assert r_rep.status_code == 200
reports = r_rep.json()
assert len(reports) >= 2  # Workflow report + upload validation report
rep_id = reports[0]["report_id"]
print(f"[PASS] Reports listed: {len(reports)} reports available.")

r_dl = client.get(f"/api/reports/{rep_id}/download", headers=headers)
assert r_dl.status_code == 200
assert len(r_dl.content) > 0
print(f"[PASS] Report file safely downloaded for ID={rep_id} (size: {len(r_dl.content)} bytes).")

print("\n=======================================================")
print("ALL STAGE 3 & STAGE 4 BACKEND WORKFLOW & UPLOAD TESTS PASSED!")
print("=======================================================")
