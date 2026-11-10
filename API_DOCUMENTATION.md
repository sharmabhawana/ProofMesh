# ProofMesh — REST API Reference Specification

This document provides the complete API specification for the ProofMesh FastAPI backend server.

**Base URL:** `http://127.0.0.1:8000`  
**Authentication Scheme:** HTTP Bearer JWT (`Authorization: Bearer <token>`)  
**Data Format:** JSON (`Content-Type: application/json` / `multipart/form-data`)  

---

## 1. System & Health Endpoints

### 1.1 Root Home
- **Endpoint:** `GET /`
- **Auth:** Public
- **Description:** Returns system identity and service status.
- **Response `200 OK`:**
  ```json
  {
    "project": "ProofMesh",
    "message": "ProofMesh Backend is running!",
    "status": "Success"
  }
  ```

### 1.2 Health Check
- **Endpoint:** `GET /health`
- **Auth:** Public
- **Description:** Lightweight heartbeat endpoint for load balancers and uptime probes.
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "backend": "FastAPI",
    "project": "ProofMesh"
  }
  ```

---

## 2. Authentication & User Management Endpoints

### 2.1 User Registration
- **Endpoint:** `POST /api/auth/register`
- **Auth:** Public (Rate limited: 5 requests/min per IP)
- **Request Body:**
  ```json
  {
    "username": "researcher_01",
    "email": "researcher@proofmesh.local",
    "password": "StrongPassword123!@#",
    "full_name": "Dr. Researcher"
  }
  ```
- **Responses:**
  - `201 Created`: User successfully created (assigned role `user`).
  - `400 Bad Request`: Invalid username characters, invalid email, or password fails complexity criteria (requires 8–128 chars, uppercase, lowercase, digit, special symbol).
  - `409 Conflict`: Username or email already registered.
  - `429 Too Many Requests`: Rate limit exceeded.
  - `422 Unprocessable Entity`: Missing mandatory fields.

### 2.2 User Login
- **Endpoint:** `POST /api/auth/login`
- **Auth:** Public (Rate limited: 10 requests/min per IP)
- **Request Body (Form URL-Encoded):**
  - `username` (string, required): Username or email address.
  - `password` (string, required): Plaintext password.
- **Responses:**
  - `200 OK`:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
      "token_type": "bearer",
      "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@proofmesh.local",
        "role": "admin",
        "is_active": 1,
        "full_name": "System Administrator"
      }
    }
    ```
  - `401 Unauthorized`: Invalid credentials (timing-safe verification).
  - `403 Forbidden`: Account is inactive/disabled.
  - `429 Too Many Requests`: Rate limit exceeded.

### 2.3 User Logout & Token Revocation
- **Endpoint:** `POST /api/auth/logout`
- **Auth:** Bearer Token
- **Description:** Server-side token invalidation. Computes the SHA-256 hash of the bearer token and persists it in the `revoked_tokens` table until token expiration.
- **Response `200 OK`:**
  ```json
  {
    "message": "Logged out successfully. Session invalidated.",
    "revoked": true
  }
  ```

### 2.4 User Profile
- **Endpoint:** `GET /api/auth/me`
- **Auth:** Bearer Token
- **Response `200 OK`:** Returns authenticated user profile. Password hashes are strictly omitted.
- **Response `401 Unauthorized`:** Invalid, expired, or revoked token.

### 2.5 Admin User Management
- **Endpoint:** `GET /api/auth/admin/users`
- **Auth:** Bearer Token (Requires `admin` role)
- **Response `200 OK`:** Returns array of all registered user records.
- **Response `403 Forbidden`:** Standard users cannot access this endpoint.

### 2.6 Toggle User Status
- **Endpoint:** `PATCH /api/auth/admin/users/{user_id}/status`
- **Auth:** Bearer Token (Requires `admin` role)
- **Request Body:** `{"is_active": false}`
- **Responses:**
  - `200 OK`: Status updated.
  - `400 Bad Request`: Prevents administrator self-lockout.

