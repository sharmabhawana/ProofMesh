# ProofMesh: Cryptographically Verifiable Provenance and Trust Framework for Autonomous AI Agents

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.0+-008CC1.svg?style=flat&logo=neo4j)](https://neo4j.com)
[![Cryptography](https://img.shields.io/badge/Integrity-SHA--256-green.svg)](https://en.wikipedia.org/wiki/SHA-2)

ProofMesh provides cryptographic transparency, causal traceability, integrity verification, and empirical trust assessment for autonomous AI agents.

---

## 1. Executive Architecture Overview

```
                      +---------------------------------------+
                      |       ProofMesh React Frontend        |
                      |  Light / Dark Mode  *  React Flow     |
                      +-------------------+-------------------+
                                          |
                              HTTP / REST | (JWT HS256)
                                          v
+-----------------------------------------------------------------------------------+
|                            FastAPI Application Server                             |
|                                                                                   |
|  +------------------+  +------------------+  +------------------+  +-----------+  |
|  |   Auth Router    |  | Workflows Router |  |  Uploads Router  |  | Datasets  |  |
|  |  (RBAC & JWT)    |  | (Gemini/LangCh.) |  |  (Ingestion Ctr) |  | (Engine)  |  |
|  +--------+---------+  +--------+---------+  +--------+---------+  +-----+-----+  |
|           |                     |                     |                  |        |
|           |                     |                     |                  |        |
|  +--------v---------------------v---------------------v------------------v-----+  |
|  |                          SQLAlchemy Relational Layer                         |  |
|  |       PostgreSQL (Users, Workflows, Reports, Uploads, Metadata)              |  |
|  +--------------------------------------+---------------------------------------+  |
|                                         |                                         |
|  +--------------------------------------v---------------------------------------+  |
|  |                    Cryptographic & Graph Engines                             |  |
|  |  * SHA-256 Hash Chain & RFC 8785 Canonical Ledger                            |  |
|  |  * Neo4j Knowledge Graph (Agents, Tools, DataSources, Decisions)              |  |
|  |  * Rule-based Trust Assessment Engine: T = 0.40S + 0.30P + 0.30I             |  |
|  |  * Downstream Dependency Impact Analysis Engine                              |  |
|  +------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Functional Capabilities

### A. Live AI Workflow Execution
- Genuine autonomous agent execution powered by LangChain and Google Gemini.
- Automatically captures an 8-event causal provenance lifecycle:
  `MODEL_DETAILS` -> `LLM_CALL_START` -> `TOOL_START` -> `TOOL_END` -> `EVIDENCE_CAPTURED` -> `LLM_CALL_END` -> `INTERMEDIATE_DECISION` -> `DECISION`.
- Synchronizes with Neo4j graph entities and records executions to PostgreSQL with safe JSON report artifacts.

### B. Cryptographic Hash Chain & RFC 8785 Ledger
- Every event payload is canonicalized using RFC 8785 strict sorting and hashed with SHA-256.
- Sequential chaining (`current_hash = SHA256(prev_hash + ":" + payload_hash)`) guarantees tamper detection.
- Any unauthorized post-execution alteration triggers instant cryptographic rejection.

### C. Rule-Based Trust Assessment Engine
Computes transparent, reproducible trust scores across three weighted dimensions:
$$\text{Trust Score } (T) = (0.40 \times S) + (0.30 \times P) + (0.30 \times I)$$
- **$S$ (Source Reliability):** Evaluates the verified reliability of tools and knowledge bases (0–100).
- **$P$ (Provenance Completeness):** Verifies the presence of required lifecycle stages and fields (0–100).
- **$I$ (Integrity Verification):** Cryptographic hash chain comparison (100 if verified, 0 if tampered).
- **Safeguard:** If integrity verification fails, the trust score is strictly capped at 59 (Low category).

### D. Downstream Impact Analysis
- Traversing directed dependency edges in Neo4j from data sources to downstream decisions.
- Identifies every decision affected if a data source is flagged as unverified, tampered, or unreliable.

### E. Customer Data Upload Center & Synthetic Engine
- Ingests customer execution logs in **JSON, JSONL, CSV, TXT, and ZIP** formats (up to 25 MB).
- Includes a **Controlled Synthetic Dataset Generator** with 10 testing profiles:
  `normal_execution`, `multi_agent_execution`, `missing_provenance`, `unreliable_source`, `tool_failure`, `integrity_tampering`, `conflicting_evidence`, `incomplete_execution`, `large_workflow`, `mixed_execution`.
- Automated **Dataset Quality Auditor** validating schema, missing values, duplicate event IDs, ISO 8601 timestamps, and causal workflow completeness.

---

## 3. Database Architecture

### PostgreSQL (Relational Metadata & RBAC)
Managed by SQLAlchemy ORM and Alembic migrations:
- **`users`**: User identity, email, PBKDF2/Argon2/BCrypt password hashes, roles (`user`, `admin`), active status.
- **`workflows`**: Workflow IDs, ownership, task descriptions, duration, completion status, results summary.
- **`reports`**: Analytical reports, file references, generation timestamps, report types.
- **`uploads`**: Customer-uploaded files, storage paths, file sizes, SHA-256 snapshot hashes, event counts.
- **`revoked_tokens`**: Blacklisted JWT token hashes for server-side logout and session invalidation. Indexed for $O(1)$ fast lookups.
- **`password_reset_tokens`**: Single-use cryptographically hashed recovery tokens with 15-minute expirations and strict `role_scope` ('user' vs 'admin') privilege boundaries.

### Neo4j (Provenance Knowledge Graph)
Stores entities and directed provenance relationships:
- **Nodes**: `Agent`, `Model`, `Tool`, `DataSource`, `Decision`, `Evidence`.
- **Relationships**: `(:Agent)-[:USED_TOOL]->(:Tool)`, `(:Tool)-[:CONSULTED]->(:DataSource)`, `(:Evidence)-[:SUPPORTED]->(:Decision)`.

---

## 4. Empirical Performance Benchmarks

Measured on the local host process environment across target event scales:

| Scale Target | Total Latency | Peak Memory | Throughput | Validation Status |
|---|---|---|---|---|
| **Small (100 Events)** | **13.69 ms** | **0.158 MB** | **7,306 events/sec** | **PASS (100% Valid)** |
| **Medium (1,000 Events)** | **130.55 ms** | **1.497 MB** | **7,659 events/sec** | **PASS (100% Valid)** |
| **Large (10,000 Events)** | **1,659.91 ms** | **15.021 MB** | **6,024 events/sec** | **PASS (100% Valid)** |

---

## 5. Prerequisites & Environment Setup

### Prerequisites
- **Python**: 3.10 to 3.13
- **Node.js**: v18 or higher (with npm)
- **PostgreSQL**: 14+ (running on port 5432)
- **Neo4j Desktop / Server**: 5.x+ (listening on `bolt://127.0.0.1:7687`)

### Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:

```bash
# Environment Mode (production / development)
ENVIRONMENT=development

# Neo4j Provenance Graph
NEO4J_URI=bolt://127.0.0.1:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
NEO4J_DATABASE=proofmesh

# PostgreSQL Relational Database (SQLAlchemy)
DATABASE_URL=postgresql+psycopg2://postgres:your_pg_password@localhost:5432/proofmesh

# Authentication & Security (Min 32 characters, required in production)
JWT_SECRET_KEY=your-secure-random-jwt-secret-key-at-least-32-characters

# Cross-Origin Resource Sharing (CORS)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://proofmesh.vercel.app

# AI Execution Engine (Google Gemini 3.5 Flash Lite)
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

---

## 6. Installation & Quick Start

### 1. Backend Setup
```powershell
# Navigate to project directory
cd "c:\Users\BHAWANA SHARMA\OneDrive\Desktop\ProofMesh"

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI backend
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```powershell
# Navigate to frontend directory
cd "c:\Users\BHAWANA SHARMA\OneDrive\Desktop\ProofMesh\frontend"

# Install dependencies
npm install

# Start development server
npm run dev
```

The application is now accessible at **`http://localhost:5173`**.

---

## 7. Running the Automated Test Suites

ProofMesh includes comprehensive automated test suites:

```powershell
# 1. Complete System Validation Suite (25 Tests)
python test_complete_validation.py

# 2. Database & PostgreSQL Auth Suite (25 Tests)
python test_postgres_and_auth_suite.py

# 3. Datasets Engine & Synthetic Generator Suite
python test_datasets_engine.py

# 4. Stage 3 & 4 AI Workflows & Upload Suite
python test_stage3_and_stage4.py

# 5. Frontend Production Build Check
cd frontend && npm run build
```

---

## 8. Academic Project Documentation Suite

The repository includes complete technical and academic documentation for final-year defense and evaluation:

1. [**`AUTHENTICATION_SECURITY_AUDIT.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/AUTHENTICATION_SECURITY_AUDIT.md): Comprehensive security audit report covering password cryptography, JWT revocation, rate limiting, and 20/20 test results.
2. [**`PROJECT_AUDIT.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/PROJECT_AUDIT.md): Comprehensive system audit, component verification matrix, and defect remediation log.
3. [**`PROJECT_ARCHITECTURE.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/PROJECT_ARCHITECTURE.md): Multi-tier architecture diagrams, component specifications, and end-to-end data flow sequence.
4. [**`WEEK_2_TO_12_PROGRESS_REPORT.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/WEEK_2_TO_12_PROGRESS_REPORT.md): Week-by-week development achievements from initial formulation to full-stack integration.
5. [**`MODULE_DOCUMENTATION.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/MODULE_DOCUMENTATION.md): Deep-dive reference guide for every Python module, engine, and frontend component.
6. [**`API_DOCUMENTATION.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/API_DOCUMENTATION.md): Complete OpenAPI reference covering all 28 REST endpoints, request/response bodies, and status codes.
7. [**`TESTING_AND_VALIDATION_REPORT.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/TESTING_AND_VALIDATION_REPORT.md): Granular test execution logs covering all test suites (100% Pass across all suites).
8. [**`PERFORMANCE_EVALUATION.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/PERFORMANCE_EVALUATION.md): Empirical benchmarks measuring latency, RAM, and throughput across 100 to 10,000 event scales.
9. [**`SECURITY_AND_LIMITATIONS.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/SECURITY_AND_LIMITATIONS.md): Cryptographic threat mitigation matrix, honest academic scope boundaries, and future roadmap.
10. [**`FINAL_PROJECT_REPORT_OUTLINE.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/FINAL_PROJECT_REPORT_OUTLINE.md): Standard CSE capstone thesis outline with chapter-by-chapter guidance.
11. [**`FINAL_DEMO_GUIDE.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/FINAL_DEMO_GUIDE.md): Step-by-step live demonstration script for your academic supervisor and examiners.
12. [**`FINAL_PRESENTATION_SLIDES_OUTLINE.md`**](file:///c:/Users/BHAWANA%20SHARMA/OneDrive/Desktop/ProofMesh/FINAL_PRESENTATION_SLIDES_OUTLINE.md): 15-slide presentation blueprint, talking points, and screenshot checklist for your final review PPT.

---

## 9. API Endpoint Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Acquire JWT bearer token (username or email) | No |
| `POST` | `/api/auth/logout` | Server-side logout & JWT hash revocation | Yes |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes |
| `GET` | `/api/auth/admin/users` | List all users (Admin only) | Admin |
| `PATCH` | `/api/auth/admin/users/{id}/status` | Enable/disable user account | Admin |
| `POST` | `/api/workflows/run` | Execute live Gemini AI workflow & log provenance | Yes |
| `GET` | `/api/workflows` | List workflows for current user | Yes |
| `GET` | `/api/workflows/{id}` | Inspect specific workflow details | Yes |
| `POST` | `/api/uploads` | Upload external agent execution log (JSON, CSV, ZIP) | Yes |
| `GET` | `/api/uploads` | List customer uploaded datasets | Yes |
| `GET` | `/api/uploads/{id}/events` | Fetch extracted provenance events | Yes |
| `GET` | `/api/uploads/{id}/integrity` | Verify snapshot SHA-256 integrity | Yes |
| `POST` | `/api/datasets/generate` | Generate controlled synthetic dataset (10 profiles) | Yes |
| `POST` | `/api/datasets/validate` | Audit dataset schema, causality, and completeness | Yes |
| `GET` | `/api/datasets/benchmarks` | Run real-time performance benchmarks (100 to 10k) | Yes |
| `GET` | `/api/reports` | List generated analytical reports | Yes |
| `GET` | `/api/reports/{id}/download` | Secure report download (path-traversal protected) | Yes |
| `GET` | `/api/workflow-graph` | Fetch Neo4j provenance graph visualization nodes | No |
| `GET` | `/api/integrity-status` | Run full cryptographic audit of provenance ledger | No |
| `GET` | `/api/trust-score` | Compute weighted trust score assessment | No |
| `GET` | `/api/impact-analysis` | Perform downstream dependency graph traversal | No |
| `GET` | `/api/health` | Health check and subsystem connectivity status | No |

---

## 9. Security & Credential Hygiene

- **Password Security:** Uses PBKDF2-SHA256 with cryptographically random salts (260,000 rounds). Supports Argon2 and BCrypt compatibility. Zero plaintext passwords.
- **Data Protection:** Passwords and hashes are strictly excluded from all public API serialization models.
- **Path Traversal Protection:** File upload and download endpoints strictly sanitize filenames and enforce an allowed directory whitelist (`uploads_storage/` and `generated_reports/`).
- **Input Validation:** Strict Pydantic models for all API requests.
- **Resource Ownership:** Workflow, upload, and report detail endpoints enforce strict user ownership, permitting administrative oversight only to authorized admins.

---

## 10. License & Submission Information

Developed as part of the **ProofMesh Autonomous AI Trust and Provenance Framework**.
Copyright © 2026. All rights reserved.
