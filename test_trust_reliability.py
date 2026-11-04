
import json
import shutil
import tempfile
from pathlib import Path

import trust_assessment as ta


def get_metric_score(report, metric_name):
    """Extract the numeric score from a report metric."""
    metric = report.get("metrics", {}).get(metric_name)

    if isinstance(metric, dict):
        return metric.get("score")

    if isinstance(metric, (int, float)):
        return metric

    return None


def find_report_value(report, possible_keys):
    """Find a report value using possible field names."""
    if not isinstance(report, dict):
        return None

    # Check top-level fields first.
    for key in possible_keys:
        if key in report:
            return report[key]

    # Search nested dictionaries.
    for value in report.values():
        if isinstance(value, dict):
            result = find_report_value(value, possible_keys)

            if result is not None:
                return result

    return None


def run_test():
    original_log = Path(ta.LOG_FILE)
    original_chain = Path(ta.CHAIN_FILE)
    original_report_dir = ta.REPORT_DIR

    if not original_log.exists():
        print("ERROR: provenance_logs.json not found.")
        return

    if not original_chain.exists():
        print("ERROR: provenance_integrity_chain.json not found.")
        return

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)

            temp_log = temp / "provenance_logs.json"
            temp_chain = temp / "provenance_integrity_chain.json"
            temp_reports = temp / "trust_reports"

            # Copy original files into temporary storage.
            shutil.copy2(original_log, temp_log)
            shutil.copy2(original_chain, temp_chain)

            # Redirect trust assessment to temporary files.
            ta.LOG_FILE = temp_log
            ta.CHAIN_FILE = temp_chain
            ta.REPORT_DIR = temp_reports

            print("=" * 60)
            print("PROOFMESH - WEEK 11 RELIABILITY TESTING")
            print("=" * 60)

            # ==================================================
            # TEST 1: INCOMPLETE PROVENANCE
            # ==================================================

            print("\nTEST 1: INCOMPLETE PROVENANCE")

            events = json.loads(
                temp_log.read_text(encoding="utf-8")
            )

            chain_data = json.loads(
                temp_chain.read_text(encoding="utf-8")
            )

            if not events or not isinstance(events[0], dict):
                print("SKIPPED: No valid event available.")

            elif len(chain_data.get("records", [])) != len(events):
                print("SKIPPED: Event and chain record counts differ.")

            else:
                # Remove a required field from the first event.
                events[0].pop("timestamp", None)

                temp_log.write_text(
                    json.dumps(events, indent=2),
                    encoding="utf-8"
                )

                # Rebuild the temporary chain to match the
                # modified event log. This isolates completeness.
                records = chain_data["records"]
                previous_hash = ta.GENESIS_HASH

                for index, event in enumerate(events, start=1):
                    record = records[index - 1]

                    record["sequence"] = index
                    record["previous_hash"] = previous_hash
                    record["event"] = event

                    record["record_hash"] = (
                        ta.calculate_record_hash(
                            index,
                            previous_hash,
                            event
                        )
                    )

                    previous_hash = record["record_hash"]

                chain_data["record_count"] = len(records)
                chain_data["chain_head"] = previous_hash

                temp_chain.write_text(
                    json.dumps(chain_data, indent=2),
                    encoding="utf-8"
                )

                report = ta.assess_trust()

                completeness = get_metric_score(
                    report,
                    "provenance_completeness"
                )

                integrity = get_metric_score(
                    report,
                    "integrity_verification"
                )

                print("\nTest 1 results:")
                print("Provenance completeness:", completeness)
                print("Integrity verification:", integrity)

                if (
                    completeness is not None
                    and integrity is not None
                    and completeness < 100
                    and integrity == 100
                ):
                    print(
                        "PASS: Missing provenance field "
                        "reduced completeness."
                    )
                else:
                    print(
                        "FAIL: Unexpected result in "
                        "incomplete provenance test."
                    )

            # ==================================================
            # TEST 2: INTEGRITY FAILURE
            # ==================================================

            print("\n" + "-" * 60)
            print("TEST 2: INTEGRITY FAILURE")

            # Restore fresh copies of the original files.
            shutil.copy2(original_log, temp_log)
            shutil.copy2(original_chain, temp_chain)

            events = json.loads(
                temp_log.read_text(encoding="utf-8")
            )

            if not events or not isinstance(events[0], dict):
                print("SKIPPED: No valid event available.")

            else:
                # Modify the event without updating its hash chain.
                events[0]["event_type"] = "TEST_TAMPERING_EVENT"

                temp_log.write_text(
                    json.dumps(events, indent=2),
                    encoding="utf-8"
                )

                report = ta.assess_trust()

                integrity = get_metric_score(
                    report,
                    "integrity_verification"
                )

                score = find_report_value(
                    report,
                    [
                        "final_trust_score",
                        "final_score",
                        "trust_score",
                        "overall_score"
                    ]
                )

                category = find_report_value(
                    report,
                    [
                        "trust_category",
                        "category"
                    ]
                )

                print("\nTest 2 results:")
                print("Integrity verification:", integrity)
                print("Final trust score:", score)
                print("Trust category:", category)

                if (
                    integrity == 0
                    and isinstance(score, (int, float))
                    and score <= 59
                    and isinstance(category, str)
                    and category.lower() == "low"
                ):
                    print(
                        "PASS: Tampering detected and "
                        "trust downgraded to Low."
                    )
                else:
                    print(
                        "CHECK: Test did not meet all expected "
                        "conditions."
                    )

                    print(
                        "Available report fields:",
                        list(report.keys())
                        if isinstance(report, dict)
                        else type(report).__name__
                    )

            print("\n" + "=" * 60)
            print("WEEK 11 RELIABILITY TESTING COMPLETED")
            print("Original provenance files were preserved.")
            print("=" * 60)

    except (OSError, ValueError, TypeError, KeyError) as error:
        print("\nTEST ERROR:", error)

    finally:
        # Restore the original module paths.
        ta.LOG_FILE = original_log
        ta.CHAIN_FILE = original_chain
        ta.REPORT_DIR = original_report_dir


if __name__ == "__main__":
    run_test()
