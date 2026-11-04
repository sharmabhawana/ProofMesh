import io
import shutil
import tempfile
import statistics
import time

from pathlib import Path
from contextlib import redirect_stdout

import provenance_integrity as integrity
import impact_analysis


# ============================================================
# PROOFMESH - WEEK 10 PERFORMANCE EVALUATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

ITERATIONS = 5

SOURCE_ID = "controlled_proofmesh_knowledge_base"


def measure_performance(function, iterations=ITERATIONS):
    """Measure execution time over multiple iterations."""

    execution_times = []

    for _ in range(iterations):

        start = time.perf_counter()

        function()

        end = time.perf_counter()

        execution_times.append(
            (end - start) * 1000
        )

    return {
        "average_ms": statistics.mean(execution_times),
        "minimum_ms": min(execution_times),
        "maximum_ms": max(execution_times),
    }


def print_result(name, result):

    print(f"\n{name}")
    print("-" * 45)

    print(
        f"Average time: {result['average_ms']:.3f} ms"
    )

    print(
        f"Minimum time: {result['minimum_ms']:.3f} ms"
    )

    print(
        f"Maximum time: {result['maximum_ms']:.3f} ms"
    )


def main():

    print("=" * 55)
    print("PROOFMESH - WEEK 10 PERFORMANCE EVALUATION")
    print("=" * 55)

    original_log = integrity.LOG_FILE
    original_chain = integrity.CHAIN_FILE

    original_report_dir = impact_analysis.REPORT_DIR

    driver = None

    try:

        # ----------------------------------------------------
        # 1. SAFE HASH CHAIN PERFORMANCE TEST
        # ----------------------------------------------------

        with tempfile.TemporaryDirectory() as temp_dir:

            temp_path = Path(temp_dir)

            temp_log = temp_path / "provenance_logs.json"
            temp_chain = temp_path / "provenance_integrity_chain.json"

            shutil.copy2(original_log, temp_log)

            integrity.LOG_FILE = temp_log
            integrity.CHAIN_FILE = temp_chain

            with redirect_stdout(io.StringIO()):

                build_result = measure_performance(
                    integrity.build_hash_chain
                )

                verify_result = measure_performance(
                    integrity.verify_saved_chain
                )

            print_result(
                "1. SHA-256 Hash Chain Generation",
                build_result
            )

            print_result(
                "2. Integrity Verification",
                verify_result
            )

        # ----------------------------------------------------
        # 2. NEO4J CONNECTION
        # ----------------------------------------------------

        print("\nConnecting to Neo4j...")

        driver = impact_analysis.connect_to_neo4j()

        print("Neo4j connection successful.")

        # ----------------------------------------------------
        # 3. GRAPH RETRIEVAL PERFORMANCE
        # ----------------------------------------------------

        nodes, edges = impact_analysis.load_graph(driver)

        graph_result = measure_performance(
            lambda: impact_analysis.load_graph(driver)
        )

        print_result(
            "3. Neo4j Workflow Graph Retrieval",
            graph_result
        )

        print(f"Total graph nodes: {len(nodes)}")
        print(f"Total relationships: {len(edges)}")

        # ----------------------------------------------------
        # 4. DEPENDENCY TRAVERSAL PERFORMANCE
        # ----------------------------------------------------

        start_id = impact_analysis.find_start_node(
            nodes,
            "DataSource",
            SOURCE_ID
        )

        traversal_result = measure_performance(
            lambda: impact_analysis.traverse_dependencies(
                start_id,
                nodes,
                edges
            )
        )

        print_result(
            "4. BFS Dependency Traversal",
            traversal_result
        )

        # ----------------------------------------------------
        # 5. END-TO-END IMPACT ANALYSIS
        # ----------------------------------------------------

        with tempfile.TemporaryDirectory() as report_dir:

            impact_analysis.REPORT_DIR = Path(report_dir)

            with redirect_stdout(io.StringIO()):

                impact_result = measure_performance(
                    lambda: impact_analysis.analyze(
                        driver=driver,
                        node_type="DataSource",
                        node_id=SOURCE_ID,
                        unreliable=False,
                        check_integrity=False
                    )
                )

            print_result(
                "5. End-to-End Impact Analysis",
                impact_result
            )

        # ----------------------------------------------------
        # FINAL SUMMARY
        # ----------------------------------------------------

        print("\n" + "=" * 55)
        print("PERFORMANCE EVALUATION COMPLETED")
        print("=" * 55)

        print(f"Iterations per test: {ITERATIONS}")
        print("Hash-chain testing: PASS")
        print("Integrity testing: PASS")
        print("Graph retrieval: PASS")
        print("Dependency traversal: PASS")
        print("Impact analysis: PASS")

        print("\nOriginal provenance files were preserved.")

    except Exception as error:

        print("\nPERFORMANCE EVALUATION FAILED")
        print(f"Reason: {error}")

    finally:

        integrity.LOG_FILE = original_log
        integrity.CHAIN_FILE = original_chain

        impact_analysis.REPORT_DIR = original_report_dir

        if driver is not None:
            driver.close()


if __name__ == "__main__":
    main()