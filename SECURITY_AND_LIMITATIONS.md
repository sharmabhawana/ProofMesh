# ProofMesh — Security Architecture, Hygiene & System Limitations

---

## 1. Security Architecture & Threat Mitigation Matrix

| Threat Category | Potential Attack Vector | ProofMesh Defense Implementation | Verification Status |
|---|---|---|---|
| **Credential Theft** | Database dump revealing user passwords | Passwords stored as PBKDF2-SHA256 digests (`260,000` iterations) with unique cryptographic salts. Passlib integration also supports Argon2id and BCrypt. Plaintext passwords are never persisted. | **VERIFIED (PASS)** |
| **Weak Passwords** | Dictionary & brute-force guessing | Strict password complexity enforcement via `validate_password_strength()` requiring 8–128 characters, uppercase, lowercase, numbers, and special symbols. | **VERIFIED (PASS)** |
| **API Hash Leakage** | Profiling endpoints leaking password digests in JSON | Public serialization schemas (`User.to_dict()`) strictly exclude `password_hash`. Verified across all registration, login, profile, and admin user listing endpoints. | **VERIFIED (PASS)** |
| **JWT Secret Forgery** | Weak or hardcoded JWT secret exploited to forge tokens | `resolve_jwt_secret()` enforces $\ge 32$-character non-placeholder secrets in production (`ENVIRONMENT=production`) with startup termination on misconfiguration. In development, ephemeral 256-bit keys are generated. | **VERIFIED (PASS)** |
| **Session Hijacking / Zombie Tokens** | Stolen or unexpired JWT access tokens used after logout | Server-side token revocation (`revoked_tokens` table) with `POST /api/auth/logout`. Every JWT contains a cryptographically unique `jti` nonce. Protected routes verify token revocation status before accepting requests. | **VERIFIED (PASS)** |
| **Credential Stuffing / Brute-Force** | Rapid dictionary attacks against login and registration | Sliding-window `InMemoryRateLimiter` restricts authentication attempts (10 requests/min for login, 5 requests/min for registration) based on client IP. | **VERIFIED (PASS)** |
| **Silent Production Failure** | SQLite fallback silently hiding PostgreSQL downtime in cloud | In `production` mode, SQLite fallback is completely disabled; unreachable PostgreSQL databases trigger a fail-safe fatal exception rather than creating split-brain state. | **VERIFIED (PASS)** |
| **CORS Wildcard Exploit** | Malicious origins reading credentialed responses | `main.py` parses `CORS_ORIGINS` dynamically from environment variables, strictly rejecting wildcard `*` with credentialed requests per W3C CORS security specifications. | **VERIFIED (PASS)** |
| **Path Traversal** | Malicious filenames (`../../etc/passwd`) in downloads/uploads | `routers/reports.py` and `routers/uploads.py` enforce strict canonical path validation with `Path.resolve()`, ensuring requested paths reside strictly within `ALLOWED_STORAGE_ROOTS`. Non-canonical references are rejected with HTTP 400. | **VERIFIED (PASS)** |
| **Zip Slip Exploit** | Archive extraction containing parent-directory escapes | ZIP extraction in `routers/uploads.py` inspects each archive member, checking `os.path.isabs` and forbidding `..` segments prior to writing to disk. | **VERIFIED (PASS)** |
| **SQL Injection** | Malicious string interpolation in database queries | 100% of database interactions utilize SQLAlchemy ORM parameterized queries with bound parameters. Zero dynamic string formatting is utilized in SQL calls. | **VERIFIED (PASS)** |
| **Denial of Service** | Oversized file ingestion exhausting memory | Hard 25 MB payload limit enforced on all multipart upload endpoints. File streams are chunk-processed with streaming buffer limits. | **VERIFIED (PASS)** |
| **Admin Self-Lockout** | Administrator accidentally disabling their own active flag | `auth/auth_routes.py` inspects the target user ID against the token subject claim and forbids an administrator from deactivating their own account. | **VERIFIED (PASS)** |
| **History Tampering** | Adversary modifying an agent execution record on disk | Bidirectional SHA-256 hash chaining. Modifying a single character in `provenance_logs.json` invalidates downstream digests and fails integrity audits. | **VERIFIED (PASS)** |

---

## 2. Authentication & Authorization Security Deep Dive

### 2.1 Password Hashing & Complexity Policy
- **Hashing Algorithm:** PBKDF2 with HMAC-SHA256, 260,000 rounds, and a 16-byte random salt per user.
- **Legacy Verification Support:** Built-in Passlib context supports verification of legacy Argon2 and BCrypt hashes without forcing password resets.
- **Complexity Enforcement:**
  - Length: Minimum 8 characters, maximum 128 characters.
  - Character Classes: Must contain at least one uppercase letter (`[A-Z]`), one lowercase letter (`[a-z]`), one numeric digit (`[0-9]`), and one special character (`[!@#$%^&*()_\-+=...]`).