### 2.7 Forgot Password (Request Reset Link)
- **Endpoint:** `POST /api/auth/forgot-password`
- **Auth:** Public (Rate-limited to 5 requests / 60 seconds per IP)
- **Description:** Generates a cryptographically secure 32-byte single-use token valid for 15 minutes, stores its SHA-256 hash in `password_reset_tokens`, and dispatches an email (or logs to console in development). Always returns HTTP 200 generic message to prevent user enumeration attacks.
- **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "message": "If an account with that email exists, a password reset link has been sent."
    }
    ```
  - `429 Too Many Requests`: IP rate limit exceeded.

### 2.8 Reset Password (Consume Reset Token)
- **Endpoint:** `POST /api/auth/reset-password`
- **Auth:** Public
- **Description:** Validates a user-scoped single-use token against `password_reset_tokens` (checks hash match, non-expired, `role_scope == 'user'`, and unused). Validates password complexity, securely updates password hash via bcrypt, and invalidates the token upon completion.
- **Request Body:**
  ```json
  {
    "token": "dGhpc19pc19hbl9leGFtcGxlX3Rva2VuX3VybHNhZmU",
    "new_password": "NewSecurePassword123!@#"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "message": "Your password has been updated successfully. You can now sign in with your new password."
    }
    ```
  - `400 Bad Request`: Token invalid, expired, already consumed, role-mismatched, or password does not meet security requirements.

### 2.9 Administrator Forgot Password (Request Admin Reset Link)
- **Endpoint:** `POST /api/auth/admin/forgot-password`
- **Auth:** Public (Rate-limited to 5 requests / 60 seconds per IP)
- **Description:** Administrator account password recovery. Verifies that the target email exists AND holds the active `admin` role. If verified, generates a cryptographically secure single-use token bound to `role_scope='admin'` and dispatches a dedicated administrator recovery email. Unconditionally returns HTTP 200 with generic messaging to prevent role discovery.
- **Request Body:**
  ```json
  {
    "email": "admin@proofmesh.local"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "message": "If an administrator account with that email exists, a password reset link has been sent."
    }
    ```
  - `429 Too Many Requests`: IP rate limit exceeded.

### 2.10 Administrator Reset Password (Consume Admin Token)
- **Endpoint:** `POST /api/auth/admin/reset-password`
- **Auth:** Public
- **Description:** Validates an administrator-scoped token against `password_reset_tokens` (verifies hash match, unexpired, unconsumed, and `role_scope == 'admin'`). Verifies target user currently holds `admin` role in the database. Updates password hash via bcrypt, marks token as consumed, and prevents reuse.
- **Request Body:**
  ```json
  {
    "token": "YWRtaW5fc2NvcGVkX3Jlc2V0X3Rva2VuX3VybHNhZmU",
    "new_password": "NewAdminSecurePassword123!@#"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "message": "Administrator password updated successfully. You can now sign in to the Admin Portal with your new credentials."
    }
    ```
  - `400 Bad Request`: Token invalid, expired, role-mismatched, unauthorized for admin recovery, or password does not meet security requirements.

---

## 3. Autonomous AI Workflow Execution

### 3.1 Execute AI Workflow
- **Endpoint:** `POST /api/workflows/run`
- **Auth:** Bearer Token
- **Description:** Triggers live LangChain + Google Gemini agent execution, invokes `knowledge_lookup` tool, collects evidence, records 8-stage provenance, updates SHA-256 chain, and persists metadata in PostgreSQL.
- **Request Body:**
  ```json
  {
    "workflow_name": "Compliance & Security Audit",
    "task_description": "Verify provenance reliability against hallucination in autonomous AI workflows.",
    "model_name": "gemini-3.5-flash-lite"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "workflow_id": "wf_f3b18158d262",
    "workflow_name": "Compliance & Security Audit",
    "status": "completed",
    "started_at": "2026-11-09T14:56:06.124500+00:00",
    "completed_at": "2026-11-09T14:56:11.734500+00:00",
    "execution_duration": 5.61,
    "output": "1. Provenance provides verifiable audit trails...\n2. It prevents unauthorized tampering...",
    "evidence": "Provenance is the recorded history of the origin, processing, and transformation of information.",
    "provenance_events_count": 8,
    "provenance_events": [
      {
        "event_id": "fd8ec142-fa33-486d-a354-761dd1fd377c",
        "timestamp": "2026-11-09T14:56:06.126500+00:00",
        "event_type": "MODEL_DETAILS",
        "agent": "ProofMesh-Agent",
        "model": "gemini-3.5-flash-lite",
        "metadata": { ... }
      }
    ],
    "report_id": "rep_dd061ce0e92f",
    "error": null,
    "neo4j_status": "connected"
  }
  ```

### 3.2 List Workflows
- **Endpoint:** `GET /api/workflows`
- **Auth:** Bearer Token
- **Description:** Lists all workflows owned by the authenticated user (or all if `admin`).

### 3.3 Get Workflow Details
- **Endpoint:** `GET /api/workflows/{workflow_id}`
- **Auth:** Bearer Token (Ownership enforced)

---

## 4. Provenance, Cryptography, Graph & Trust Endpoints

### 4.1 Knowledge Graph Representation
- **Endpoint:** `GET /api/workflow-graph`
- **Auth:** Public / Bearer
- **Description:** Returns property graph nodes (`Agent`, `Tool`, `DataSource`, `Decision`) and directed relationships (`USED_TOOL`, `RETRIEVED_FROM`, `INFLUENCED`, `MADE_DECISION`). Features resilient ledger fallback when Neo4j is offline.
- **Response `200 OK`:**
  ```json
  {
    "total_nodes": 5,
    "total_relationships": 6,
    "nodes": [ ... ],
    "relationships": [ ... ],
    "source": "neo4j_live"
  }
  ```

### 4.2 Cryptographic Integrity Status
- **Endpoint:** `GET /api/integrity-status`
- **Auth:** Public / Bearer
- **Description:** Validates SHA-256 cryptographic hash chain integrity and compares current `provenance_logs.json` against saved hashes.
- **Response `200 OK`:**
  ```json
  {
    "status": "PASS",
    "integrity_verified": true,
    "message": "SHA-256 hash chain and current provenance log verification successful.",
    "tampering_detected": false
  }
  ```

### 4.3 Multi-Factor Trust Score
- **Endpoint:** `GET /api/trust-score`
- **Auth:** Public / Bearer
- **Description:** Calculates formula-driven trust assessment ($T = 0.40S + 0.30P + 0.30I$).
- **Response `200 OK`:**
  ```json
  {
    "trust_score": 100.0,
    "trust_category": "High",
    "formula": "T = 0.40 * S + 0.30 * P + 0.30 * I",
    "weights": {
      "source_reliability": 0.4,
      "provenance_completeness": 0.3,
      "integrity_verification": 0.3
    },
    "metrics": {
      "source_reliability": { "score": 100.0, "weight": 0.4 },
      "provenance_completeness": { "score": 100.0, "weight": 0.3 },
      "integrity_verification": { "score": 100.0, "weight": 0.3 }
    }
  }
  ```

### 4.4 Dependency-Based Impact Analysis
- **Endpoint:** `GET /api/impact-analysis`
- **Auth:** Public / Bearer
- **Query Parameters:**
  - `node_type` (string, required): `DataSource`, `Agent`, `Tool`, `Decision`.
  - `node_id` (string, required): Node identifier (e.g. `controlled_proofmesh_knowledge_base`).
  - `unreliable` (boolean, default: `false`): Simulation flag for hypothetical source failure.
  - `check_integrity` (boolean, default: `false`): Perform live chain verification during analysis.
- **Response `200 OK`:**
  ```json
  {
    "project": "ProofMesh",
    "analysis_type": "Dependency-Based Impact Analysis",
    "start_node": { "node_id": "controlled_proofmesh_knowledge_base", "node_type": "DataSource" },
    "nodes_visited": 3,
    "downstream_nodes": 2,
    "affected_decision_count": 2,
    "affected_decisions": [
      {
        "node_id": "decision_3e8b87a4-2707-4904-9f0f-b648def449a4",
        "status": "POTENTIALLY_AFFECTED",
        "reason": "A directed dependency path connects the selected node to this decision."
      },
      {
        "node_id": "decision_a7678f62-0ee5-4480-b262-1b918b45dc58",
        "status": "POTENTIALLY_AFFECTED",
        "reason": "A directed dependency path connects the selected node to this decision."
      }
    ]
  }
  ```

---

## 5. Ingestion, Datasets & Benchmarks Endpoints

### 5.1 Upload External Provenance File
- **Endpoint:** `POST /api/uploads`
- **Auth:** Bearer Token
- **Content-Type:** `multipart/form-data`
- **Form Param:** `file` (Supported: `.json`, `.jsonl`, `.csv`, `.txt`, `.zip`, max 25 MB).
- **Response `201 Created`:** Returns upload record, extracted event count, and snapshot SHA-256 hash.

### 5.2 Upload Audit & Visual Graph
- `GET /api/uploads`: List all uploaded datasets for user.
- `GET /api/uploads/{id}/events`: Returns normalized JSON events extracted from upload.
- `GET /api/uploads/{id}/graph`: Returns React Flow nodes and edges formatted for visual graph exploration.
- `GET /api/uploads/{id}/integrity`: Verifies per-file snapshot SHA-256 digest against physical disk content.

### 5.3 Datasets Engine Endpoints
- `GET /api/datasets/profiles`: Returns 10 synthetic scenario profiles with descriptions.
- `POST /api/datasets/generate`: Generates controlled synthetic dataset ($10$ to $50,000$ events) and optionally registers it in Upload Center.
- `POST /api/datasets/validate`: Validates dataset schema, timestamp ordering, and causal continuity.
- `GET /api/datasets/benchmarks`: Runs scale benchmarks (100, 1,000, 10,000 events) measuring latency, memory usage, and throughput.

---

## 6. Analytical Reports Endpoints

### 6.1 List Audit Reports
- **Endpoint:** `GET /api/reports`
- **Auth:** Bearer Token
- **Response `200 OK`:** Returns array of analytical reports (`provenance`, `upload_validation`, `trust`, `integrity`).

### 6.2 Safe Report Download
- **Endpoint:** `GET /api/reports/{report_id}/download`
- **Auth:** Bearer Token (Ownership enforced)
- **Response `200 OK`:** Streams application/json file attachment. Path traversal attempts (`../`) are detected and rejected with `400 Bad Request`.

