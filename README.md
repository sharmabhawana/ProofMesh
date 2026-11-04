# ProofMesh — Week 6: Trust Assessment Module

## Project Title
**ProofMesh: Cryptographically Verifiable Provenance and Trust Framework for Autonomous AI Agents**

## 1. Objective
The objective of Week 6 is to develop a trust assessment module that evaluates the reliability, completeness, and integrity of AI-agent provenance records.

## 2. Features
- Calculates a source reliability score.
- Measures provenance completeness using required event fields.
- Verifies provenance records using the existing SHA-256 hash chain.
- Calculates a weighted trust score.
- Assigns High, Moderate, or Low trust categories.
- Caps the score at 59 when integrity verification fails.
- Generates JSON trust assessment reports.
- Detects modified provenance events and verifies restoration.

## 3. Scoring Method

The trust score uses three weighted metrics:

| Metric | Weight |
|---|---:|
| Source reliability | 40% |
| Provenance completeness | 30% |
| Integrity verification | 30% |

The weighted score is calculated as:

`Trust Score = (0.40 × S) + (0.30 × P) + (0.30 × I)`

Where:
- **S:** Source reliability score.
- **P:** Provenance completeness score.
- **I:** Integrity verification score.

The integrity score is 100 when verification passes and 0 when verification fails. If integrity verification fails, the final score is capped at 59 and the category is set to Low.

### Trust Categories

- **High:** 80–100
- **Moderate:** 60–79
- **Low:** 0–59

## 4. Workflow

1. Load provenance events and the saved integrity chain.
2. Calculate source reliability and provenance completeness.
3. Verify event contents, hashes, sequence numbers, and chain links.
4. Calculate the weighted trust score.
5. Apply the integrity-failure rule.
6. Assign the trust category.
7. Save the assessment report as a JSON file.

## 5. Technologies
- Python
- SHA-256 cryptographic hashing
- JSON
- python-dotenv
- Existing ProofMesh provenance integrity module

## 6. Requirements
- Python 3.10 or a compatible version.
- The existing ProofMesh provenance log.
- The saved SHA-256 integrity chain.
- The project's `provenance_integrity.py` module.

## 7. Installation

Open a terminal in the project directory and run:

```bash
python -m pip install -r requirements.txt
```

## 8. Execution

Check the Python syntax:

```bash
python -m py_compile trust_assessment.py
```

Run the trust assessment:

```bash
python trust_assessment.py
```

Test tampering detection:

```bash
python provenance_integrity.py test-tamper
```

The generated trust assessment reports are saved in the `trust_reports/` directory.

## 9. Testing

The module was tested using the following scenarios:

1. Valid provenance data: integrity verification passes and the trust category is High.
2. Tampering demonstration: the integrity module detects a hash mismatch in a modified copy.
3. Modified provenance log: the trust assessment detects an event mismatch, assigns an integrity score of zero, and caps the final score at 59.
4. Restoration: after restoring the original provenance log, integrity verification passes again.

## 10. Limitations

- Source reliability currently measures whether evidence identifies its source; it does not independently establish factual accuracy.
- Provenance completeness checks core event fields, not every possible field or graph relationship.
- A valid hash chain demonstrates consistency with the saved chain, but does not prove that the original information is truthful.
- The prototype uses locally stored provenance and integrity files.

## 11. Week 6 Deliverable

The Week 6 deliverable includes the trust assessment engine, weighted scoring logic, SHA-256 integrity verification, JSON reports, and test evidence for valid data, tampering detection, and restoration.

























<!--# ProofMesh — Week 5: Dependency-Based Impact Analysis Engine

## Project Title

**ProofMesh: Cryptographically Verifiable Provenance and Trust Framework for Autonomous AI Agents**

## 1. Objective

The objective of Week 5 is to develop a dependency-based impact analysis engine that identifies downstream workflow components and decisions that may be affected by unreliable source data or modified provenance events.

## 2. Features Implemented

