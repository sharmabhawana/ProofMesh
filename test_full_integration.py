import sys
sys.path.insert(0, ".")
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("=== 1. Health & Home Check ===")
r_home = client.get("/")
assert r_home.status_code == 200
r_health = client.get("/health")
assert r_health.status_code == 200
print("Passed! Home and Health endpoints active.") 

print("=== 2. Auth Flow Check ===")
login_res = client.post(
    "/api/auth/login",
    data={"username": "admin", "password": "AdminPass123!"},
)
assert login_res.status_code == 200, f"Login failed: {login_res.status_code} {login_res.text}"
token = login_res.json()["access_token"]
me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
assert me_res.status_code == 200
print("Passed! User logged in as:", me_res.json()["username"])

print("=== 3. Workflow Graph Check ===")
graph_res = client.get("/api/workflow-graph")
assert graph_res.status_code == 200
data = graph_res.json()
print("Passed! Total nodes:", data["total_nodes"], "Total edges:", data["total_relationships"])

print("=== 4. Integrity Status Check ===")
integ_res = client.get("/api/integrity-status")
assert integ_res.status_code == 200
print("Passed! Integrity status:", integ_res.json()["status"])

print("=== 5. Trust Assessment Check ===")
trust_res = client.get("/api/trust-score")
assert trust_res.status_code == 200
print("Passed! Trust score:", trust_res.json()["trust_score"], "Category:", trust_res.json()["trust_category"])

print("=== 6. Impact Analysis Check ===")
impact_res = client.get(
    "/api/impact-analysis",
    params={
        "node_type": "DataSource",
        "node_id": "controlled_proofmesh_knowledge_base",
        "unreliable": False,
        "check_integrity": True,
    },
)
assert impact_res.status_code == 200
print("Passed! Affected decisions:", impact_res.json()["affected_decision_count"])

print("\n>>> ALL BACKEND & PROVENANCE INTEGRATION CHECKS PASSED 100% <<<")

