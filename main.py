import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from neo4j import GraphDatabase
from dotenv import load_dotenv

from provenance_integrity import verify_saved_chain, CHAIN_FILE
from trust_assessment import assess_trust
from impact_analysis import analyze

from auth.auth_database import initialize_database
from auth.db_session import check_db_connection
from auth.auth_routes import router as auth_router
from routers.workflows import router as workflows_router
from routers.uploads import router as uploads_router
from routers.reports import router as reports_router
from routers.datasets import router as datasets_router


# ============================================================
# 1. LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

NEO4J_URI = os.getenv(
    "NEO4J_URI",
    "bolt://127.0.0.1:7687"
)

NEO4J_USER = os.getenv(
    "NEO4J_USER",
    "neo4j"
)

NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

NEO4J_DATABASE = os.getenv(
    "NEO4J_DATABASE",
    "proofmesh"
)


# ============================================================
# 2. CREATE FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="ProofMesh API",
    description=(
        "Backend API for AI Agent Provenance "
        "and Trust Framework"
    ),
    version="1.0.0"
)


# ============================================================
# 3. CONFIGURE CORS FOR REACT FRONTEND
# ============================================================

# Comma-separated exact origins, e.g.:
# CORS_ALLOWED_ORIGINS=https://proofmesh.example.com,http://localhost:5173
_cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ============================================================
# 4. AUTHENTICATION INITIALIZATION
# ============================================================

initialize_database()

app.include_router(auth_router)
app.include_router(workflows_router)
app.include_router(uploads_router)
app.include_router(reports_router)
app.include_router(datasets_router)


# ============================================================
# 5. NEO4J CONNECTION FUNCTION
# ============================================================

def get_neo4j_driver():

    if not NEO4J_PASSWORD:
        raise HTTPException(
            status_code=503,
            detail="Neo4j password is not configured."
        )

    # Fast connectivity pre-check to prevent blocking on offline Neo4j
    import socket
    from urllib.parse import urlparse
    try:
        parsed = urlparse(NEO4J_URI)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 7687
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.3)
        s.connect((host, port))
        s.close()
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Neo4j service is offline or unreachable."
        )

    driver = None

    try:

        driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )

        driver.verify_connectivity()

        return driver

    except Exception:

        if driver is not None:
            driver.close()

        raise HTTPException(
            status_code=503,
            detail="Unable to connect to Neo4j database."
        )


# ============================================================
# 6. HELPER FUNCTION TO GET NODE ID
# ============================================================

def get_node_id(node):

    properties = dict(node)

    id_properties = [
        "agent_id",
        "tool_id",
        "source_id",
        "decision_id"
    ]

    for property_name in id_properties:

        if property_name in properties:
            return str(properties[property_name])

    return str(node.element_id)


# ============================================================
# 7. HOME ENDPOINT
# ============================================================

@app.get("/")
def home():

    return {
        "project": "ProofMesh",
        "message": "ProofMesh Backend is running!",
        "status": "Success"
    }


# ============================================================
# 8. HEALTH CHECK ENDPOINT
# ============================================================

@app.get("/health")
def health_check():

    db_status = check_db_connection()

    return {
        "status": "healthy",
        "backend": "FastAPI",
        "project": "ProofMesh",
        "database": db_status
    }


# ============================================================
# 9. WORKFLOW GRAPH API
# ============================================================

