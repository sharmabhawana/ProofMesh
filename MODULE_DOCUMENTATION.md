# ProofMesh — Technical Module Documentation

This document provides an exhaustive reference for all core backend Python modules, dataset engines, database layers, and frontend components in the ProofMesh codebase.

---

## 1. Core AI Agent & Provenance Modules

### 1.1 `agent_workflow.py` — Autonomous Execution Engine
- **Purpose:** Configures and executes the autonomous AI agent using LangChain Core and Google Gemini.
- **Key Functions & Classes:**
  - `knowledge_lookup`: Structured LangChain tool decorated with `@tool`. Queries a controlled internal knowledge base to supply authoritative context on AI safety, provenance, and trustworthy autonomous systems.
  - `extract_text(response)`: Normalizes diverse LLM response structures (plain string, `AIMessage`, dictionary with content chunks, or list of parts) into clean string outputs.
  - `run_proofmesh_agent(task_prompt, model_name)`: Orchestrates the live execution cycle, instantiating `ProvenanceLogger`, invoking `knowledge_lookup`, querying Gemini via `ChatGoogleGenerativeAI`, and updating the SHA-256 hash chain upon completion.

### 1.2 `provenance_logger.py` — Provenance Interceptor & Lifecycle Callback
- **Purpose:** Captures observable execution events transparently across the agent lifecycle without altering application behavior.
- **Key Functions & Classes:**
  - `ProvenanceLogger(BaseCallbackHandler)`: Inherits from LangChain's callback system.
  - `_record_event(event_type, input_data, output_data, tool, metadata)`: Core recording routine. Assigns UUIDv4 `event_id`, UTC ISO timestamp, agent identifier, model tag, serialized inputs/outputs, and saves to `provenance_logs.json`.
  - `on_tool_start`, `on_tool_end`, `on_tool_error`: Captures tool lifecycle events and execution durations.
  - `_serialize(value)`: Safe serialization handling primitives, nested dictionaries, and non-serializable objects.

### 1.3 `provenance_integrity.py` — Cryptographic Hash Chain Engine
- **Purpose:** Implements immutable, verifiable SHA-256 hash chaining over serialized provenance event sequences.
- **Key Functions & Classes:**
  - `canonical_json(data)`: Serializes JSON adhering to RFC 8785 (keys sorted alphabetically, compact separators `","` and `":"`, UTF-8 encoded without whitespace).
  - `hash_event(event_dict)`: Computes 256-bit SHA-256 digest of canonicalized event payload.
  - `build_hash_chain()`: Reads `provenance_logs.json`, builds chained hashes linked to `GENESIS_HASH` (`0000...0000`), and writes `provenance_integrity_chain.json`.
  - `verify_chain(records, expected_head)`: Verifies internal consistency of a hash chain array.
  - `verify_saved_chain()`: Validates that the saved chain is intact AND identical to the current `provenance_logs.json` on disk. Returns boolean status.
  - `demonstrate_tampering()`: In-memory simulation modifying an event payload to demonstrate guaranteed cryptographic failure.

---

## 2. Graph & Impact Analysis Modules

### 2.1 `neo4j_schema.py` & `neo4j_loader.py` — Knowledge Graph Engine
- **Purpose:** Manages schema creation, uniqueness constraints, and event ingestion into Neo4j (`proofmesh` database).
- **Key Functions & Classes:**
  - `Neo4jSchema.create_constraints()`: Enforces uniqueness on `(a:Agent).agent_id`, `(t:Tool).tool_id`, `(s:DataSource).source_id`, and `(d:Decision).decision_id`.
  - `Neo4jProvenanceLoader.run()`: Reads `provenance_logs.json` and creates:
    - `:Agent` nodes with model and environment properties.
    - `:Tool` nodes linked via `[:USED_TOOL]`.
    - `:DataSource` nodes linked via `[:RETRIEVED_FROM]`.
    - `:Decision` nodes linked via `[:INFLUENCED]` and `[:MADE_DECISION]`.

