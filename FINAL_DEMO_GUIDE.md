# ProofMesh — Final Project Demonstration Script & Supervisor Guide

This document provides a structured, step-by-step demonstration walkthrough for your academic supervisor, project committee, or external examiner.

---

## 1. Pre-Demo Setup & Service Launch Commands

Open two terminal windows in the project root directory (`c:\Users\BHAWANA SHARMA\OneDrive\Desktop\ProofMesh`):

### Terminal 1: Backend API Server
```powershell
.\.venv\Scripts\activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
*Expected Output:*
`INFO: Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)`

### Terminal 2: React Frontend Dashboard
```powershell
cd frontend
npm run dev
```
*Expected Output:*
`VITE v8.3.5 ready in 250 ms | http://localhost:5173/`

Open your web browser to: **`http://localhost:5173`**

---

## 2. Step-by-Step Live Demonstration Walkthrough

### Step 1: Login & Executive Overview
1. **Action:** Log into the dashboard using administrator credentials:
   - **Username / Email:** `admin` or `admin@proofmesh.local`
   - **Password:** `<Configured Administrator Password>` (refer to your local environment configuration)
2. **What to Show:**
   - The **Executive Overview** page (`/#/overview`) displaying high-level governance metrics: Trust Score Gauge ($100.0/100$), Cryptographic Integrity Pill (**Verified PASS**), Total Graph Nodes, Active Data Sources, and Affected Decisions count.
   - Click the **Sun / Moon** icon in the topbar to showcase instant, smooth Dark/Light theme switching.

### Step 2: Live AI Agent Workflow Execution
1. **Action:** Navigate to **Create & Run Workflow** (`/#/create-workflow`).
2. **Demonstration:**
   - Enter a workflow name: `"Academic Compliance Verification"`.
   - Select model: `Google Gemini 3.5 Flash Lite (Verified Production Endpoint)`.
   - Click one of the Suggested Benchmark Prompts: *"Trustworthy AI Provenance"*.
   - Click **`RUN AI WORKFLOW`**.
3. **What to Explain to the Supervisor:**
   - Point out that this triggers an **actual autonomous agent** using LangChain and Google Gemini.
   - The agent accesses the controlled knowledge base via the `knowledge_lookup` tool.
   - Upon completion ($<6$ seconds), show the **8 captured provenance events** in the chronological event timeline: `MODEL_DETAILS` $\rightarrow$ `LLM_CALL_START` $\rightarrow$ `TOOL_START` $\rightarrow$ `TOOL_END` $\rightarrow$ `EVIDENCE_CAPTURED` $\rightarrow$ `LLM_CALL_END` $\rightarrow$ `INTERMEDIATE_DECISION` $\rightarrow$ `DECISION`.
   - Point out that the SHA-256 cryptographic hash chain was immediately updated and saved to disk.

### Step 3: Interactive Knowledge Graph Explorer
1. **Action:** Navigate to **Workflow Explorer** (`/#/workflow`).
2. **What to Show:**
   - The interactive React Flow canvas rendering a clean, hierarchical 4-column layout:
     - **Column 1:** Agent (`ProofMesh-Agent`)
     - **Column 2:** Tool (`knowledge_lookup`)
     - **Column 3:** DataSource (`Controlled ProofMesh Knowledge Base`)
     - **Column 4:** Decisions (`Intermediate Decision` and `Final Decision`)
   - Click on any node to open the side inspector panel showing exact metadata properties, runtime arguments, and output snapshots.
   - Pan and zoom across the graph to prove fluid 60 FPS rendering.

### Step 4: Cryptographic Integrity & Tampering Audit
1. **Action:** Navigate to **Integrity Center** (`/#/integrity`).
2. **Demonstration:**
   - Show the green verification banner: **"INTEGRITY CHECK PASSED: SHA-256 hash chain and source log verified"**.
   - Show the chain metadata: Algorithm = `SHA-256`, Genesis Hash = `0000...0000`, Total Chain Records = `8`.
   - Click **`Verify Cryptographic Chain`** to trigger live on-demand re-verification.
