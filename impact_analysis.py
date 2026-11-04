import argparse
import hashlib
import json
import os
import sys
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase


# =========================================================
# ProofMesh configuration
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://127.0.0.1:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "proofmesh")

LOG_FILE = BASE_DIR / "provenance_logs.json"
CHAIN_FILE = BASE_DIR / "provenance_integrity_chain.json"
REPORT_DIR = BASE_DIR / "impact_reports"

GENESIS_HASH = "0" * 64

VALID_NODE_TYPES = ["DataSource", "Agent", "Tool", "Decision"]

IDENTIFIER_PROPERTIES = (
    "source_id",
    "agent_id",
    "tool_id",
    "decision_id",
    "event_id",
    "id",
    "name",
)


# =========================================================
# Week 4: SHA-256 integrity verification
# =========================================================

def canonical_json(data):
    """Serialize JSON consistently for hashing."""
    return json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def calculate_record_hash(sequence, previous_hash, event):
    """Calculate a record hash using the Week 4 format."""
    payload = {
        "sequence": sequence,
        "previous_hash": previous_hash,
        "event": event,
    }

    return hashlib.sha256(
        canonical_json(payload).encode("utf-8")
    ).hexdigest()


def event_source_ids(event):
    """
    Extract source IDs explicitly recorded in an event.

    This function does not guess which source caused an event.
    It only uses source identifiers stored in the event itself.
    """
    if not isinstance(event, dict):
        return set()

    source_ids = set()

    for key in ("source_id", "datasource_id", "data_source_id"):
        value = event.get(key)
        if value is not None:
            source_ids.add(str(value))

    metadata = event.get("metadata")

    if isinstance(metadata, dict):
        for key in ("source_id", "datasource_id", "data_source_id"):
            value = metadata.get(key)
            if value is not None:
                source_ids.add(str(value))

    return source_ids