- Implemented graph traversal using Breadth-First Search (BFS) to identify downstream dependencies.
- Integrated Neo4j to retrieve provenance nodes and relationships.
- Supported graph node labels: `Agent`, `Tool`, `DataSource`, and `Decision`.
- Identified downstream nodes and decisions connected to a selected source or workflow node.
- Implemented an unreliable-source simulation flag to mark potentially affected decisions for review.
- Integrated Week 4 SHA-256 integrity verification with impact analysis.
- Compared provenance events against the saved integrity chain to identify changed or added events.
- Added source-attribution logic that checks whether changed events explicitly identify the selected source.
- Generated JSON impact reports containing affected nodes, dependency paths, integrity results, and decision status.

## 3. System Workflow

1. Select a provenance node from the Neo4j graph.
2. Retrieve graph nodes and directed relationships.
3. Traverse downstream dependencies using BFS.
4. Identify reachable decision nodes.
5. Optionally verify the provenance log against the saved SHA-256 integrity chain.
6. Evaluate source attribution when changed events contain matching source identifiers.
7. Generate a JSON impact analysis report.

## 4. Technologies Used

- **Programming Language:** Python
- **Graph Database:** Neo4j
- **Integrity Verification:** SHA-256
- **Data Format:** JSON
- **Libraries:** Neo4j Python Driver, python-dotenv
- **Analysis Algorithm:** Breadth-First Search (BFS)

## 5. Project Requirements

- Python installed on the system.
- Neo4j running and accessible.
- A configured Neo4j database containing the ProofMesh provenance graph.
- `provenance_logs.json` from the provenance logging implementation.
- `provenance_integrity_chain.json` from the Week 4 integrity implementation.
- A local `.env` file containing the Neo4j connection settings.

## 6. Environment Configuration

Create a `.env` file in the project root with your local Neo4j settings:

```env
NEO4J_URI=bolt://127.0.0.1:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_local_password
NEO4J_DATABASE=proofmesh
```

Replace the example password with your own local Neo4j password. Do not upload the real `.env` file to Plane.

## 7. Installation

Install the required Python packages:

```bash
python -m pip install -r requirements.txt
```

Check the Python syntax:

```bash
python -m py_compile impact_analysis.py provenance_integrity.py
```

## 8. Execution Instructions

### List available data sources

```bash
python impact_analysis.py --list-sources
```

### Run dependency-based impact analysis

Replace the example source ID with an ID displayed by the previous command.

```bash
python impact_analysis.py --node-type DataSource --node-id controlled_proofmesh_knowledge_base
```

### Run impact analysis with integrity verification

```bash
python impact_analysis.py --node-type DataSource --node-id controlled_proofmesh_knowledge_base --check-integrity
```

### Simulate an unreliable source

```bash
python impact_analysis.py --node-type DataSource --node-id controlled_proofmesh_knowledge_base --unreliable
```

## 9. Output and Reports

The analysis generates JSON reports in the `impact_reports/` directory.

The reports include:

- Selected starting node and its properties.
- Number of graph nodes visited.
- Downstream nodes and dependency paths.
- Decisions requiring review.
- Integrity verification results, when enabled.
- Source-attribution status, when enabled.
- Relationships traversed.
- Known analysis limitations.

## 10. Limitations

- The graph traversal follows outgoing relationships only; results depend on the direction and connectivity of the Neo4j relationships.
- The `--unreliable` flag simulates an unreliable source. It does not independently detect whether a source is actually unreliable.
- A failed integrity check indicates a mismatch with the saved integrity chain but does not automatically establish which source caused the change.
- Source attribution requires the changed event to explicitly contain a matching source identifier.
- A matching source identifier indicates an association with the event, not definitive proof of causation.
- A SHA-256 hash chain alone cannot prevent an attacker from rewriting both the provenance log and its saved chain. Stronger protection requires a trusted external checkpoint or digital signature.

## 11. Conclusion

