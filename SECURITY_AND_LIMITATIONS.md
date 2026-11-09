# ProofMesh — Security Architecture, Hygiene & System Limitations

---

## 1. Security Architecture & Threat Mitigation Matrix

| Threat Category | Potential Attack Vector | ProofMesh Defense Implementation | Verification Status |
|---|---|---|---|
| **Credential Theft** | Database dump revealing user passwords | Passwords stored as PBKDF2-SHA256 digests (`260,000` iterations) with unique cryptographic salts. Passlib integration also supports Argon2id and BCrypt. Plaintext passwords are never persisted. | **VERIFIED (PASS)** |
| **API Hash Leakage** | Profiling endpoints leaking password digests in JSON | Public serialization schemas (`User.to_dict()`) strictly exclude `password_hash`. Verified across all registration, login, profile, and admin user listing endpoints. | **VERIFIED (PASS)** |
| **Path Traversal** | Malicious filenames (`../../etc/passwd`) in downloads/uploads | `routers/reports.py` and `routers/uploads.py` enforce strict canonical path validation with `Path.resolve()`, ensuring requested paths reside strictly within `ALLOWED_STORAGE_ROOTS`. Non-canonical references are rejected with HTTP 400. | **VERIFIED (PASS)** |
| **Zip Slip Exploit** | Archive extraction containing parent-directory escapes | ZIP extraction in `routers/uploads.py` inspects each archive member, checking `os.path.isabs` and forbidding `..` segments prior to writing to disk. | **VERIFIED (PASS)** |
| **SQL Injection** | Malicious string interpolation in database queries | 100% of database interactions utilize SQLAlchemy ORM parameterized queries with bound parameters. Zero dynamic string formatting is utilized in SQL calls. | **VERIFIED (PASS)** |
| **Session Hijacking** | Forged or modified access tokens | Statistically unique JWT secrets (`JWT_SECRET_KEY`) signing tokens via HMAC-SHA256 (`HS256`). Tokens enforce a strict 60-minute expiration window. | **VERIFIED (PASS)** |
| **Denial of Service** | Oversized file ingestion exhausting memory | Hard 25 MB payload limit enforced on all multipart upload endpoints. File streams are chunk-processed with streaming buffer limits. | **VERIFIED (PASS)** |
| **Admin Self-Lockout** | Administrator accidentally disabling their own active flag | `auth/auth_routes.py` inspects the target user ID against the token subject claim and forbids an administrator from deactivating their own account. | **VERIFIED (PASS)** |
| **History Tampering** | Adversary modifying an agent execution record on disk | Bidirectional SHA-256 hash chaining. Modifying a single character in `provenance_logs.json` invalidates downstream digests and fails integrity audits. | **VERIFIED (PASS)** |

---

## 2. Explicit System Limitations & Honest Scope Boundaries

In accordance with academic rigor, the following boundaries and limitations must be clearly understood:

### 2.1 Cryptographic Immutability vs Factual Truth
- **What Cryptography Guarantees:** ProofMesh's SHA-256 hash chain mathematically guarantees that a logged event sequence has not been modified, reordered, deleted, or inserted post-generation.
- **What Cryptography Does NOT Guarantee:** Cryptographic hashing does **not** verify the factual accuracy, truthfulness, or legal validity of an external data source. If an agent queries an inaccurate external document, the system accurately records that the agent retrieved inaccurate text; it does not turn falsehood into truth.

### 2.2 LLM Hallucination vs Provenance Accountability
- ProofMesh significantly mitigates agent hallucination by grounding responses in controlled knowledge bases (`knowledge_lookup` tool) and tracking evidence. However, because generative models are probabilistic, hallucination can still occur. ProofMesh provides **verifiable accountability** (proving exactly what prompt and evidence produced the hallucination) rather than mathematical prevention of all generative errors.

### 2.3 Trust Score Interpretation
- The ProofMesh Trust Score ($T = 0.40S + 0.30P + 0.30I$) is a **rule-based, deterministic governance metric**. It is designed for compliance scoring, policy enforcement, and relative risk classification. It must **not** be interpreted as a Bayesian posterior probability that an answer is correct.

### 2.4 Knowledge Graph Availability
- Live property graph queries rely on a running Neo4j instance. When Neo4j is offline or inaccessible, ProofMesh seamlessly serves the workflow graph and impact analysis from local provenance ledgers. Real-time Cypher mutations require the Neo4j daemon to be active.

---

## 3. Recommended Future Roadmap

1. **Zero-Knowledge Provenance (zk-SNARKs):** Enable agents to cryptographically prove that a decision complied with verified policy rules without disclosing sensitive prompt context or proprietary weights.
2. **Decentralized Ledger Anchoring:** Anchor periodic SHA-256 chain heads onto public distributed ledgers (Ethereum, Solana, or IPFS) to prevent collusive local root modifications.
3. **Multi-Agent Asymmetric Signatures:** Implement Ed25519 digital signature pairs per agent to enforce cryptographic non-repudiation across multi-agent swarms.

