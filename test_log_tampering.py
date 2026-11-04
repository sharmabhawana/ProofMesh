import json
import shutil
import tempfile
from pathlib import Path

import provenance_integrity as integrity


def test_log_tampering():
    original_log = integrity.LOG_FILE
    original_chain = integrity.CHAIN_FILE

    try:
        # Create an isolated temporary testing directory
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            test_log = temp_path / "provenance_logs.json"
            test_chain = temp_path / "provenance_integrity_chain.json"

            # Copy original files into the temporary directory
            shutil.copy2(original_log, test_log)
            shutil.copy2(original_chain, test_chain)

            # Redirect verification to temporary files
            integrity.LOG_FILE = test_log
            integrity.CHAIN_FILE = test_chain

            # Modify one event in the temporary provenance log
            with test_log.open("r", encoding="utf-8") as file:
                events = json.load(file)

            events[0]["tampering_test"] = (
                "Unauthorized source log modification"
            )

            with test_log.open("w", encoding="utf-8") as file:
                json.dump(events, file, indent=4)

            print("=" * 55)
            print("ProofMesh - Source Log Tampering Test")
            print("=" * 55)

            # Verify the modified log against the original saved chain
            result = integrity.verify_saved_chain()

            if result is False:
                print("\nTampering detected: YES")
                print("Source log tampering test: PASS")
            else:
                print("\nTampering detected: NO")
                print("Source log tampering test: FAIL")
                print(
                    "Check whether verify_saved_chain() "
                    "compares current events with saved events."
                )

    finally:
        # Restore original file paths
        integrity.LOG_FILE = original_log
        integrity.CHAIN_FILE = original_chain

        print("\nOriginal project files were not modified.")


if __name__ == "__main__":
    test_log_tampering()