def verify_provenance_log():
    """
    Validate the saved hash chain and compare its events to the
    current provenance log.

    Returns changed event details to support source attribution.
    """
    result = {
        "verified": False,
        "reason": "",
        "errors": [],
        "modified_event_ids": [],
        "modified_events": [],
        "event_count": 0,
        "chain_record_count": 0,
    }

    if not LOG_FILE.exists():
        result["reason"] = "provenance_logs.json is missing."
        result["errors"].append(result["reason"])
        return result

    if not CHAIN_FILE.exists():
        result["reason"] = (
            "provenance_integrity_chain.json is missing."
        )
        result["errors"].append(result["reason"])
        return result

    try:
        with LOG_FILE.open("r", encoding="utf-8") as file:
            current_events = json.load(file)

        with CHAIN_FILE.open("r", encoding="utf-8") as file:
            chain_data = json.load(file)

    except (OSError, json.JSONDecodeError) as error:
        result["reason"] = f"Could not read integrity files: {error}"
        result["errors"].append(result["reason"])
        return result

    if not isinstance(current_events, list):
        result["reason"] = (
            "The provenance log must contain a JSON list."
        )
        result["errors"].append(result["reason"])
        return result

    if not isinstance(chain_data, dict):
        result["reason"] = "The integrity chain must be a JSON object."
        result["errors"].append(result["reason"])
        return result

    records = chain_data.get("records", [])

    if not isinstance(records, list):
        result["reason"] = (
            "The integrity chain records must be a list."
        )
        result["errors"].append(result["reason"])
        return result

    result["event_count"] = len(current_events)
    result["chain_record_count"] = len(records)

    if chain_data.get("algorithm") != "SHA-256":
        result["errors"].append(
            "The saved chain does not declare SHA-256."
        )

    if len(current_events) != len(records):
        result["errors"].append(
            "The current event count differs from the saved chain."
        )

    previous_hash = GENESIS_HASH
    saved_events = []

    # Verify the saved chain itself.
    for index, record in enumerate(records, start=1):
        if not isinstance(record, dict):
            result["errors"].append(
                f"Invalid chain record at position {index}."
            )
            saved_events.append(None)
            continue

        event = record.get("event")
        saved_events.append(event)

        if not isinstance(event, dict):
            result["errors"].append(
                f"Missing or invalid event at record {index}."
            )
            continue

        if record.get("sequence") != index:
            result["errors"].append(
                f"Invalid sequence number at record {index}."
            )

        if record.get("previous_hash") != previous_hash:
            result["errors"].append(
                f"Broken previous-hash link at record {index}."
            )

        expected_hash = calculate_record_hash(
            index,
            record.get("previous_hash"),
            event,
        )

        if expected_hash != record.get("record_hash"):
            event_id = event.get("event_id", f"record_{index}")
            result["modified_event_ids"].append(str(event_id))

            result["errors"].append(
                f"Hash mismatch at record {index} "
                f"(event ID: {event_id})."
            )

            result["modified_events"].append({
                "event_id": str(event_id),
                "record_index": index,
                "change_type": "saved_chain_hash_mismatch",
                "source_ids": sorted(event_source_ids(event)),
                "saved_event": event,
                "current_event": None,
            })

        previous_hash = record.get("record_hash", "")

    if previous_hash != chain_data.get("chain_head"):
        result["errors"].append(
            "The chain head does not match the final record hash."
        )

    # Compare each current event with its saved counterpart.
    common_length = min(len(current_events), len(saved_events))

    for index in range(common_length):
        current_event = current_events[index]
        saved_event = saved_events[index]

        if current_event == saved_event:
            continue

        current_event = (
            current_event if isinstance(current_event, dict) else {}
        )
        saved_event = (
            saved_event if isinstance(saved_event, dict) else {}
        )

        event_id = (
            current_event.get("event_id")
            or saved_event.get("event_id")
            or f"record_{index + 1}"
        )

        event_id = str(event_id)
        result["modified_event_ids"].append(event_id)

        source_ids = (
            event_source_ids(current_event)
            | event_source_ids(saved_event)
        )

        result["modified_events"].append({
            "event_id": event_id,
            "record_index": index + 1,
            "change_type": "current_log_differs_from_saved_chain",
            "source_ids": sorted(source_ids),
            "saved_event": saved_event,
            "current_event": current_event,
        })

        result["errors"].append(
            f"Current log differs from the saved chain at "
            f"record {index + 1} (event ID: {event_id})."
        )

    # Detect added events that have no saved counterpart.
    for index in range(len(saved_events), len(current_events)):
        event = current_events[index]
        event = event if isinstance(event, dict) else {}

        event_id = str(
            event.get("event_id", f"new_event_{index + 1}")
        )

        result["modified_event_ids"].append(event_id)

        result["modified_events"].append({
            "event_id": event_id,
            "record_index": index + 1,
            "change_type": "event_added",
            "source_ids": sorted(event_source_ids(event)),
            "saved_event": None,
            "current_event": event,
        })

        result["errors"].append(
            f"An event was added at record {index + 1} "
            f"(event ID: {event_id})."
        )

    result["modified_event_ids"] = list(
        dict.fromkeys(result["modified_event_ids"])
    )

    # Remove duplicate change records for the same event and change type.
    unique_changes = []
    seen_changes = set()

    for change in result["modified_events"]:
        key = (
            change["event_id"],
            change["change_type"],
            change["record_index"],
        )
        if key not in seen_changes:
            seen_changes.add(key)
            unique_changes.append(change)

    result["modified_events"] = unique_changes
    result["verified"] = not result["errors"]

    if result["verified"]:
        result["reason"] = (
            "Current provenance log matches the valid saved hash chain."
        )
    else:
        result["reason"] = (
            "Integrity verification failed: "
            + "; ".join(result["errors"])
        )

    return result


# =========================================================
# Neo4j connection and graph loading
# =========================================================

def connect_to_neo4j():
    """Connect to the configured Neo4j database."""
    if not NEO4J_PASSWORD:
        raise ValueError(
            "NEO4J_PASSWORD is missing from your local .env file."
        )

    driver = GraphDatabase.driver(
        NEO4J_URI,
        auth=(NEO4J_USER, NEO4J_PASSWORD),
    )

    driver.verify_connectivity()
    return driver