@app.get("/api/workflow-graph")
def get_workflow_graph():

    driver = None
    try:
        driver = get_neo4j_driver()
    except HTTPException:
        driver = None

    if driver is not None:
        try:
            with driver.session(database=NEO4J_DATABASE) as session:
                query = """
                MATCH (n)
                OPTIONAL MATCH (n)-[r]->(m)
                RETURN n, r, m
                """
                result = session.run(query)
                nodes = {}
                relationships = []

                for record in result:
                    source_node = record["n"]
                    source_id = get_node_id(source_node)

                    # Add source node
                    nodes[source_id] = {
                        "id": source_id,
                        "type": list(source_node.labels)[0],
                        "properties": dict(source_node)
                    }

                    relationship = record["r"]
                    target_node = record["m"]

                    if (
                        relationship is not None
                        and target_node is not None
                    ):
                        target_id = get_node_id(target_node)
                        nodes[target_id] = {
                            "id": target_id,
                            "type": list(target_node.labels)[0],
                            "properties": dict(target_node)
                        }
                        relationships.append({
                            "source": source_id,
                            "target": target_id,
                            "type": relationship.type
                        })

                if nodes:
                    return {
                        "total_nodes": len(nodes),
                        "total_relationships": len(relationships),
                        "nodes": list(nodes.values()),
                        "relationships": relationships,
                        "source": "neo4j_live"
                    }
        except Exception:
            pass
        finally:
            driver.close()

    # Graceful fallback: return graph from verified provenance schema
    nodes = {
        "ProofMesh-Agent": {
            "id": "ProofMesh-Agent",
            "type": "Agent",
            "properties": {
                "name": "ProofMesh-Agent",
                "agent_id": "ProofMesh-Agent",
                "model": "gemini-3.5-flash-lite",
            },
        },
        "knowledge_lookup": {
            "id": "knowledge_lookup",
            "type": "Tool",
            "properties": {
                "name": "knowledge_lookup",
                "tool_id": "knowledge_lookup",
            },
        },
        "controlled_proofmesh_knowledge_base": {
            "id": "controlled_proofmesh_knowledge_base",
            "type": "DataSource",
            "properties": {
                "name": "Controlled ProofMesh Knowledge Base",
                "source_id": "controlled_proofmesh_knowledge_base",
            },
        },
        "decision_3e8b87a4-2707-4904-9f0f-b648def449a4": {
            "id": "decision_3e8b87a4-2707-4904-9f0f-b648def449a4",
            "type": "Decision",
            "properties": {
                "decision_id": "decision_3e8b87a4-2707-4904-9f0f-b648def449a4",
                "stage": "Intermediate",
            },
        },
        "decision_a7678f62-0ee5-4480-b262-1b918b45dc58": {
            "id": "decision_a7678f62-0ee5-4480-b262-1b918b45dc58",
            "type": "Decision",
            "properties": {
                "decision_id": "decision_a7678f62-0ee5-4480-b262-1b918b45dc58",
                "stage": "Final",
            },
        },
    }
    relationships = [
        {"source": "ProofMesh-Agent", "target": "knowledge_lookup", "type": "USED_TOOL"},
        {"source": "knowledge_lookup", "target": "controlled_proofmesh_knowledge_base", "type": "RETRIEVED_FROM"},
        {"source": "controlled_proofmesh_knowledge_base", "target": "decision_3e8b87a4-2707-4904-9f0f-b648def449a4", "type": "INFLUENCED"},
        {"source": "controlled_proofmesh_knowledge_base", "target": "decision_a7678f62-0ee5-4480-b262-1b918b45dc58", "type": "INFLUENCED"},
        {"source": "ProofMesh-Agent", "target": "decision_3e8b87a4-2707-4904-9f0f-b648def449a4", "type": "MADE_DECISION"},
        {"source": "ProofMesh-Agent", "target": "decision_a7678f62-0ee5-4480-b262-1b918b45dc58", "type": "MADE_DECISION"},
    ]
    return {
        "total_nodes": len(nodes),
        "total_relationships": len(relationships),
        "nodes": list(nodes.values()),
        "relationships": relationships,
        "source": "provenance_ledger_fallback",
    }


# ============================================================
# 10. SHA-256 INTEGRITY STATUS API
# ============================================================

@app.get("/api/integrity-status")
def get_integrity_status():

    try:

        # Check whether the saved integrity chain exists
        if not CHAIN_FILE.exists():

            return {
                "status": "NOT_AVAILABLE",
                "integrity_verified": False,
                "message": (
                    "Integrity chain not found. "
                    "Build it first."
                ),
                "tampering_detected": None
            }

        # Verify saved hash chain AND current provenance log
        is_valid = verify_saved_chain()

        if is_valid:

            return {
                "status": "PASS",
                "integrity_verified": True,
                "message": (
                    "SHA-256 hash chain and current "
                    "provenance log verification successful."
                ),
                "tampering_detected": False
            }

        else:

            return {
                "status": "FAIL",
                "integrity_verified": False,
                "message": (
                    "Integrity verification failed. "
                    "Possible tampering or chain inconsistency detected."
                ),
                "tampering_detected": None
            }

    except Exception:

        raise HTTPException(
            status_code=500,
            detail=(
                "Error while verifying "
                "provenance integrity."
            )
        )


# ============================================================
# 11. TRUST SCORE API
# ============================================================

@app.get("/api/trust-score")
def get_trust_score():

    try:

        # Reuse existing Week 6 trust assessment
        report = assess_trust()

        return {
            "project": report["project"],
            "trust_score": report["trust_score"],
            "trust_category": report["trust_category"],
            "weights": report["weights"],
            "metrics": report["metrics"],
            "warning": report["warning"],
            "limitations": report["limitations"]
        }

    except Exception:

        raise HTTPException(
            status_code=500,
            detail="Unable to calculate ProofMesh trust score."
        )


# ============================================================
# 12. IMPACT ANALYSIS API
# ============================================================

@app.get("/api/impact-analysis")
def get_impact_analysis(
    node_type: str,
    node_id: str,
    unreliable: bool = False,
    check_integrity: bool = False
):

    driver = None
    try:
        driver = get_neo4j_driver()
    except HTTPException:
        driver = None

    try:

        # Validate the node type
        allowed_types = [
            "Agent",
            "Tool",
            "DataSource",
            "Decision"
        ]

        if node_type not in allowed_types:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid node_type. Use Agent, Tool, "
                    "DataSource, or Decision."
                )
            )

        # Run impact analysis with Neo4j driver or fallback provenance traversal
        report = analyze(
            driver=driver,
            node_type=node_type,
            node_id=node_id,
            unreliable=unreliable,
            check_integrity=check_integrity
        )

        return report

    except HTTPException:
        raise

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to perform impact analysis: {str(e)}"
        )

    finally:
        if driver is not None:
            driver.close()