### 2.2 `impact_analysis.py` — Dependency Traversal & Blast-Radius Engine
- **Purpose:** Performs directed graph traversal to trace downstream decision dependencies when a data source or tool is suspected of contamination.
- **Key Functions & Classes:**
  - `load_graph(driver)`: Queries Neo4j for nodes and relationships. Seamlessly falls back to `_build_fallback_graph()` when Neo4j is offline.
  - `find_start_node(nodes, node_type, node_id)`: Locates the target entity across valid identifier properties.
  - `traverse_dependencies(start_id, nodes, edges)`: Implements Breadth-First Search (BFS) to identify all reachable downstream nodes and filter specifically for `:Decision` nodes.
  - `analyze(driver, node_type, node_id, unreliable, check_integrity)`: Coordinates traversal, executes chain verification for source attribution, flags decisions if marked unreliable, and saves a JSON report in `impact_reports/`.

---

## 3. Trust & Governance Modules

### 3.1 `trust_assessment.py` — Rule-Based Multi-Factor Trust Scorer
- **Purpose:** Calculates deterministic, objective trust scores ($0.0$ to $100.0$) evaluating execution authenticity.
- **Mathematical Model:**
  $$T = w_S \cdot S + w_P \cdot P + w_I \cdot I = 0.40 \cdot S + 0.30 \cdot P + 0.30 \cdot I$$
  - **Source Reliability ($S$):** Evaluates metadata flags, known authoritative origin, and absence of unreliable tags ($0$ to $100$).
  - **Provenance Completeness ($P$):** Evaluates presence of mandatory lifecycle stages (`MODEL_DETAILS`, `LLM_CALL_START`, `TOOL_START`, `TOOL_END`, `EVIDENCE_CAPTURED`, `LLM_CALL_END`, `INTERMEDIATE_DECISION`, `DECISION`). Deducts points for missing phases.
  - **Integrity Verification ($I$):** $100$ if SHA-256 hash chain and live log verify perfectly; $0$ if any tampering or hash mismatch is detected.
- **Categorization:** High ($\ge 85$), Moderate ($70 \le T < 85$), Low ($< 70$).

---

## 4. Authentication, Database & Security Modules

### 4.1 `auth/models.py` — Declarative Relational Models
- **`User`:** User accounts, unique `username` and `email`, cryptographic `password_hash`, `role` (`admin`/`user`), `is_active`, `full_name`, and `created_at`.
- **`Workflow`:** User workflow executions, `workflow_id`, `status` (`pending`, `running`, `completed`, `failed`), `started_at`, `completed_at`, `execution_duration`, `error_message`, and JSON `results_summary`.
- **`Report`:** Generated audit artifacts, `report_id`, `report_type`, `report_name`, and canonical `safe_file_reference`.
- **`Upload`:** Customer-submitted dataset metadata, `upload_id`, `original_filename`, `file_type`, `total_events`, `total_agents`, `processing_status`, and `validation_summary`.
- **`RevokedToken`:** Server-side invalidated JWT tokens (`token_hash`, `user_id`, `revoked_at`, `expires_at`). Indexed by `token_hash` and `expires_at` for high-throughput lookup.
- **`PasswordResetToken`:** Cryptographically hashed single-use recovery tokens (`token_hash`, `user_id`, `role_scope`, `created_at`, `expires_at`, `used_at`). Binds recovery tokens strictly to either `'user'` or `'admin'` scope to prevent cross-role privilege abuse.

### 4.2 `auth/email_service.py` — Enterprise Email Dispatcher & Recovery Service
- **Purpose:** Dispatches password reset emails for user and administrator accounts via multiple production engines with automatic fallback.
- **Engines:**
  - **SMTP Engine:** Port 587 (STARTTLS) or Port 465 (SSL/TLS) supporting Gmail App Passwords, SendGrid, Brevo, AWS SES, and custom SMTP servers.
  - **Resend REST API Engine:** HTTPS port 443 dispatch using native `urllib.request` (free-tier cloud friendly, zero port throttling).
  - **Development Mode:** Safe masked console logging for automated testing and local developer environments.
- **Key Functions:**
  - `get_email_config()`: Resolves and normalizes SMTP and Resend environment variables.
  - `send_password_reset_email(to_email, raw_token, role_scope, expires_minutes)`: Generates branded HTML and plain-text emails, renders reset links, and dispatches via the active engine.

### 4.3 `auth/db_session.py` — Database Engine & Session Management
- **Production Strictness:** In production (`ENVIRONMENT=production`), PostgreSQL is strictly required; connection failures raise fatal exceptions to prevent silent fallback to SQLite.
- **Development Support:** In local development mode, falls back to local SQLite (`auth/users.db`) with identical schema definitions when PostgreSQL is offline.
- **Context Management:** `get_db_session()` provides atomic commit/rollback session management with connection pre-ping.

