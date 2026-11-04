import os

from dotenv import load_dotenv
from neo4j import GraphDatabase


# Load environment variables from .env
load_dotenv()

URI = os.getenv("NEO4J_URI", "bolt://127.0.0.1:7687")
USERNAME = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD")
DATABASE = os.getenv("NEO4J_DATABASE", "proofmesh")


class Neo4jSchema:
    """Creates and verifies the ProofMesh Neo4j schema."""

    def __init__(self):
        if not PASSWORD:
            raise ValueError(
                "NEO4J_PASSWORD is missing. "
                "Add it to the .env file."
            )

        self.driver = GraphDatabase.driver(
            URI,
            auth=(USERNAME, PASSWORD)
        )

    def verify_connection(self):
        """Verify that the Neo4j server is reachable."""
        self.driver.verify_connectivity()
        print("Neo4j connection: OK")

    def create_constraints(self):
        """Create uniqueness constraints for ProofMesh node types."""

        queries = [
            """
            CREATE CONSTRAINT agent_id_unique IF NOT EXISTS
            FOR (a:Agent)
            REQUIRE a.agent_id IS UNIQUE
            """,

            """
            CREATE CONSTRAINT tool_id_unique IF NOT EXISTS
            FOR (t:Tool)
            REQUIRE t.tool_id IS UNIQUE
            """,

            """
            CREATE CONSTRAINT source_id_unique IF NOT EXISTS
            FOR (s:DataSource)
            REQUIRE s.source_id IS UNIQUE
            """,

            """
            CREATE CONSTRAINT decision_id_unique IF NOT EXISTS
            FOR (d:Decision)
            REQUIRE d.decision_id IS UNIQUE
            """,
        ]

        with self.driver.session(database=DATABASE) as session:
            for query in queries:
                session.run(query)

        print("Neo4j constraints: OK")

    def close(self):
        self.driver.close()


def main():
    schema = Neo4jSchema()

    try:
        print("=" * 50)
        print("ProofMesh - Neo4j Schema Setup")
        print("=" * 50)

        print(f"URI: {URI}")
        print(f"Database: {DATABASE}")
        print()

        schema.verify_connection()
        schema.create_constraints()

        print()
        print("ProofMesh Neo4j schema created successfully.")

    finally:
        schema.close()


if __name__ == "__main__":
    main()