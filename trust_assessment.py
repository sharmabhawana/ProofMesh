import json
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

from provenance_integrity import (
    GENESIS_HASH,
    calculate_record_hash,
)

load_dotenv()

# ============================================================
# 1. PROJECT CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

LOG_FILE = BASE_DIR / "provenance_logs.json"
CHAIN_FILE = BASE_DIR / "provenance_integrity_chain.json"
REPORT_DIR = BASE_DIR / "trust_reports"

SOURCE_WEIGHT = 0.40
COMPLETENESS_WEIGHT = 0.30
INTEGRITY_WEIGHT = 0.30

REQUIRED_FIELDS = (
    "event_id",
    "timestamp",
    "event_type",
    "agent",
)


# ============================================================
# 2. LOAD JSON FILES
# ============================================================

def load_json(path):
    """Load a JSON file safely."""

    if not path.exists():
        raise FileNotFoundError(
            f"Required file not found: {path.name}"
        )

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


# ============================================================
# 3. INTEGRITY VERIFICATION
# ============================================================

def verify_integrity(events, chain_data):
    """
    Verify event contents, hashes, links,
    record count and chain head.
    """

    if not isinstance(events, list):
        return False, "Invalid provenance event structure"

    if not events:
        return False, "No provenance events found"

    if not isinstance(chain_data, dict):
        return False, "Invalid integrity chain structure"

    if chain_data.get("algorithm") != "SHA-256":
        return False, "Unsupported or missing hash algorithm"

    if chain_data.get("genesis_hash") != GENESIS_HASH:
        return False, "Genesis hash mismatch"

    records = chain_data.get("records")

    if not isinstance(records, list) or not records:
        return False, "Invalid or empty chain records"

    if len(events) != len(records):
        return False, "Event count does not match saved chain"

    previous_hash = GENESIS_HASH

    for index, (event, record) in enumerate(
        zip(events, records), start=1
    ):

        if not isinstance(event, dict):
            return False, f"Invalid event at position {index}"

        if not isinstance(record, dict):
            return False, f"Invalid record at position {index}"

        if record.get("sequence") != index:
            return False, f"Sequence mismatch at record {index}"

        if record.get("previous_hash") != previous_hash:
            return False, (
                f"Previous-hash mismatch at record {index}"
            )

        if record.get("event") != event:
            return False, f"Event mismatch at record {index}"

        if not isinstance(record.get("record_hash"), str):
            return False, f"Missing record hash at record {index}"

        calculated_hash = calculate_record_hash(
            index,
            previous_hash,
            event,
        )

        if calculated_hash != record.get("record_hash"):
            return False, f"Hash mismatch at record {index}"

        previous_hash = record["record_hash"]

    if chain_data.get("record_count") != len(records):
        return False, "Saved record count is incorrect"

    if chain_data.get("chain_head") != previous_hash:
        return False, "Final chain hash does not match"

    return True, "SHA-256 hash chain and source log verified"


# ============================================================
# 4. SOURCE RELIABILITY ASSESSMENT
# ============================================================

def score_source_reliability(events):
    """
    Measure source identification in captured evidence.

    This does not independently establish factual accuracy.
    """

    evidence_events = [
        event for event in events
        if isinstance(event, dict)
        and event.get("event_type") == "EVIDENCE_CAPTURED"
    ]

    if not evidence_events:
        return 0, {
            "evidence_events": 0,
            "identified_sources": 0,
            "description": "No evidence-capture events found",
        }

    identified_sources = sum(
        1
        for event in evidence_events
        if isinstance(event.get("metadata"), dict)
        and event["metadata"].get("source")
    )

    score = round(
        100 * identified_sources / len(evidence_events)
    )

    return score, {
        "evidence_events": len(evidence_events),
        "identified_sources": identified_sources,
        "description": (
            "Measures source identification, not factual accuracy."
        ),
    }


# ============================================================
# 5. PROVENANCE COMPLETENESS ASSESSMENT
# ============================================================

def score_provenance_completeness(events):
    """
    Measure whether required core fields
    are present in each provenance event.
    """

    if not events:
        return 0, {
            "total_events": 0,
            "complete_events": 0,
            "required_fields": list(REQUIRED_FIELDS),
        }

    complete_events = 0

    for event in events:

        if not isinstance(event, dict):
            continue

        if all(
            event.get(field) not in (None, "")
            for field in REQUIRED_FIELDS
        ):
            complete_events += 1

    score = round(
        100 * complete_events / len(events)
    )

    return score, {
        "total_events": len(events),
        "complete_events": complete_events,
        "required_fields": list(REQUIRED_FIELDS),
    }


# ============================================================
# 6. TRUST CATEGORY CLASSIFICATION
# ============================================================

def classify_trust(score, integrity_valid):
    """
    Classify trust based on the final score.

    Failed integrity verification always produces Low trust.
    """

    if not integrity_valid:
        return "Low"

    if score >= 80:
        return "High"

    if score >= 60:
        return "Moderate"

    return "Low"