3. **Adversarial Tampering Demonstration (Live in Terminal):**
   - In a terminal, run:
     ```powershell
     .\.venv\Scripts\python.exe test_log_tampering.py
     ```
   - Explain to the supervisor: *"We simulated an adversary altering an event in the historical log. As seen in the output, ProofMesh instantly detected the discrepancy, proving the immutability of the hash chain without damaging our real data."*

### Step 5: Rule-Based Trust Analytics Dashboard
1. **Action:** Navigate to **Trust Analytics** (`/#/trust`).
2. **What to Explain:**
   - Show the dynamic Trust Gauge showing **100.0 / 100** (Category: **High**).
   - Point out the formal mathematical formula card:
     $$T = 0.40 \cdot \text{Source} + 0.30 \cdot \text{Completeness} + 0.30 \cdot \text{Integrity}$$
   - Explain that each component reflects empirical evidence:
     - *Source Reliability:* $100\%$ (Authoritative controlled knowledge base).
     - *Completeness:* $100\%$ (All 8 lifecycle stages present).
     - *Integrity:* $100\%$ (Cryptographic hash chain validated).

### Step 6: Dependency-Based Impact Analysis (Blast-Radius)
1. **Action:** Navigate to **Impact Analysis** (`/#/impact`).
2. **Demonstration:**
   - Select Node Type: `DataSource`.
   - Node ID: `controlled_proofmesh_knowledge_base`.
   - Click **`Run Impact Analysis`**.
3. **What to Explain:**
   - ProofMesh performs Breadth-First Search (BFS) over the execution graph.
   - Show that **2 decisions** are identified as potentially affected by this data source.
   - Toggle the **"Simulate Unreliable Source"** switch and run again. Show how the status shifts to `FLAGGED_UNRELIABLE_SOURCE`, proving how the system identifies affected outputs if a source is later revoked or found malicious.

### Step 7: Customer Upload Center & Datasets Engine
1. **Action:** Navigate to **Upload Center** (`/#/upload`).
2. **Demonstration:**
   - Click the **"Synthetic Dataset Generator"** tab.
   - Select profile: `Multi Agent Execution` (or `Tool Failure`).
   - Set target events: `30`.
   - Click **`Generate & Ingest Dataset`**.
   - Show that the dataset was created with a unique SHA-256 chain head and automatically registered.
   - Click **`Audit Conformance`** to run the schema and causal continuity validator.
3. **Action:** Navigate to **Agent Data Explorer** (`/#/agent-explorer`).
   - Select the newly generated dataset to browse individual agent events, filter by event type or agent name, and inspect raw JSON payloads in the modal viewer.

### Step 8: Compliance Reports & Secure Downloads
1. **Action:** Navigate to **Analytical Reports** (`/#/reports`).
2. **What to Show:**
   - Show the list of generated audit reports with categories (`provenance`, `upload_validation`).
   - Click **`Download JSON`** on any report. Show the downloaded JSON file in your browser to demonstrate path-sanitized, cryptographically signed export.

### Step 9: Administrator Console & RBAC Security
1. **Action:** Navigate to **Admin Console** (`/#/admin`).
2. **What to Show:**
   - View the active user table showing IDs, usernames, roles (`admin` / `user`), and status toggles.
   - Explain that standard users attempting to access `/#/admin` or admin REST routes are immediately blocked by HTTP 403 server guards.

### Step 10: Terminal Automated Test Execution
1. **Action:** In Terminal 1, run the comprehensive verification suite:
   ```powershell
   .\.venv\Scripts\python.exe test_complete_validation.py
   ```
2. **Show the Result:**
   - `VERIFICATION SUMMARY: 25/25 TESTS PASSED`
   - Conclude by stating: *"ProofMesh has been validated with a 100% automated test-suite pass rate (25/25 validation tests, 25/25 DB & auth tests, 9/9 router tests) across authentication, cryptographic integrity, graph traversal, and agent execution layers."*