def load_graph(driver):
    """Load all graph nodes and directed relationships."""
    nodes = {}
    edges = []

    relationship_query = """
    MATCH (a)-[r]->(b)
    RETURN elementId(a) AS source_element,
           labels(a) AS source_labels,
           properties(a) AS source_properties,
           type(r) AS relationship,
           elementId(b) AS target_element,
           labels(b) AS target_labels,
           properties(b) AS target_properties
    """

    node_query = """
    MATCH (n)
    RETURN elementId(n) AS node_id,
           labels(n) AS labels,
           properties(n) AS properties
    """

    with driver.session(database=NEO4J_DATABASE) as session:
        for record in session.run(relationship_query):
            source_id = record["source_element"]
            target_id = record["target_element"]

            nodes[source_id] = {
                "labels": list(record["source_labels"]),
                "properties": dict(record["source_properties"]),
            }

            nodes[target_id] = {
                "labels": list(record["target_labels"]),
                "properties": dict(record["target_properties"]),
            }

            edges.append({
                "source": source_id,
                "target": target_id,
                "relationship": record["relationship"],
            })

        # Include isolated nodes that have no relationships.
        for record in session.run(node_query):
            nodes[record["node_id"]] = {
                "labels": list(record["labels"]),
                "properties": dict(record["properties"]),
            }

    return nodes, edges


def display_name(node):
    """Return a readable identifier for a graph node."""
    properties = node["properties"]

    for key in IDENTIFIER_PROPERTIES:
        value = properties.get(key)
        if value is not None:
            return str(value)

    return "Unnamed node"


def find_start_node(nodes, node_type, node_id):
    """Find one graph node by label and identifying property."""
    matches = []

    for element_id, node in nodes.items():
        if node_type not in node["labels"]:
            continue

        properties = node["properties"]

        if any(
            properties.get(key) is not None
            and str(properties[key]) == str(node_id)
            for key in IDENTIFIER_PROPERTIES
        ):
            matches.append(element_id)

    if not matches:
        raise ValueError(
            f"No {node_type} node found with identifier '{node_id}'. "
            "Run --list-sources to see available DataSource IDs."
        )

    if len(matches) > 1:
        raise ValueError(
            f"Identifier '{node_id}' matches multiple {node_type} nodes. "
            "Please use a unique identifier."
        )

    return matches[0]


def list_sources(nodes):
    """Print available DataSource nodes."""
    sources = [
        node for node in nodes.values()
        if "DataSource" in node["labels"]
    ]

    print("\nAvailable DataSource nodes:")

    if not sources:
        print("No DataSource nodes found.")
        return

    for node in sources:
        print(
            f"- {display_name(node)} | "
            f"{json.dumps(node['properties'], default=str)}"
        )


# =========================================================
# Week 5: Dependency traversal
# =========================================================

def traverse_dependencies(start_id, nodes, edges):
    """
    Traverse outgoing graph relationships using breadth-first search.
    Each reachable node is visited only once.
    """
    adjacency = {}

    for edge in edges:
        adjacency.setdefault(edge["source"], []).append(edge)

    queue = deque([(start_id, [start_id])])
    visited = {start_id}
    downstream_nodes = []
    affected_decisions = []
    traversed_edges = []

    while queue:
        current_id, path = queue.popleft()

        for edge in adjacency.get(current_id, []):
            traversed_edges.append(edge)
            target_id = edge["target"]

            if target_id in visited:
                continue

            visited.add(target_id)
            next_path = path + [target_id]
            target_node = nodes[target_id]

            path_details = [
                {
                    "node_id": path_id,
                    "name": display_name(nodes[path_id]),
                    "labels": nodes[path_id]["labels"],
                }
                for path_id in next_path
            ]

            downstream_nodes.append({
                "node_id": target_id,
                "name": display_name(target_node),
                "labels": target_node["labels"],
                "path": path_details,
            })

            if "Decision" in target_node["labels"]:
                affected_decisions.append({
                    "node_id": target_id,
                    "name": display_name(target_node),
                    "status": "POTENTIALLY_AFFECTED",
                    "reason": (
                        "A directed dependency path connects the "
                        "selected node to this decision."
                    ),
                    "dependency_path": [
                        item["name"] for item in path_details
                    ],
                })

            queue.append((target_id, next_path))

    return (
        downstream_nodes,
        affected_decisions,
        len(visited),
        traversed_edges,
    )


# =========================================================
# Event-to-source attribution
# =========================================================

