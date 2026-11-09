# ProofMesh — Final Academic Review Presentation (PPT) Blueprint

This document provides a slide-by-slide structure, talking points, and screenshot guidance for your Final Academic Review Presentation (PPT).

---

## Slide 1: Title Slide
- **Title:** ProofMesh: Cryptographically Verifiable Provenance and Trust Framework for Autonomous AI Agents
- **Subtitle:** Final Year B.Tech / M.Tech Capstone Project Defense
- **Presenter:** Bhawana Sharma
- **Department:** Computer Science & Engineering
- **Date & Academic Year:** November 2026 | Session 2026–2027

---

## Slide 2: Problem Statement & Motivation
- **Context:** Autonomous agentic AI systems (LangChain, AutoGen, CrewAI) are rapidly being deployed to take autonomous actions in finance, healthcare, legal compliance, and critical infrastructure.
- **The Core Issue:** Traditional AI models are "black boxes". Autonomous agents dynamically select external tools, retrieve arbitrary web data, and execute consequential decisions without an immutable audit trail.
- **Consequences:** Hallucinated evidence, unverified third-party tool responses, lack of accountability, and inability to determine which decisions are compromised when a data source fails.

---

## Slide 3: Research Gap & Objectives
- **Existing Limitations:**
  - Standard logging is mutable and easily tampered with.
  - LLM benchmarks evaluate prompt output, not tool/data lineage.
  - Lack of causal graph models linking agent deliberation to specific decisions.
- **ProofMesh Objectives:**
  1. Capture an 8-stage observable AI agent provenance taxonomy.
  2. Implement tamper-evident cryptographic SHA-256 hash chaining.
  3. Model causal dependencies in a property knowledge graph (Neo4j / React Flow).
  4. Formulate a multi-factor rule-based trust assessment model ($T = 0.40S + 0.30P + 0.30I$).
  5. Provide Breadth-First Search (BFS) blast-radius impact analysis.
  6. Deliver an enterprise-grade full-stack dashboard with multi-format log ingestion.

---

## Slide 4: Proposed Solution & System Overview
- **Core Concept:** An end-to-end framework that sits as an observational governance wrapper around autonomous agents.
- **Key Innovations:**
  - *Zero-Overhead Interception:* LangChain `BaseCallbackHandler` hooks.
  - *Mathematical Immutability:* RFC 8785 canonical JSON serialization + SHA-256 chaining.
  - *Causal Lineage:* Directed acyclic graph mapping Agents $\rightarrow$ Tools $\rightarrow$ DataSources $\rightarrow$ Decisions.
  - *Actionable Governance:* Objective trust scoring and blast-radius tracing.

---

## Slide 5: System Architecture & Technology Stack
- **Architecture Diagram:** Multi-tier architectural flow (Client UI $\rightarrow$ FastAPI Gateway $\rightarrow$ LangChain + Gemini Engine $\rightarrow$ Persistence).
- **Technology Stack:**
  - *Frontend:* React 19, Vite, `@xyflow/react` (React Flow), Recharts, Lucide React.
  - *Backend API:* FastAPI, Uvicorn ASGI, Pydantic v2.
  - *AI Framework:* LangChain Core, Google Gemini (`gemini-3.5-flash-lite`).
  - *Persistence:* PostgreSQL 16 (SQLAlchemy ORM) with local SQLite fallback; Neo4j Property Graph.
  - *Cryptography:* SHA-256 hash chains with RFC 8785 canonical serialization.

---

## Slide 6: The 8-Stage Observable Provenance Taxonomy
- **Lifecycle Diagram:**
  $$\text{Model Details} \rightarrow \text{LLM Start} \rightarrow \text{Tool Start} \rightarrow \text{Tool End} \rightarrow \text{Evidence Captured} \rightarrow \text{LLM End} \rightarrow \text{Intermediate Decision} \rightarrow \text{Final Decision}$$
- **Key Attributes Captured:** Unique UUIDv4 `event_id`, UTC timestamp, agent ID, model name/version, serialized inputs/outputs, and tool metadata.

---

## Slide 7: Cryptographic Hash Chain & Tampering Detection
- **Mathematical Construction:**
  $$H_0 = \text{SHA-256}(\text{GENESIS\_HASH} \parallel \text{Canonical}(E_0))$$
  $$H_i = \text{SHA-256}(H_{i-1} \parallel \text{Canonical}(E_i)) \quad \text{for } i \ge 1$$
- **Tampering Detection Mechanism:** Bidirectional verification compares physical event logs with saved chain hashes. Modifying a single character invalidates the chain head immediately.
- *Recommended Visual:* Terminal screenshot of `test_log_tampering.py` demonstrating `Tampering detected: YES | PASS`.

---

## Slide 8: Knowledge Graph & Causal Lineage
- **Graph Schema:**
  - Node Labels: `:Agent`, `:Tool`, `:DataSource`, `:Decision`.
  - Relationships: `[:USED_TOOL]`, `[:RETRIEVED_FROM]`, `[:INFLUENCED]`, `[:MADE_DECISION]`.
- **Hierarchical Layout:** 4-column zero-overlap layout in React Flow.
- *Recommended Visual:* Screenshot of `WorkflowExplorer.jsx` showing the interactive node graph.

---

