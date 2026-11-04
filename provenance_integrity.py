import hashlib
import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

LOG_FILE = BASE_DIR / "provenance_logs.json"
CHAIN_FILE = BASE_DIR / "provenance_integrity_chain.json"

GENESIS_HASH = "0" * 64


def canonical_json(data):
    """Serialize data consistently so hashing is reproducible."""
    return json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def calculate_record_hash(sequence, previous_hash, event):
    """Calculate the SHA-256 hash for one chained record."""
    record_data = {
        "sequence": sequence,
        "previous_hash": previous_hash,
        "event": event,
    }

    canonical_data = canonical_json(record_data).encode("utf-8")

    return hashlib.sha256(canonical_data).hexdigest()


def load_provenance_events():
    """Load the existing Week 2 provenance events."""
    if not LOG_FILE.exists():
        raise FileNotFoundError(
            f"Provenance log not found: {LOG_FILE}"
        )

    with LOG_FILE.open("r", encoding="utf-8") as file:
        events = json.load(file)

    if not isinstance(events, list):
        raise ValueError(
            "provenance_logs.json must contain a JSON list."
        )

    if not events:
        raise ValueError("No provenance events were found.")

    return events


def build_hash_chain():
    """Hash every event and link it to the previous hash."""
    events = load_provenance_events()

    chain = []
    previous_hash = GENESIS_HASH

    for sequence, event in enumerate(events, start=1):
        record_hash = calculate_record_hash(
            sequence,
            previous_hash,
            event,
        )

        chain_record = {
            "sequence": sequence,
            "event_id": event.get("event_id"),
            "event_type": event.get("event_type"),
            "previous_hash": previous_hash,
            "event": event,
            "record_hash": record_hash,
        }

        chain.append(chain_record)
        previous_hash = record_hash

    output = {
        "algorithm": "SHA-256",
        "description": (
            "Hash chain for ProofMesh provenance records"
        ),
        "record_count": len(chain),
        "genesis_hash": GENESIS_HASH,
        "chain_head": previous_hash,
        "records": chain,
    }

    with CHAIN_FILE.open("w", encoding="utf-8") as file:
        json.dump(output, file, indent=4, ensure_ascii=False)

    print("=" * 58)
    print("ProofMesh - SHA-256 Hash Chain")
    print("=" * 58)
    print(f"Source events: {len(events)}")
    print("Hash algorithm: SHA-256")
    print(f"Chain saved to: {CHAIN_FILE.name}")
    print(f"Final chain hash: {previous_hash}")
    print("Hash chain created successfully.")


def verify_chain(records, expected_head=None):
    """Check each record hash and its link to the previous record."""
    if not records:
        print("FAIL: The chain contains no records.")
        return False

    expected_previous_hash = GENESIS_HASH
    all_valid = True

    for index, record in enumerate(records, start=1):
        sequence = record.get("sequence")

        if sequence != index:
            print(
                f"FAIL: Unexpected sequence at record {index}."
            )
            all_valid = False

        if record.get("previous_hash") != expected_previous_hash:
            print(
                f"FAIL: Previous-hash link mismatch "
                f"at record {index}."
            )
            all_valid = False

        calculated_hash = calculate_record_hash(
            sequence,
            record.get("previous_hash"),
            record.get("event"),
        )

        if calculated_hash != record.get("record_hash"):
            event_id = record.get("event_id", "unknown")
            print(
                f"FAIL: Hash mismatch at record {index} "
                f"(event ID: {event_id})."
            )
            all_valid = False

        expected_previous_hash = record.get("record_hash")

    if expected_head is not None:
        if expected_previous_hash != expected_head:
            print("FAIL: Final chain hash does not match.")
            all_valid = False

    return all_valid


def verify_saved_chain():
    """Verify saved hash chain and compare current source log."""

    if not CHAIN_FILE.exists():
        print("Integrity chain not found. Build it first.")
        return False

    try:
        with CHAIN_FILE.open("r", encoding="utf-8") as file:
            chain_data = json.load(file)

        if not isinstance(chain_data, dict):
            print("FAIL: Invalid chain file structure.")
            return False

        if chain_data.get("algorithm") != "SHA-256":
            print("FAIL: Unsupported hash algorithm.")
            return False

        if chain_data.get("genesis_hash") != GENESIS_HASH:
            print("FAIL: Genesis hash mismatch.")
            return False

        records = chain_data.get("records", [])

        if not isinstance(records, list) or not records:
            print("FAIL: No valid chain records found.")
            return False

        print("=" * 58)
        print("ProofMesh - Integrity Verification")
        print("=" * 58)
        print(f"Records to verify: {len(records)}")

        # Step 1: Verify saved hash chain
        chain_valid = verify_chain(
            records,
            expected_head=chain_data.get("chain_head"),
        )

        if not chain_valid:
            print("FAIL: Saved hash chain is invalid.")
            print("Tampering or chain inconsistency detected.")
            return False

        print("Hash verification: PASS")
        print("Chain verification: PASS")

        # Step 2: Compare current log with saved events
        current_events = load_provenance_events()

        saved_events = [
            record.get("event")
            for record in records
        ]

        if current_events != saved_events:
            print("FAIL: Provenance log differs from saved chain.")
            print("Tampering or log modification detected.")
            return False

        print("Source log comparison: PASS")

        # Step 3: Check record counts
        if chain_data.get("record_count") != len(records):
            print("FAIL: Chain record count mismatch.")
            return False

        if len(current_events) != len(records):
            print("FAIL: Provenance event count mismatch.")
            return False

        print("Record count verification: PASS")
        print("-" * 58)
        print("Tampering detected: NO")
        print("INTEGRITY CHECK PASSED")
        print("=" * 58)

        return True

    except (
        OSError,
        json.JSONDecodeError,
        ValueError,
        TypeError,
        KeyError,
    ) as error:
        print(f"Integrity verification error: {error}")
        return False
def demonstrate_tampering():
    """Alter a copy in memory and verify that tampering is detected."""
    if not CHAIN_FILE.exists():
        print("Integrity chain not found. Build it first.")
        return False

    with CHAIN_FILE.open("r", encoding="utf-8") as file:
        chain_data = json.load(file)

    test_records = chain_data.get("records", [])    

    if not test_records:
        print("No records available for the tampering test.")
        return False

    # Change the first event without updating its stored hash.
    original_event = test_records[0]["event"]
    original_event["tampering_test"] = (
        "This modification should be detected."
    )

    print("=" * 58)
    print("ProofMesh - Tampering Detection Demonstration")
    print("=" * 58)

    valid = verify_chain(
        test_records,
        expected_head=chain_data.get("chain_head"),
    )

    if not valid:
        print("Tampering detected: YES")
        print("Tampering test: PASS")
        print("The saved chain file was not modified.")
        return True

    print("Tampering test: FAIL")
    return False


def main():
    command = (
        sys.argv[1].lower()
        if len(sys.argv) > 1
        else "build"
    )

    if command == "build":
        build_hash_chain()
    elif command == "verify":
        verify_saved_chain()
    elif command == "test-tamper":
        demonstrate_tampering()
    else:
        print(
            "Usage: python provenance_integrity.py "
            "[build|verify|test-tamper]"
        )


if __name__ == "__main__":
    main()