# ============================================================
# 7. TRUST ASSESSMENT
# ============================================================

def assess_trust():
    """
    Calculate the ProofMesh trust score
    and generate a JSON assessment report.
    """

    events = load_json(LOG_FILE)
    chain_data = load_json(CHAIN_FILE)

    if not isinstance(events, list):
        raise ValueError(
            "provenance_logs.json must contain a JSON list"
        )

    if not isinstance(chain_data, dict):
        raise ValueError(
            "provenance_integrity_chain.json must contain a JSON object"
        )

    # --------------------------------------------------------
    # STEP 1: INTEGRITY VERIFICATION
    # --------------------------------------------------------

    integrity_valid, integrity_message = verify_integrity(
        events,
        chain_data,
    )

    # --------------------------------------------------------
    # STEP 2: SOURCE RELIABILITY
    # --------------------------------------------------------

    source_score, source_details = score_source_reliability(
        events
    )

    # --------------------------------------------------------
    # STEP 3: PROVENANCE COMPLETENESS
    # --------------------------------------------------------

    completeness_score, completeness_details = (
        score_provenance_completeness(events)
    )

    # --------------------------------------------------------
    # STEP 4: INTEGRITY SCORE
    # --------------------------------------------------------

    integrity_score = (
        100 if integrity_valid else 0
    )

    # --------------------------------------------------------
    # STEP 5: WEIGHTED TRUST SCORE
    # --------------------------------------------------------

    weighted_score = (
        SOURCE_WEIGHT * source_score
        + COMPLETENESS_WEIGHT * completeness_score
        + INTEGRITY_WEIGHT * integrity_score
    )

    if integrity_valid:
        final_score = round(weighted_score, 2)
    else:
        final_score = round(
            min(weighted_score, 59.0),
            2,
        )

    # --------------------------------------------------------
    # STEP 6: TRUST CLASSIFICATION
    # --------------------------------------------------------

    category = classify_trust(
        final_score,
        integrity_valid,
    )

    # --------------------------------------------------------
    # STEP 7: LIMITATIONS
    # --------------------------------------------------------

    limitations = [
        "Source identification does not prove factual reliability.",
        "Completeness checks core event fields only.",
        "A valid hash chain proves consistency with the saved chain, "
        "not that the original data is true.",
        "A chain and its source log can both be rewritten by an "
        "attacker with access to both files. External trusted "
        "checkpoints or digital signatures are needed for stronger "
        "tamper resistance.",
    ]

    # --------------------------------------------------------
    # STEP 8: BUILD TRUST REPORT
    # --------------------------------------------------------

    report = {
        "project": "ProofMesh",

        "assessment_time": datetime.now(
            timezone.utc
        ).isoformat(),

        "trust_score": final_score,

        "trust_category": category,

        "weights": {
            "source_reliability": SOURCE_WEIGHT,
            "provenance_completeness": COMPLETENESS_WEIGHT,
            "integrity_verification": INTEGRITY_WEIGHT,
        },

        "metrics": {
            "source_reliability": {
                "score": source_score,
                "details": source_details,
            },

            "provenance_completeness": {
                "score": completeness_score,
                "details": completeness_details,
            },

            "integrity_verification": {
                "score": integrity_score,
                "verified": integrity_valid,
                "message": integrity_message,
            },
        },

        "warning": (
            None
            if integrity_valid
            else (
                "Integrity verification failed. "
                "Trust score capped at 59 and category set to Low."
            )
        ),

        "limitations": limitations,
    }

    # --------------------------------------------------------
    # STEP 9: SAVE REPORT
    # --------------------------------------------------------

    REPORT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    timestamp = datetime.now(
        timezone.utc
    ).strftime("%Y%m%d_%H%M%S")

    report_path = REPORT_DIR / (
        f"trust_assessment_{timestamp}.json"
    )

    with report_path.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            report,
            file,
            indent=2,
            ensure_ascii=False,
        )

    # --------------------------------------------------------
    # STEP 10: DISPLAY RESULTS
    # --------------------------------------------------------

    print("\n" + "=" * 48)
    print("PROOFMESH - TRUST ASSESSMENT")
    print("=" * 48)

    print(
        f"Source reliability:       {source_score}/100"
    )

    print(
        f"Provenance completeness:  {completeness_score}/100"
    )

    print(
        f"Integrity verification:   {integrity_score}/100"
    )

    print(
        f"Integrity status:         {integrity_message}"
    )

    print("-" * 48)

    print(
        f"Final trust score:        {final_score}/100"
    )

    print(
        f"Trust category:           {category}"
    )

    if not integrity_valid:
        print("\nWARNING: Integrity verification failed.")

    print(f"\nReport saved to: {report_path}")

    print("=" * 48)

    return report


# ============================================================
# 8. EXECUTION ENTRY POINT
# ============================================================

if __name__ == "__main__":

    try:
        assess_trust()

    except (
        OSError,
        ValueError,
        json.JSONDecodeError,
        TypeError,
        KeyError,
    ) as error:

        print(f"Assessment error: {error}")
        raise SystemExit(1)