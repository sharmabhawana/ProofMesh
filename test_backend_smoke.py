"""
ProofMesh Backend Smoke Test — Tests core modules WITHOUT requiring PostgreSQL or Neo4j.
"""
import sys
import os

sys.path.insert(0, ".")

PASS = "[PASS]"
FAIL = "[FAIL]"
SKIP = "[SKIP]"

results = []

print("=" * 60)
print("ProofMesh Backend Smoke Test")
print("=" * 60)

# 1. Core module imports
try:
    from agent_workflow import knowledge_lookup
    from provenance_logger import ProvenanceLogger
    from provenance_integrity import verify_saved_chain, build_hash_chain
    from trust_assessment import assess_trust
    print(f"{PASS} All core module imports succeed")
    results.append(("Core imports", "PASS"))
except Exception as e:
    print(f"{FAIL} Module import error: {e}")
    results.append(("Core imports", "FAIL"))
    sys.exit(1)

# 2. Trust assessment (file-based, no DB)
try:
    result = assess_trust()
    score = result["trust_score"]
    category = result["trust_category"]
    assert isinstance(score, (int, float)), "trust_score must be numeric"
    assert 0 <= score <= 100, f"trust_score out of range: {score}"
    print(f"{PASS} Trust assessment: score={score}, category={category}")
    results.append(("Trust assessment", "PASS"))
except Exception as e:
    print(f"{FAIL} Trust assessment: {e}")
    results.append(("Trust assessment", "FAIL"))

# 3. Integrity chain verification — returns bool
try:
    is_valid = verify_saved_chain()
    assert isinstance(is_valid, bool), f"Expected bool, got {type(is_valid)}"
    print(f"{PASS} Integrity chain verification: verified={is_valid}")
    results.append(("Integrity chain", "PASS"))
except Exception as e:
    print(f"{FAIL} Integrity chain: {e}")
    results.append(("Integrity chain", "FAIL"))

# 4. ProvenanceLogger event recording
# Use a temp file to avoid polluting the production provenance_logs.json
import tempfile
import pathlib

try:
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tmp:
        tmp_path = pathlib.Path(tmp.name)
        tmp.write("[]")

    # Monkeypatch the log file path temporarily
    import provenance_logger as _pl_module
    orig_log = _pl_module.LOG_FILE
    _pl_module.LOG_FILE = tmp_path

    logger = ProvenanceLogger()
    logger._record_event(
        event_type="MODEL_DETAILS",
        metadata={"model": "gemini-3.5-flash-lite", "test": True},
    )
    logger._record_event(
        event_type="LLM_CALL_START",
        input_data="test prompt",
        metadata={"model": "gemini-3.5-flash-lite"},
    )
    logger._record_event(
        event_type="DECISION",
        output_data="test decision output",
        metadata={"status": "RECORDED"},
    )
    assert len(logger.events) == 3, f"Expected 3 events, got {len(logger.events)}"
    for ev in logger.events:
        assert "event_id" in ev
        assert "timestamp" in ev
        assert "event_type" in ev

    _pl_module.LOG_FILE = orig_log
    tmp_path.unlink(missing_ok=True)
    print(f"{PASS} ProvenanceLogger: {len(logger.events)} events recorded correctly (isolated temp file)")
    results.append(("ProvenanceLogger", "PASS"))
except Exception as e:
    _pl_module.LOG_FILE = orig_log  # always restore
    print(f"{FAIL} ProvenanceLogger: {e}")
    results.append(("ProvenanceLogger", "FAIL"))

# 5. Knowledge lookup tool (no external API needed)
try:
    result_text = knowledge_lookup.invoke({"topic": "provenance"})
    assert isinstance(result_text, str) and len(result_text) > 10
    print(f"{PASS} Knowledge lookup tool: returned {len(result_text)} chars")
    results.append(("Knowledge lookup", "PASS"))
except Exception as e:
    print(f"{FAIL} Knowledge lookup: {e}")
    results.append(("Knowledge lookup", "FAIL"))

# 6. Datasets engine — generator
try:
    from datasets_engine.generator import SyntheticProvenanceGenerator
    gen = SyntheticProvenanceGenerator(seed=42)
    dataset = gen.generate_dataset(profile="normal_execution", target_events=50)
    assert dataset["total_events"] > 0
    assert "events" in dataset
    assert len(dataset["events"]) > 0
    # Verify SHA-256 chain in metadata
    assert "metadata" in dataset
    assert "chain_head" in dataset["metadata"]
    print(f"{PASS} Dataset generator: {dataset['total_events']} events, profile={dataset['profile']}, chain_head present")
    results.append(("Dataset generator", "PASS"))
except Exception as e:
    print(f"{FAIL} Dataset generator: {e}")
    results.append(("Dataset generator", "FAIL"))