def attribute_changes_to_source(integrity_result, start_node, node_type):
    """
    Attribute changed events only when an event explicitly identifies
    the selected DataSource.

    A global integrity failure without matching source identifiers
    does not prove that this source caused the change.
    """
    attribution = {
        "status": "NOT_APPLICABLE",
        "selected_source_id": None,
        "matched_event_ids": [],
        "unattributed_event_ids": [],
        "explanation": "",
    }

    if not integrity_result:
        attribution["explanation"] = (
            "Integrity verification was not requested."
        )
        return attribution

    if integrity_result["verified"]:
        attribution["status"] = "NO_INTEGRITY_CHANGES_DETECTED"
        attribution["explanation"] = (
            "The current log matches the saved hash chain."
        )
        return attribution

    if node_type != "DataSource":
        attribution["status"] = "SOURCE_ATTRIBUTION_NOT_IMPLEMENTED"
        attribution["explanation"] = (
            "Automatic source attribution is implemented for DataSource "
            "nodes only. The integrity check failed, but the selected "
            "node is not a DataSource."
        )
        return attribution

    properties = start_node["properties"]
    selected_source_id = properties.get("source_id")

    if selected_source_id is None:
        selected_source_id = properties.get("id")

    if selected_source_id is None:
        selected_source_id = properties.get("name")

    if selected_source_id is None:
        attribution["status"] = "SOURCE_ID_MISSING"
        attribution["explanation"] = (
            "The selected DataSource has no source_id, id, or name "
            "property for event matching."
        )
        return attribution

    selected_source_id = str(selected_source_id)
    attribution["selected_source_id"] = selected_source_id

    for changed_event in integrity_result.get("modified_events", []):
        changed_ids = {
            str(value)
            for value in changed_event.get("source_ids", [])
            if value is not None
        }

        event_id = str(changed_event.get("event_id", "unknown"))

        if selected_source_id in changed_ids:
            attribution["matched_event_ids"].append(event_id)
        else:
            attribution["unattributed_event_ids"].append(event_id)

    if attribution["matched_event_ids"]:
        attribution["status"] = "MATCHED_SOURCE_ID"
        attribution["explanation"] = (
            "At least one changed event explicitly contains the selected "
            "source ID. Downstream decisions are candidates for review; "
            "this match does not prove the source content caused the change."
        )
    else:
        attribution["status"] = "NOT_ATTRIBUTED"
        attribution["explanation"] = (
            "The integrity check failed, but none of the changed events "
            "explicitly identifies the selected source. The source will "
            "not be blamed automatically."
        )

    return attribution


# =========================================================
# Report generation and impact analysis
# =========================================================