- **Timing Side-Channel Protection:** Password verification incorporates dummy HMAC comparisons when identifiers do not exist, eliminating timing leaks that reveal whether an account exists.

### 2.2 JWT Lifecycle & Token Revocation
- **Signing Algorithm:** HMAC-SHA256 (`HS256`).
- **Token Claims:** `sub` (user primary key ID), `jti` (unique 16-byte hexadecimal nonce), `iat` (issued-at timestamp), and `exp` (expiration timestamp set to 60 minutes).
- **Server-Side Invalidation:** Upon invoking `POST /api/auth/logout`, the SHA-256 hash of the token is recorded in the `revoked_tokens` table. FastAPI dependency `get_current_user` performs an $O(1)$ indexed lookup to immediately reject revoked tokens with HTTP 401 Unauthorized.

### 2.3 Role-Based Access Control (RBAC)
- **Roles:** `user` (default) and `admin`.
- **Privilege Separation:**
  - Standard users can only view their owned workflows, reports, and dataset uploads.
  - Privilege escalation attempts during registration (`"role": "admin"`) are rejected or sanitized to `user`.
  - Administrative routes (`GET /api/auth/admin/users`, `PATCH /api/auth/admin/users/{id}/status`) strictly require `require_admin` dependency.
  - Administrators are prevented from disabling their own accounts.

### 2.4 Single-Use Password Reset Tokens & Enumeration Prevention
- **Cryptographic Token Generation:** Generates 32-byte URL-safe cryptographic tokens (`secrets.token_urlsafe(32)`).
- **Zero Raw Token Persistence:** The backend only stores the SHA-256 hash of the token (`token_hash`) in `password_reset_tokens`; raw tokens are never persisted in the database.
- **Strict Expiration:** Reset tokens expire automatically after 15 minutes (`expires_at`).
- **Single-Use Enforcement:** Upon successful consumption, `used_at` timestamp is written and previous unused tokens for the same user are invalidated, preventing replay attacks.
- **Anti-Enumeration Safeguards:** `POST /api/auth/forgot-password` unconditionally returns HTTP 200 with identical generic messaging regardless of whether the email is present in the database, preventing username/email discovery.
- **Rate Limiting:** IP-based rate limiting (5 requests per 60 seconds) prevents denial-of-service or email-bombing attacks.
- **Configurable Delivery:** Dispatches links via standard TLS-encrypted SMTP in production; falls back to secure developer console logging in local development.

---

## 3. Explicit System Limitations & Honest Scope Boundaries

In accordance with academic rigor, the following boundaries and limitations must be clearly understood:

### 3.1 Cryptographic Immutability vs Factual Truth
- **What Cryptography Guarantees:** ProofMesh's SHA-256 hash chain mathematically guarantees that a logged event sequence has not been modified, reordered, deleted, or inserted post-generation.
- **What Cryptography Does NOT Guarantee:** Cryptographic hashing does **not** verify the factual accuracy, truthfulness, or legal validity of an external data source. If an agent queries an inaccurate external document, the system accurately records that the agent retrieved inaccurate text; it does not turn falsehood into truth.

### 3.2 LLM Hallucination vs Provenance Accountability
- ProofMesh significantly mitigates agent hallucination by grounding responses in controlled knowledge bases (`knowledge_lookup` tool) and tracking evidence. However, because generative models are probabilistic, hallucination can still occur. ProofMesh provides **verifiable accountability** (proving exactly what prompt and evidence produced the hallucination) rather than mathematical prevention of all generative errors.

### 3.3 Trust Score Interpretation
- The ProofMesh Trust Score ($T = 0.40S + 0.30P + 0.30I$) is a **rule-based, deterministic governance metric**. It is designed for compliance scoring, policy enforcement, and relative risk classification. It must **not** be interpreted as a Bayesian posterior probability that an answer is correct.

### 3.4 Knowledge Graph Availability
- Live property graph queries rely on a running Neo4j instance. When Neo4j is offline or inaccessible, ProofMesh seamlessly serves the workflow graph and impact analysis from local provenance ledgers. Real-time Cypher mutations require the Neo4j daemon to be active.

---

## 4. Recommended Future Roadmap

1. **Zero-Knowledge Provenance (zk-SNARKs):** Enable agents to cryptographically prove that a decision complied with verified policy rules without disclosing sensitive prompt context or proprietary weights.
2. **Decentralized Ledger Anchoring:** Anchor periodic SHA-256 chain heads onto public distributed ledgers (Ethereum, Solana, or IPFS) to prevent collusive local root modifications.
3. **Multi-Agent Asymmetric Signatures:** Implement Ed25519 digital signature pairs per agent to enforce cryptographic non-repudiation across multi-agent swarms.
4. **Distributed Cache for Token Revocation:** Integrate Redis for ultra-high-throughput microsecond token revocation checks across distributed clusters.