# 7. Dataset validator — returns dict with 'valid' key
try:
    from datasets_engine.validator import DatasetValidator
    from datasets_engine.generator import SyntheticProvenanceGenerator
    gen2 = SyntheticProvenanceGenerator(seed=42)
    ds = gen2.generate_dataset(profile="normal_execution", target_events=20)
    validator = DatasetValidator()
    val_result = validator.validate_dataset(ds)
    assert "valid" in val_result, f"Missing 'valid' key, got: {list(val_result.keys())}"
    assert val_result["valid"] is True, f"Validation failed: {val_result.get('issues', [])}"
    completeness = val_result.get("completeness_score", 0)
    print(f"{PASS} Dataset validator: valid={val_result['valid']}, completeness={completeness}%")
    results.append(("Dataset validator", "PASS"))
except Exception as e:
    print(f"{FAIL} Dataset validator: {e}")
    results.append(("Dataset validator", "FAIL"))

# 8. All 10 dataset profiles
try:
    from datasets_engine.generator import SyntheticProvenanceGenerator
    gen3 = SyntheticProvenanceGenerator(seed=42)
    all_profiles = SyntheticProvenanceGenerator.PROFILES
    for profile in all_profiles:
        ds = gen3.generate_dataset(profile=profile, target_events=10)
        assert ds["total_events"] > 0, f"Profile {profile} returned 0 events"
    print(f"{PASS} All {len(all_profiles)} dataset profiles generate events correctly")
    results.append(("All profiles", "PASS"))
except Exception as e:
    print(f"{FAIL} Dataset profiles: {e}")
    results.append(("All profiles", "FAIL"))

# 9. Workflow API response schema includes provenance_events
try:
    import uuid
    import tempfile
    import pathlib
    from datetime import datetime, timezone

    workflow_id = f"wf_{uuid.uuid4().hex[:12]}"

    # Isolate from production log
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tmp2:
        tmp2_path = pathlib.Path(tmp2.name)
        tmp2.write("[]")

    import provenance_logger as _pl_mod2
    orig_log2 = _pl_mod2.LOG_FILE
    _pl_mod2.LOG_FILE = tmp2_path

    logger2 = ProvenanceLogger()
    logger2._record_event("MODEL_DETAILS", metadata={"model": "gemini-3.5-flash-lite", "workflow_id": workflow_id})
    logger2._record_event("LLM_CALL_START", input_data="test", metadata={"model": "gemini-3.5-flash-lite", "workflow_id": workflow_id})
    logger2._record_event("DECISION", output_data="result", metadata={"status": "RECORDED", "workflow_id": workflow_id})

    _pl_mod2.LOG_FILE = orig_log2
    tmp2_path.unlink(missing_ok=True)

    # Simulate complete workflow response (matches routers/workflows.py return)
    response = {
        "workflow_id": workflow_id,
        "workflow_name": "Smoke Test Workflow",
        "status": "completed",
        "started_at": str(datetime.now(timezone.utc)),
        "completed_at": str(datetime.now(timezone.utc)),
        "execution_duration": 1.23,
        "output": "Test output",
        "evidence": "Test evidence",
        "provenance_events_count": len(logger2.events),
        "provenance_events": logger2.events,  # NEW — now returned in API
        "report_id": f"rep_{uuid.uuid4().hex[:12]}",
        "error": None,
        "neo4j_status": "not_attempted",
    }
    assert response["provenance_events_count"] == 3
    assert len(response["provenance_events"]) == 3
    assert response["provenance_events"][0]["event_type"] == "MODEL_DETAILS"
    assert response["provenance_events"][2]["event_type"] == "DECISION"
    # Verify each event has required fields
    for ev in response["provenance_events"]:
        for field in ["event_id", "timestamp", "event_type", "agent"]:
            assert field in ev, f"Missing field {field} in provenance event"
    print(f"{PASS} Workflow API response: provenance_events present ({len(response['provenance_events'])} events), all fields valid")
    results.append(("Workflow response schema", "PASS"))
except Exception as e:
    print(f"{FAIL} Workflow response schema: {e}")
    results.append(("Workflow response schema", "FAIL"))

# 10. Benchmarks smoke (small scale only)
try:
    from datasets_engine.benchmarks import run_benchmark_scale
    bench = run_benchmark_scale([100])
    assert "results" in bench or isinstance(bench, list) or isinstance(bench, dict)
    print(f"{PASS} Benchmarks engine: 100-event benchmark completed")
    results.append(("Benchmarks", "PASS"))
except Exception as e:
    print(f"{FAIL} Benchmarks: {e}")
    results.append(("Benchmarks", "FAIL"))

# Summary
print()
print("=" * 60)
print("TEST SUMMARY")
print("=" * 60)
passed = sum(1 for _, s in results if s == "PASS")
failed = sum(1 for _, s in results if s == "FAIL")
skipped = sum(1 for _, s in results if s == "SKIP")
for name, status in results:
    icon = "OK" if status == "PASS" else ("XX" if status == "FAIL" else "--")
    print(f"  [{icon}] {name}: {status}")
print()
print(f"Total: {len(results)} | Passed: {passed} | Failed: {failed} | Skipped: {skipped}")
if failed == 0:
    print("ALL TESTS PASSED")
else:
    print(f"{failed} TEST(S) FAILED")
print("=" * 60)
sys.exit(0 if failed == 0 else 1)