def analyze(
    driver,
    node_type,
    node_id,
    unreliable=False,
    check_integrity=False,
):
    """Run dependency analysis and save a JSON report."""
    nodes, edges = load_graph(driver)
    start_id = find_start_node(nodes, node_type, node_id)
    start_node = nodes[start_id]

    integrity_result = None
    attribution = None

    if check_integrity:
        integrity_result = verify_provenance_log()

        print("\nProvenance integrity verification:")

        if integrity_result["verified"]:
            print("PASS: Provenance log matches the saved hash chain.")
        else:
            print("FAIL: Provenance integrity verification failed.")
            print(integrity_result["reason"])

        attribution = attribute_changes_to_source(
            integrity_result,
            start_node,
            node_type,
        )

        print(
            "Source attribution: "
            f"{attribution['status']}"
        )
        print(attribution["explanation"])

    (
        downstream_nodes,
        affected_decisions,
        visited_count,
        traversed_edges,
    ) = traverse_dependencies(start_id, nodes, edges)

    # --unreliable is an explicit simulation flag.
    # Integrity failure alone does not set this flag.
    if unreliable:
        for decision in affected_decisions:
            decision["status"] = "FLAGGED_UNRELIABLE_SOURCE"
            decision["reason"] = (
                "This decision is downstream of a node explicitly "
                "marked unreliable for the simulation."
            )

    # If a changed event explicitly matches this source ID, flag
    # downstream decisions for review, but state the evidence accurately.
    if (
        attribution
        and attribution["status"] == "MATCHED_SOURCE_ID"
    ):
        matched_ids = set(attribution["matched_event_ids"])

        for decision in affected_decisions:
            decision["status"] = "FLAGGED_INTEGRITY_REVIEW"

            decision["reason"] = (
                "The decision is downstream of the selected source, and "
                "a changed provenance event explicitly references that "
                "source. Review is required; causal responsibility has "
                "not been independently proven."
            )

            decision["matched_changed_event_ids"] = sorted(matched_ids)

    report = {
        "project": "ProofMesh",
        "analysis_type": "Dependency-Based Impact Analysis",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "start_node": {
            "node_id": start_id,
            "node_type": node_type,
            "name": display_name(start_node),
            "properties": start_node["properties"],
        },
        "unreliable_source_test": unreliable,
        "integrity_verification": integrity_result,
        "source_attribution": attribution,
        "nodes_visited": visited_count,
        "downstream_nodes": downstream_nodes,
        "affected_decisions": affected_decisions,
        "affected_decision_count": len(affected_decisions),
        "relationships_traversed": traversed_edges,
        "limitations": [
            "Traversal follows outgoing Neo4j relationships only.",
            "Only decisions reachable from the selected node are included.",
            "Source attribution requires changed events to explicitly "
            "contain a matching source_id or supported metadata source ID.",
            "A source-ID match identifies a related event; it does not "
            "prove the source content caused the change.",
            "A SHA-256 chain can be recalculated by an attacker who can "
            "rewrite the log, chain, and chain head. A trusted external "
            "checkpoint or digital signature is needed for stronger "
            "tamper resistance.",
        ],
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    safe_id = "".join(
        character if character.isalnum() or character in "-_"
        else "_"
        for character in str(node_id)
    )

    suffix = "_unreliable" if unreliable else ""
    report_path = REPORT_DIR / (
        f"impact_{node_type.lower()}_{safe_id}{suffix}.json"
    )

    with report_path.open("w", encoding="utf-8") as file:
        json.dump(
            report,
            file,
            indent=2,
            ensure_ascii=False,
            default=str,
        )

    print("\nProofMesh Dependency-Based Impact Analysis")
    print("=" * 46)
    print(f"Starting node: {display_name(start_node)}")
    print(f"Nodes visited: {visited_count}")
    print(f"Downstream nodes: {len(downstream_nodes)}")
    print(f"Affected decisions: {len(affected_decisions)}")
    print(f"Unreliable simulation: {'YES' if unreliable else 'NO'}")

    if attribution:
        print(f"Source attribution: {attribution['status']}")

    print(f"Report saved: {report_path}")

    if affected_decisions:
        print("\nDecisions requiring review:")

        for decision in affected_decisions:
            print(
                f"- {decision['name']} "
                f"[{decision['status']}]"
            )
    else:
        print(
            "\nNo downstream decisions found. Check graph relationship "
            "directions and connectivity."
        )

    return report


# =========================================================
# Command-line interface
# =========================================================

def main():
    parser = argparse.ArgumentParser(
        description=(
            "ProofMesh dependency-based impact analysis "
            "with SHA-256 integrity verification."
        )
    )

    parser.add_argument(
        "--list-sources",
        action="store_true",
        help="List available DataSource nodes.",
    )

    parser.add_argument(
        "--node-type",
        choices=VALID_NODE_TYPES,
        help="Type of the starting Neo4j node.",
    )

    parser.add_argument(
        "--node-id",
        help=(
            "Unique source_id, agent_id, tool_id, decision_id, "
            "id, or name."
        ),
    )

    parser.add_argument(
        "--unreliable",
        action="store_true",
        help="Simulate an unreliable source for testing.",
    )

    parser.add_argument(
        "--check-integrity",
        action="store_true",
        help=(
            "Verify the provenance log against the saved "
            "Week 4 SHA-256 chain."
        ),
    )

    args = parser.parse_args()
    driver = None

    try:
        driver = connect_to_neo4j()
        nodes, _ = load_graph(driver)

        if args.list_sources:
            list_sources(nodes)
            return

        if not args.node_type or not args.node_id:
            parser.error(
                "Provide --node-type and --node-id, "
                "or use --list-sources."
            )

        analyze(
            driver=driver,
            node_type=args.node_type,
            node_id=args.node_id,
            unreliable=args.unreliable,
            check_integrity=args.check_integrity,
        )

    except Exception as error:
        print(f"Impact analysis failed: {error}")
        sys.exit(1)

    finally:
        if driver is not None:
            driver.close()


if __name__ == "__main__":
    main()