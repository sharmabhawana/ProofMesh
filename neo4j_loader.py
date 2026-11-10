import json
import os
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase


# ============================================================
# Load environment variables
# ============================================================

load_dotenv()

URI = os.getenv(
    "NEO4J_URI",
    "bolt://127.0.0.1:7687"
)

USERNAME = os.getenv(
    "NEO4J_USER",
    "neo4j"
)

PASSWORD = os.getenv("NEO4J_PASSWORD")

DATABASE = os.getenv(
    "NEO4J_DATABASE",
    "proofmesh"
)

LOG_FILE = Path("provenance_logs.json")


# ============================================================
# Neo4j Provenance Loader
# ============================================================

class Neo4jProvenanceLoader:

    def __init__(self):

        if not PASSWORD:
            raise ValueError(
                "NEO4J_PASSWORD is missing. "
                "Add your Neo4j password to the .env file."
            )

        self.driver = GraphDatabase.driver(
            URI,
            auth=(USERNAME, PASSWORD)
        )

    # --------------------------------------------------------
    # Connection
    # --------------------------------------------------------

    def verify_connection(self):

        self.driver.verify_connectivity()

        print("Neo4j connection: OK")

    # --------------------------------------------------------
    # Load provenance JSON
    # --------------------------------------------------------

    def load_events(self):

        if not LOG_FILE.exists():

            raise FileNotFoundError(
                f"{LOG_FILE} was not found."
            )

        with open(
            LOG_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            events = json.load(file)

        if not isinstance(events, list):

            raise ValueError(
                "provenance_logs.json must contain a JSON list."
            )

        print(
            f"Loaded {len(events)} provenance events."
        )

        return events

    # ========================================================
    # CREATE NODES
    # ========================================================

    def create_agent(
        self,
        agent_id,
        model
    ):

        query = """
        MERGE (a:Agent {agent_id: $agent_id})
        SET a.model = $model
        RETURN a
        """

        with self.driver.session(
            database=DATABASE
        ) as session:

            session.run(
                query,
                agent_id=agent_id,
                model=model
            )

    # --------------------------------------------------------

    def create_tool(
        self,
        tool_id,
        name
    ):

        query = """
        MERGE (t:Tool {tool_id: $tool_id})
        SET t.name = $name
        RETURN t
        """

        with self.driver.session(
            database=DATABASE
        ) as session:

            session.run(
                query,
                tool_id=tool_id,
                name=name
            )

    # --------------------------------------------------------

    def create_source(
        self,
        source_id,
        name
    ):

        query = """
        MERGE (s:DataSource {source_id: $source_id})
        SET s.name = $name
        RETURN s
        """

        with self.driver.session(
            database=DATABASE
        ) as session:

            session.run(
                query,
                source_id=source_id,
                name=name
            )

    # --------------------------------------------------------

    def create_decision(
        self,
        decision_id,
        description,
        status,
        event_id=None
    ):

        query = """
        MERGE (d:Decision {decision_id: $decision_id})
        SET d.description = $description,
            d.status = $status,
            d.event_id = $event_id
        RETURN d
        """

        with self.driver.session(
            database=DATABASE
        ) as session:

            session.run(
                query,
                decision_id=decision_id,
                description=description,
                status=status,
                event_id=event_id
            )

    # ========================================================
    # CREATE RELATIONSHIPS
    # ========================================================

    def connect_agent_tool(
        self,
        agent_id,
        tool_id
    ):

        query = """
        MATCH (a:Agent {agent_id: $agent_id})
        MATCH (t:Tool {tool_id: $tool_id})

        MERGE (a)-[:USED_TOOL]->(t)
        """

        with self.driver.session(
            database=DATABASE
        ) as session:

            session.run(
                query,
                agent_id=agent_id,
                tool_id=tool_id
            )

    # --------------------------------------------------------

    def connect_tool_source(
        self,
        tool_id,
        source_id
    ):

        query = """
        MATCH (t:Tool {tool_id: $tool_id})
        MATCH (s:DataSource {source_id: $source_id})

        MERGE (t)-[:RETRIEVED_FROM]->(s)
        """

        with self.driver.session(
            database=DATABASE
        ) as session:

            session.run(
                query,
                tool_id=tool_id,
                source_id=source_id
            )

    # --------------------------------------------------------

    def connect_source_decision(
        self,
        source_id,
        decision_id
    ):

        query = """
        MATCH (s:DataSource {source_id: $source_id})
        MATCH (d:Decision {decision_id: $decision_id})

        MERGE (s)-[:INFLUENCED]->(d)
        """

        with self.driver.session(
            database=DATABASE
        ) as session:

            session.run(
                query,
                source_id=source_id,
                decision_id=decision_id
            )

    # --------------------------------------------------------

    def connect_agent_decision(
        self,
        agent_id,
        decision_id
    ):

        query = """
        MATCH (a:Agent {agent_id: $agent_id})
        MATCH (d:Decision {decision_id: $decision_id})

        MERGE (a)-[:MADE_DECISION]->(d)
        """

        with self.driver.session(
            database=DATABASE
        ) as session:

            session.run(
                query,
                agent_id=agent_id,
                decision_id=decision_id
            )

    # ========================================================
    # PROCESS EVENTS
    # ========================================================

    def process_events(self, events):

        agent_cache = set()
        tool_cache = set()
        source_cache = set()

        decision_id = None

        # ----------------------------------------------------
        # PASS 1
        # Create Agent, Tool and DataSource nodes
        # ----------------------------------------------------

        for event in events:

            event_type = event.get(
                "event_type"
            )

            agent_name = event.get(
                "agent",
                "ProofMesh-Agent"
            )

            model_name = event.get(
                "model"
            )

            tool_name = event.get(
                "tool"
            )

            metadata = event.get(
                "metadata",
                {}
            )

            # =================================================
            # AGENT
            # =================================================

            agent_id = agent_name

            if agent_id not in agent_cache:

                self.create_agent(
                    agent_id=agent_id,
                    model=model_name or "Unknown-Model"
                )

                agent_cache.add(
                    agent_id
                )

            # =================================================
            # TOOL
            # =================================================

            if tool_name:

                tool_id = tool_name

                if tool_id not in tool_cache:

                    self.create_tool(
                        tool_id=tool_id,
                        name=tool_name
                    )

                    tool_cache.add(
                        tool_id
                    )

                self.connect_agent_tool(
                    agent_id,
                    tool_id
                )

            # =================================================
            # DATA SOURCE
            #
            # IMPORTANT:
            # Only EVIDENCE_CAPTURED creates a DataSource.
            # There is NO fallback source.
            # =================================================

            if event_type == "EVIDENCE_CAPTURED":

                source_name = metadata.get(
                    "source"
                )

                if source_name:

                    source_id = (
                        source_name
                        .strip()
                        .lower()
                        .replace(" ", "_")
                    )

                    if source_id not in source_cache:

                        self.create_source(
                            source_id=source_id,
                            name=source_name
                        )

                        source_cache.add(
                            source_id
                        )

                    if tool_name:

                        self.connect_tool_source(
                            tool_id=tool_name,
                            source_id=source_id
                        )

        # ----------------------------------------------------
        # PASS 2
        # Create Decision and connect source → decision
        # ----------------------------------------------------

        for event in events:

            event_type = event.get(
                "event_type"
            )

            if event_type != "DECISION":
                continue

            agent_name = event.get(
                "agent",
                "ProofMesh-Agent"
            )

            metadata = event.get(
                "metadata",
                {}
            )

            input_value = event.get(
                "input",
                ""
            )

            output_value = event.get(
                "output",
                ""
            )

            decision_id = (
                f"decision_"
                f"{event.get('event_id')}"
            )

            description = (
                f"Input: {input_value} | "
                f"Output: {output_value}"
            )

            status = metadata.get(
                "status",
                "RECORDED"
            )

            # ----------------------------------------------
            # Create Decision
            # ----------------------------------------------

            self.create_decision(
                decision_id=decision_id,
                description=description,
                status=status,
                event_id=event.get(
                    "event_id"
                )
            )

            # ----------------------------------------------
            # Agent → Decision
            # ----------------------------------------------

            self.connect_agent_decision(
                agent_id=agent_name,
                decision_id=decision_id
            )

            # ----------------------------------------------
            # Find the actual evidence source
            # ----------------------------------------------

            for evidence_event in events:

                if (
                    evidence_event.get(
                        "event_type"
                    )
                    != "EVIDENCE_CAPTURED"
                ):
                    continue

                evidence_metadata = (
                    evidence_event.get(
                        "metadata",
                        {}
                    )
                )

                source_name = (
                    evidence_metadata.get(
                        "source"
                    )
                )

                if not source_name:
                    continue

                source_id = (
                    source_name
                    .strip()
                    .lower()
                    .replace(" ", "_")
                )

                # ------------------------------------------
                # Source → Decision
                # ------------------------------------------

                self.connect_source_decision(
                    source_id=source_id,
                    decision_id=decision_id
                )

            print(
                f"Imported decision: "
                f"{decision_id}"
            )

    # ========================================================
    # RUN
    # ========================================================

    def run(self, events=None):
        """
        Verify connection, load events if not provided, and process into Neo4j graph.
        """
        self.verify_connection()
        if events is None:
            events = self.load_events()
        self.process_events(events)
        self.close()

    # ========================================================
    # CLOSE
    # ========================================================

    def close(self):

        self.driver.close()


# ============================================================
# MAIN
# ============================================================

def main():

    loader = Neo4jProvenanceLoader()

    try:

        print("=" * 60)
        print(
            "ProofMesh - Week 3 "
            "Neo4j Provenance Import"
        )
        print("=" * 60)

        print(
            f"Database: {DATABASE}"
        )

        print()

        # 1. Verify connection
        loader.verify_connection()

        # 2. Load provenance events
        events = loader.load_events()

        # 3. Create graph
        loader.process_events(
            events
        )

        print()
        print("=" * 60)
        print(
            "PROVENANCE GRAPH IMPORT COMPLETED"
        )
        print("=" * 60)

    finally:

        loader.close()


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()