The Week 5 implementation extends ProofMesh with dependency-based impact analysis, downstream decision identification, unreliable-source simulation, and integration with the Week 4 integrity-verification mechanism. It generates structured JSON reports to support the investigation of potentially affected AI agent decisions.

End-to-end behavior must be validated against the configured local Neo4j database before claiming complete runtime verification.
<!--## Week 4: Cryptographic Integrity Module

### Objective

Implement SHA-256 hashing and hash chaining to detect unauthorized
modifications to ProofMesh provenance records.

### Implemented Tasks

- Calculated a SHA-256 hash for every provenance event.
- Used canonical JSON serialization for reproducible hashing.
- Linked each record to the previous record's hash.
- Stored the hash chain in `provenance_integrity_chain.json`.
- Implemented verification of record hashes and chain links.
- Demonstrated tampering detection using an in-memory test copy.

### Execution

Build the hash chain:

```bash
python provenance_integrity.py build
```

Verify integrity:

```bash
python provenance_integrity.py verify
```

Demonstrate tampering detection:

```bash
python provenance_integrity.py test-tamper
```

### Expected Outcome

The module generates a SHA-256 hash for each provenance record,
links records into a hash chain, verifies the chain, and detects
changes to records whose hashes no longer match.

### Limitation

A hash chain alone does not prevent someone from rewriting the
entire chain and recalculating every hash. A trusted external
checkpoint or digital signature is needed to protect the final
chain against complete replacement.




<!--## Week 3: Neo4j Provenance Graph Schema

### Objective

Design and implement the Neo4j graph database structure to store
ProofMesh agent workflow events and provenance dependencies.

### Implemented Tasks

- Installed and configured a Neo4j instance.
- Created the `proofmesh` Neo4j database.
- Defined graph node labels:
  - `Agent`
  - `Tool`
  - `DataSource`
  - `Decision`
- Added uniqueness constraints for node identifiers.
- Implemented a Python-based provenance loader.
- Imported provenance events from `provenance_logs.json`.
- Created workflow dependency relationships:
  - `USED_TOOL`
  - `RETRIEVED_FROM`
  - `INFLUENCED`
  - `MADE_DECISION`

### Provenance Graph

The implemented graph represents the relationship between an
AI agent, the tools it uses, the data sources accessed by those
tools, and the decisions produced by the workflow.

```text
Agent
  |
  | USED_TOOL
  v
Tool
  |
  | RETRIEVED_FROM
  v
DataSource
  |
  | INFLUENCED
  v
Decision
  ^
  |
  | MADE_DECISION
  |
Agent-->




<!--# ProofMesh — Week 2: Provenance Logger

## Project Title

**ProofMesh: Cryptographically Verifiable Provenance and Trust Framework for Autonomous AI Agents**

## Week 2 Module

**Provenance Logger Implementation**

## 1. Objective

The objective of this module is to develop a provenance logging component for recording important events generated during a LangChain-based AI-agent workflow.

The logger captures tool execution events, workflow inputs and outputs, timestamps, unique event identifiers, and related metadata for subsequent storage, verification, and analysis.

## 2. Implementation

The Week 2 prototype uses a controlled LangChain workflow with a knowledge lookup tool.

The provenance logger is implemented using LangChain's `BaseCallbackHandler`. Callback events are used to monitor tool execution and record provenance information automatically.

The workflow records:

- Tool execution start
- Tool execution completion
- Retrieved evidence
- Decision-related workflow information
- Unique event identifiers
- UTC timestamps
- Agent and model information
- Tool information
- Workflow run identifiers
- Input and output data

## 3. Workflow

```text
User Request
     |
     v
LangChain Workflow
     |
     v
Knowledge Lookup Tool
     |
  <!--   +----> TOOL_START
     |
     +----> TOOL_END
     |
     v
Evidence Retrieved
     |
     v
Decision Recorded
     |
     v
provenance_logs.json-->
-->