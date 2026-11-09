# ProofMesh — Google Gemini Model Evaluation Report

**Evaluation Date**: 2026-11-05 13:55:55 UTC  
**Model Under Test**: `gemini-3.5-flash-lite`  
**Provider / Integration**: Google Gemini via LangChain (`langchain_google_genai`)  
**Evaluation Scope**: 10 Independent Autonomous AI Reasoning & Provenance Competency Cases  
**Pass Rate**: **100.0% (10/10 passed)**  
**Average Latency**: **16179.32 ms**  

---

## Evaluation Summary Matrix

| Case ID | Category | Expected Capability | Status | Latency (ms) |
|---|---|---|---|---|
| **CASE-01** | Factual Explanation | Must mention hashing (or cryptographic digest), chaining (previous hash linkage), and tamper-evidence. | ✅ PASS | 6918.96 ms |
| **CASE-02** | Technical Reasoning | Must explain collision resistance/one-way property or order dependency of inputs in hash concatenation. | ✅ PASS | 37251.88 ms |
| **CASE-03** | Multi-Step Reasoning | Must compute reduction from 100 to 5 rows as 95% reduction with clear steps. | ✅ PASS | 1703.4 ms |
| **CASE-04** | Structured JSON Generation | Must parse as valid JSON containing agent_id, action, confidence, and approved keys. | ✅ PASS | 9277.63 ms |
| **CASE-05** | Data Extraction | Must correctly extract AlphaAudit, gemini-3.5-flash, and 432ms. | ✅ PASS | 17490.39 ms |
| **CASE-06** | Summarization | Must summarize AI provenance/trust/auditing accurately. | ✅ PASS | 1695.0 ms |
| **CASE-07** | Technology Comparison | Must contrast graph traversal/relationships (Neo4j) vs relational joins/schema (PostgreSQL). | ✅ PASS | 22435.74 ms |
| **CASE-08** | Evidence Evaluation | Must classify as low trust and explain lack of verification or unauthenticated origin. | ✅ PASS | 32975.3 ms |
| **CASE-09** | Uncertainty Handling | Must answer No/negative and distinguish ledger integrity (unaltered data) from external factual truth. | ✅ PASS | 30930.4 ms |
| **CASE-10** | Unsupported-Information Detection | Must answer No and explain that administrator identity is not provided. | ✅ PASS | 1114.55 ms |

---

## Detailed Test Cases and Observable Outputs

### CASE-01 — Factual Explanation
- **Prompt**: "Explain what a cryptographic hash chain is and how it guarantees tamper-evident provenance in 2 concise sentences."
- **Evaluation Criteria**: Must mention hashing (or cryptographic digest), chaining (previous hash linkage), and tamper-evidence.
- **Status**: **PASS** (Latency: 6918.96 ms)
- **Model Output**:
```text
A cryptographic hash chain is a sequence of data blocks where each block contains the cryptographic hash of the preceding block, binding them together chronologically. Because altering any single block changes its hash and invalidates every subsequent block, the chain guarantees tamper-evident provenance by immediately exposing any unauthorized modifications.
```

---
### CASE-02 — Technical Reasoning
- **Prompt**: "Given two SHA-256 event digests H1 and H2, explain why computing H3 = SHA256(H2 + H1) creates a directed chronological dependency."
- **Evaluation Criteria**: Must explain collision resistance/one-way property or order dependency of inputs in hash concatenation.
- **Status**: **PASS** (Latency: 37251.88 ms)
- **Model Output**:
```text
Computing the hash **$H_3 = \text{SHA256}(H_2 + H_1)$** (where $+$ denotes concatenation) creates a directed chronological dependency primarily due to the cryptographic properties of hash functions, combined with the specific ordering of the inputs. 

Here is the step-by-step breakdown of why this creates a strict, irreversible time-based relationship:

### 1. The Pre-image Resistance (Arrow of Time)
SHA-256 is a one-way cryptographic hash function. Given an output hash ($H_3$), it is computationally infeasible to determine the inputs ($H_2$ and $H_1$) that generated it. 
* Because $H_3$ is mathematically derived from $H_2$ and $H_1$, **$H_3$ can only exist *after* both $H_2$ and $H_1$ have already been created.** 
* This establishes an absolute chronological order: $H_1$ and $H_2$ are in the past; $H_3$ is in the present/future.

### 2. The Strict Ordering of Inputs ($H_2$ then $H_1$)
Concatenation is not commutative ($A + B \neq B + A$). By defining the operation as $H_2 + H_1$ (rather than $H_1 + H_2$), you enforce a specific sequence:
* **$H_1$ must precede $H_2$ in the causal chain:** For $H_2$ to exist, it must have depended on some prior event (likely $H_1$, assuming a standard blockchain-style chaining where $H_2 = \text{SHA256}(X + H_1)$). 
* Therefore, $H_3$ encapsulates the state of $H_2$, which in turn encapsulates the state of $H_1$. 

### 3. The Avalanche Effect (Tamper-Evident Linking)
SHA-256 exhibits the "avalanche effect," meaning changing even a single bit in $H_1$ or $H_2$ results in a completely unrecognizable $H_3$. 
* Because $H_3$ cryptographically binds $H_2$ and $H_1$ together in
 a specific order, **$H_3$ acts as a seal of the past.** 
* If anyone attempts to alter $H_1$ or alter the chronological order of the events, the resulting $H_3$ will radically change. 

### Summary: The Directed Dependency
In computer science and cryptography (such as in blockchains, Merkle trees, or audit logs), this creates a **Directed Acyclic Graph (DAG)** or a linear chain. 

* **Directed:** $H_3$ points backward to validate $H_2$ and $H_1$, establishing a parent-child relationship. You cannot validly compute the chain "backward" from $H_3$ to find the past without guessing.
* **Chronological:** $H_3$ proves that the event represented by $H_2$ occurred *after* (or concurrently with the finalization of) the event represented by $H_1$. 

Thus, $H_3 = \text{SHA256}(H_2 + H_1)$ is a cryptographic timestamp that locks the sequence of events into an unchangeable past.
```

