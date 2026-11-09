"""
ProofMesh — Dataset Engine & Synthetic Generator Automated Verification Suite
"""

import json
from fastapi.testclient import TestClient
from main import app
from auth.security import create_access_token
from auth.auth_database import find_user_by_username
from datasets_engine.generator import SyntheticProvenanceGenerator
from datasets_engine.validator import DatasetValidator
from datasets_engine.benchmarks import run_benchmark_scale

client = TestClient(app)

print("==================================================================")
print("PROOFMESH — DATASET ENGINE & SYNTHETIC GENERATOR VERIFICATION")
print("==================================================================")

# 1. Test All 10 Generator Profiles
print("\n--- TEST GROUP 1: ALL 10 SYNTHETIC PROFILES ---")
gen = SyntheticProvenanceGenerator(seed=123)
for profile in SyntheticProvenanceGenerator.PROFILES:
    ds = gen.generate_dataset(profile=profile, target_events=20)
    assert ds["total_events"] >= 15, f"Profile {profile} produced fewer events than expected"
    assert ds["is_synthetic"] is True
    assert "hash_chain" in ds and len(ds["hash_chain"]) > 0
    print(f"[PASS] Profile '{profile}': Generated {ds['total_events']} events, Hash Head: {ds['metadata']['chain_head'][:16]}...")

# 2. Test Validation Engine
print("\n--- TEST GROUP 2: DATASET VALIDATOR CHECKS ---")
validator = DatasetValidator()

# A. Normal dataset passes
normal_ds = gen.generate_dataset(profile="normal_execution", target_events=50)
v_normal = validator.validate_dataset(normal_ds)
assert v_normal["valid"] is True, f"Normal dataset failed validation: {v_normal['issues']}"
assert v_normal["completeness_score"] >= 80.0
print(f"[PASS] Normal dataset validated: completeness={v_normal['completeness_score']}%, valid=True")

# B. Missing fields detected
bad_ds = [
    {"event_type": "TOOL_START", "timestamp": "2026-11-05T00:00:00Z"},  # missing event_id
    {"event_id": "ev_02", "timestamp": "2026-11-05T00:00:01Z"},         # missing event_type
]
v_bad = validator.validate_dataset(bad_ds)
assert v_bad["valid"] is False
assert v_bad["missing_fields_count"] == 2
print(f"[PASS] Missing fields correctly detected: missing_count={v_bad['missing_fields_count']}, valid=False")

# C. Duplicate event IDs detected
dup_ds = [
    {"event_id": "dup_01", "event_type": "TOOL_START", "timestamp": "2026-11-05T00:00:00Z"},
    {"event_id": "dup_01", "event_type": "TOOL_END", "timestamp": "2026-11-05T00:00:01Z"},
]
v_dup = validator.validate_dataset(dup_ds)
assert v_dup["duplicate_count"] == 1
print(f"[PASS] Duplicate event ID correctly flagged: dup_count={v_dup['duplicate_count']}")

# 3. Test Scale Benchmarks (100, 1000)
print("\n--- TEST GROUP 3: EMPIRICAL PERFORMANCE BENCHMARKS ---")
bench = run_benchmark_scale([100, 1000])
for res in bench["results"]:
    assert res["validation_passed"] is True
    print(f"[PASS] {res['target_events']} events: total={res['total_latency_ms']}ms, RAM={res['peak_memory_mb']}MB, throughput={res['throughput_events_per_sec']} ev/s")

# 4. Test API Endpoints
print("\n--- TEST GROUP 4: FASTAPI DATASET ENDPOINTS ---")
user = find_user_by_username("sharma1") or find_user_by_username("admin")
token = create_access_token(user["id"])
headers = {"Authorization": f"Bearer {token}"}

# A. GET /api/datasets/profiles
r_prof = client.get("/api/datasets/profiles")
assert r_prof.status_code == 200
assert len(r_prof.json()["profiles"]) == 10
print(f"[PASS] GET /api/datasets/profiles: {len(r_prof.json()['profiles'])} profiles returned")

# B. POST /api/datasets/generate
r_gen = client.post(
    "/api/datasets/generate",
    json={"profile": "multi_agent_execution", "target_events": 30, "save_to_upload_center": True},
    headers=headers,
)
assert r_gen.status_code == 201
gen_body = r_gen.json()
assert gen_body["saved_upload_id"] is not None
print(f"[PASS] POST /api/datasets/generate: created dataset '{gen_body['dataset_name']}', upload_id={gen_body['saved_upload_id']}")

# C. POST /api/datasets/validate (by upload_id)
r_val = client.post(
    "/api/datasets/validate",
    json={"upload_id": gen_body["saved_upload_id"]},
    headers=headers,
)
assert r_val.status_code == 200
val_body = r_val.json()
assert val_body["valid"] is True
print(f"[PASS] POST /api/datasets/validate: validated upload dataset, completeness={val_body['completeness_score']}%")

print("\n==================================================================")
print("ALL DATASET ENGINE & SYNTHETIC GENERATOR TESTS PASSED!")
print("==================================================================")