### 4.3 `auth/security.py` — Cryptographic Password, JWT & Rate Limiting
- **Password Hashing:** Standard-library PBKDF2-SHA256 (`260,000` iterations) with automatic Passlib fallback supporting existing Argon2 and BCrypt hashes.
- **Password Strength:** `validate_password_strength()` enforces 8–128 character length, uppercase, lowercase, numbers, and special symbols.
- **JWT Secret Resolution:** `resolve_jwt_secret()` enforces $\ge 32$-character non-placeholder secrets in production, failing fast on misconfiguration.
- **Token Security:** PyJWT generating HS256 signed tokens with 60-minute expiration and cryptographically unique `jti` nonces.
- **Revocation Checking:** `get_current_user` inspects the `revoked_tokens` table; revoked tokens are immediately rejected with HTTP 401.
- **Rate Limiting:** `InMemoryRateLimiter` enforces sliding-window IP limits (10 req/min for login, 5 req/min for registration).

### 4.4 `auth/auth_routes.py` — Authentication & User Management Endpoints
- **`POST /api/auth/register`:** User registration with password complexity enforcement, rate limiting, and standard role assignment.
- **`POST /api/auth/login`:** OAuth2 password grant with rate limiting and constant-time password verification.
- **`POST /api/auth/logout`:** Server-side logout revoking current JWT hash.
- **`GET /api/auth/me`:** Returns authenticated user profile (password hash omitted).
- **`GET /api/auth/admin/users`:** Admin-only listing of registered accounts.
- **`PATCH /api/auth/admin/users/{id}/status`:** Admin-only account activation/deactivation (prevents self-lockout).

---

## 5. Datasets & Ingestion Engine (`datasets_engine/`)

### 5.1 `generator.py` — Synthetic Provenance Generator
- **10 Controlled Profiles:**
  1. `normal_execution`: Complete 8-stage benchmark trace.
  2. `multi_agent_execution`: Coordinated planner, researcher, auditor, executor agents.
  3. `missing_provenance`: Omitted intermediate evidence steps.
  4. `unreliable_source`: Low-reliability source attribution.
  5. `tool_failure`: Tool timeout and error propagation.
  6. `integrity_tampering`: Deliberately modified payload with mismatched hash.
  7. `conflicting_evidence`: Disparate assertions from conflicting data sources.
  8. `incomplete_execution`: Abruptly aborted agent trace.
  9. `large_workflow`: Multi-workflow high-volume batch execution.
  10. `mixed_execution`: Realistic distribution of successes and retries.
- **Seed Reproducibility:** Fixed seeds produce deterministic event sequences and hash chains.

### 5.2 `validator.py` — Schema & Causal Continuity Validator
- Evaluates dataset payloads against schema rules, missing fields, duplicate event IDs, chronological timestamp order, and causal sequence validity (`TOOL_END` following `TOOL_START`, `DECISION` following `EVIDENCE_CAPTURED`). Computes completeness score ($0$ to $100\%$).

### 5.3 `benchmarks.py` — Scale Performance Benchmarks
- Profiles memory consumption (`tracemalloc`) and execution latency (`time.perf_counter`) across 100, 1,000, and 10,000 synthetic events, measuring throughput (events/second).

---

## 6. Frontend Architecture (`frontend/src/`)

- **Pages (14 total):** `Overview`, `WorkflowExplorer`, `CreateWorkflow`, `WorkflowHistory`, `IntegrityCenter`, `TrustAnalytics`, `ImpactAnalysis`, `DataSources`, `SystemHealth`, `UploadCenter`, `AgentDataExplorer`, `Reports`, `Settings`, `AdminDashboard`.
- **Reusable Components:** `PageHeader`, `EmptyState`, `ErrorState`, `LoadingState`, `StatusBadge`, `StatCard`, `ConfirmationDialog`, `TrustGauge`, `WorkflowGraph`, `Sidebar`, `Topbar`.
- **Design System (`App.css`):** CSS variable themes (`:root[data-theme="dark"]` and `:root[data-theme="light"]`), 38px standardized interactive button heights, responsive flex/grid wrappers, and zero-overlap layout.