---
### CASE-03 — Multi-Step Reasoning
- **Prompt**: "An autonomous AI workflow has 3 stages: (1) Ingestion of 100 rows, (2) Tool execution filtering rows where score > 80 yielding 25 rows, (3) Model decision on top 5 rows. What is the reduction percentage from ingestion to decision? Show brief calculation steps."
- **Evaluation Criteria**: Must compute reduction from 100 to 5 rows as 95% reduction with clear steps.
- **Status**: **PASS** (Latency: 1703.4 ms)
- **Model Output**:
```text
The reduction percentage from ingestion to decision is **95%**.

**Calculation Steps:**
1. **Initial count (Ingestion):** 100 rows
2. **Final count (Decision):** 5 rows
3. **Difference:** $100 - 5 = 95$ rows reduced
4. **Reduction Percentage:** $(\frac{95}{100}) \times 100\% = 95\%$
```

---
### CASE-04 — Structured JSON Generation
- **Prompt**: "Generate a valid JSON object representing an agent decision with fields: 'agent_id' (string), 'action' (string), 'confidence' (float between 0 and 1), and 'approved' (boolean). Return ONLY the raw JSON string."
- **Evaluation Criteria**: Must parse as valid JSON containing agent_id, action, confidence, and approved keys.
- **Status**: **PASS** (Latency: 9277.63 ms)
- **Model Output**:
```text
{
  "agent_id": "agent_alpha_01",
  "action": "execute_trade",
  "confidence": 0.94,
  "approved": true
}
```

---
### CASE-05 — Data Extraction
- **Prompt**: "Extract the agent name, model identifier, and duration from this log: '2026-11-05T08:00:00Z [INFO] Agent AlphaAudit completed execution using gemini-3.5-flash in 432ms with status SUCCESS.' Format as: Agent: <val>, Model: <val>, Duration: <val>."
- **Evaluation Criteria**: Must correctly extract AlphaAudit, gemini-3.5-flash, and 432ms.
- **Status**: **PASS** (Latency: 17490.39 ms)
- **Model Output**:
```text
Agent: AlphaAudit, Model: gemini-3.5-flash, Duration: 432ms
```

---
### CASE-06 — Summarization
- **Prompt**: "Summarize the primary purpose of ProofMesh in one sentence based on this text: 'ProofMesh is a full-stack security framework for autonomous AI systems. It creates cryptographically verifiable provenance graphs in Neo4j, hashes all agent tool inputs and outputs with SHA-256, and computes rule-based trust assessment scores to enable reliable auditing.'"
- **Evaluation Criteria**: Must summarize AI provenance/trust/auditing accurately.
- **Status**: **PASS** (Latency: 1695.0 ms)
- **Model Output**:
```text
The primary purpose of ProofMesh is to serve as a full-stack security framework that enables reliable auditing of autonomous AI systems through cryptographic
 provenance, hashing, and trust assessment scores.
```

---
### CASE-07 — Technology Comparison
- **Prompt**: "Compare Neo4j graph databases vs relational PostgreSQL for tracking complex multi-agent provenance dependency paths. State 2 clear differentiators in 2-3 bullet points."
- **Evaluation Criteria**: Must contrast graph traversal/relationships (Neo4j) vs relational joins/schema (PostgreSQL).
- **Status**: **PASS** (Latency: 22435.74 ms)
- **Model Output**:
```text
Here is a comparison of Neo4j and PostgreSQL for tracking complex multi-agent provenance dependency paths, highlighted by two clear differentiators:

*   **Traversal Performance at Depth:** Neo4j uses **index-free adjacency**, meaning connected nodes physically point directly to each other on disk. This allows it to query multi-hop provenance paths (e.g., tracing a decision made by Agent A through data modified by Agent B, C, and D) in constant time relative to the depth of the graph. In contrast, PostgreSQL relies on recursive Common Table Expressions (CTEs) and index lookups, causing query latency to degrade exponentially as the dependency path grows deeper and more complex.
*   **Schema Flexibility for Evolving Multi-Agent Topologies:** Neo4j’s property graph model allows agents, tools, and artifacts to be added dynamically with arbitrary, shifting attributes and relationship types without altering existing structures. PostgreSQL requires a rigid schema design; tracking fluid, highly-interconnected multi-agent handoffs often forces either an excessive number of foreign-key join tables or the use of semi-structured JSONB columns, which sacrifices query efficiency on relationship paths.
```