## Slide 9: Multi-Factor Rule-Based Trust Scoring
- **The Formula:**
  $$T = 0.40 \cdot S + 0.30 \cdot P + 0.30 \cdot I$$
- **Weights & Justification:**
  - $S$ = Source Reliability ($40\%$): Evaluates authenticity and metadata flags of evidence sources.
  - $P$ = Provenance Completeness ($30\%$): Evaluates coverage across the 8 lifecycle stages.
  - $I$ = Cryptographic Integrity ($30\%$): Binary $100$ or $0$ depending on hash chain validity.
- **Categorization:** High ($T \ge 85$), Moderate ($70 \le T < 85$), Low ($T < 70$).
- *Recommended Visual:* Screenshot of `TrustAnalytics.jsx` showing the semi-circular gauge ($100.0/100$) and formula card.

---

## Slide 10: Dependency-Based Impact Analysis (Blast-Radius)
- **Algorithm:** Directed Breadth-First Search (BFS) graph traversal.
- **Use Case:** When a data source is identified as contaminated or revoked, impact analysis traces all downstream dependencies to identify potentially compromised decisions.
- **Simulation Mode:** Explicit `--unreliable` simulation flag to evaluate hypothetical cascading failures.
- *Recommended Visual:* Screenshot of `ImpactAnalysis.jsx` showing the 2 affected decisions.

---

## Slide 11: Enterprise Dashboard & Ingestion Engine
- **14 Unified Pages:** Overview, Workflow Explorer, Create Workflow, History, Integrity Center, Trust Analytics, Impact Analysis, Data Sources, System Health, Upload Center, Agent Explorer, Reports, Settings, Admin Dashboard.
- **Multi-Format Upload:** Supports JSON, JSONL, CSV, TXT, and ZIP with snapshot hashing.
- **Synthetic Datasets:** 10 controlled scenario profiles for reproducible experimentation.
- *Recommended Visual:* Screenshot of `Overview.jsx` and `UploadCenter.jsx`.

---

## Slide 12: Empirical Performance & Scalability Benchmarks
- **Measured Empirical Results:**
  - Small ($100$ events): $13.02$ ms latency | $0.158$ MB RAM | $7,678$ events/sec.
  - Medium ($1,000$ events): $127.49$ ms latency | $1.496$ MB RAM | $7,843$ events/sec.
  - Large ($10,000$ events): $1,659.91$ ms latency | $15.02$ MB RAM | $6,024$ events/sec.
- **Key Takeaway:** Total cryptographic overhead for standard agent execution is $<3$ ms ($<0.1\%$ of LLM inference time).
- *Recommended Visual:* Latency vs Event Scale bar chart from `PERFORMANCE_EVALUATION.md`.

---

## Slide 13: Testing Methodology & Verification Results
- **Automated Test Matrix (100% Pass):**
  - Database & RBAC Suite: $25/25$ PASS.
  - Complete System Suite: $25/25$ PASS.
  - Workflows & Uploads Suite: $9/9$ PASS.
  - Datasets Engine Suite: $4/4$ Groups PASS.
  - Tampering & Reliability Suites: $100\%$ PASS.
- *Recommended Visual:* Terminal screenshot showing `ALL TESTS PASSED`.

---

## Slide 14: Security Hygiene & Academic Scope Boundaries
- **Security Protections:** PBKDF2/Argon2/BCrypt hashing, path-traversal whitelisting, Zip Slip defense, SQL injection prevention, admin self-lockout protection.
- **Honest Limitations:**
  - Immutability $\ne$ Factual Truth: Cryptography proves historical events occurred without alteration; it does not turn external falsehood into truth.
  - Trust score is a deterministic compliance metric, not a Bayesian probability of truth.

---

## Slide 15: Conclusion & Future Scope
- **Key Contributions:** Delivered a complete, verified, and demonstrably scalable governance framework for autonomous AI agents.
- **Future Work:**
  1. Zero-Knowledge Proofs (zk-SNARKs) for private verification without disclosing proprietary prompts.
  2. Decentralized public ledger anchoring (Ethereum / Solana / IPFS).
  3. Ed25519 asymmetric signature handshakes for multi-agent swarm swarms.
- **Closing Statement:** ProofMesh provides the verifiable foundation necessary for safe, auditable, and trustworthy autonomous agent deployment.

---

## 3. Recommended Screenshots Checklist for PPT Slides

1. **Dashboard Overview:** `http://localhost:5173/#/overview` (Light and Dark theme comparison).
2. **AI Workflow Execution:** `http://localhost:5173/#/create-workflow` (Showing the 8-stage provenance timeline).
3. **Interactive Knowledge Graph:** `http://localhost:5173/#/workflow` (React Flow 4-column graph).
4. **Integrity Verification:** `http://localhost:5173/#/integrity` (Green verified banner and hash records).
5. **Trust Analytics Gauge:** `http://localhost:5173/#/trust` (100.0/100 gauge and component contribution chart).
6. **Impact Analysis Blast-Radius:** `http://localhost:5173/#/impact` (Listing the 2 affected decisions).
7. **Agent Data Explorer:** `http://localhost:5173/#/agent-explorer` (Event trace table and raw JSON modal).
8. **Automated Test Results:** PowerShell terminal running `test_complete_validation.py` (Showing 25/25 PASS).