---
### CASE-08 — Evidence Evaluation
- **Prompt**: "Evaluate this scenario: An agent retrieves data from an unauthenticated external URL with zero provenance history. Should this data be considered high, medium, or low trust, and why?"
- **Evaluation Criteria**: Must classify as low trust and explain lack of verification or unauthenticated origin.
- **Status**: **PASS** (Latency: 32975.3 ms)
- **Model Output**:
```text
This data should be considered **low trust** (specifically, **zero-trust**). 

Here is the evaluation of why it falls into this category based on information security principles:

### 1. Evaluation of Risk Factors
* **Unauthenticated Source:** The data comes from a source that does not require verification of identity. Anyone (including a malicious actor) could be hosting or spoofing that endpoint.
* **Zero Provenance History:** There is no metadata, audit trail, or cryptographic signature to verify the origin, intermediate handlers, or creation time of the data. You cannot verify *who* created it, *when* it was created, or *how* it was transmitted.

### 2. Why it is "Low Trust"
In security architecture, trust is not a passive state; it must be earned through verification. 

* **Integrity Risk:** Without provenance, the data could have been intercepted and altered (Man-in-the-Middle attack) or maliciously crafted at the source.
* **Confidentiality/Availability Risk:** While the retrieval is outbound, processing unverified data opens the agent to injection attacks, buffer overflows, or logic bombs embedded within the payload.
* **Compliance/Governance Failure:** Most enterprise frameworks (like NIST or ISO 27001) require data lineage to ensure accountability and data quality. Unprovenanced data fails basic compliance standards.

### Conclusion and Mitigation
An autonomous or semi-autonomous agent should treat this data as **hostile** until proven otherwise. 

If the agent *must* use this data, it should not be trusted implicitly. It requires strict mitigation steps before ingestion, such as:
1. **Schema validation** (ensuring the structure matches expectations).
2. **Sanitization** (stripping potential malicious payloads like SQLi, XSS, or command injection).
3. **Sandbox execution** (processing the data in an isolated environment).
```

---
### CASE-09 — Uncertainty Handling
- **Prompt**: "If a cryptographic provenance hash check passes, does that guarantee the AI model's text response is 100% factually true? Answer directly and explain the distinction between integrity and factual accuracy."
- **Evaluation Criteria**: Must answer No/negative and distinguish ledger integrity (unaltered data) from external factual truth.
- **Status**: **PASS** (Latency: 30930.4 ms)
- **Model Output**:
```text
**No.** A cryptographic provenance hash check does **not** guarantee that an AI model's text response is 100% factually true. 

Here is the distinction between integrity and factual accuracy:

*   **Cryptographic Integrity (What the hash guarantees):** A provenance hash verifies *authenticity and tamper-resistance*. It proves that the AI model output came from a specific, authorized source and that the data has not been altered, corrupted, or intercepted in transit since it was generated. It essentially says, "This response was definitely generated by Model X at time Y, and the bytes have not changed."
*   **Factual Accuracy (What the hash does *not* guarantee):** Factual accuracy refers to whether the information contained within the text corresponds to reality. AI models are probabilistic systems that can "hallucinate"—confidently generating false information, logical errors, or fabricated facts—while still functioning with 100% operational integrity. 

Therefore, a successful hash check only confirms **who** said
 it and that the message is **unchanged**, not whether what they said is actually **true**.
```

---
### CASE-10 — Unsupported-Information Detection
- **Prompt**: "Based ONLY on the fact 'Agent X ran query Q1 on database D1', can we deduce the exact name of the server administrator who deployed D1? Answer Yes or No with a 1-sentence justification."
- **Evaluation Criteria**: Must answer No and explain that administrator identity is not provided.
- **Status**: **PASS** (Latency: 1114.55 ms)
- **Model Output**:
```text
No, because the provided fact only mentions the agent and the query run on the database, containing no information about the person who deployed it.
```

---
## Academic & Scientific Attribution Principle
1. **Provenance Integrity vs. Factual Ground Truth**: Cryptographic hash chain verification mathematically establishes that recorded inputs, tool calls, and outputs have remained immutable and tamper-evident since generation. It does not independently guarantee empirical truth in the physical world without corroborating external trust assertions.
2. **Provider Capacity & SLA Handling**: Model calls are subject to Google Gemini rate limits and provider demand spikes (e.g. HTTP 429 / 503). In production, ProofMesh wraps invocations in exponential backoff and preserves intermediate tool provenance logs regardless of downstream LLM generation status.
