"""
ProofMesh - Comprehensive Gemini Model & LangChain Evaluation Suite
Executes 10 structured academic evaluation cases covering:
1. Factual explanation
2. Technical reasoning
3. Multi-step reasoning
4. JSON generation
5. Data extraction
6. Summarization
7. Technology comparison
8. Evidence evaluation
9. Uncertainty handling
10. Unsupported-information detection
Outputs detailed results to MODEL_EVALUATION_REPORT.md.
"""

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage


def extract_text(response):
    content = response.content
    if isinstance(content, list):
        parts = []
        for c in content:
            if isinstance(c, dict) and 'text' in c:
                parts.append(c['text'])
            elif isinstance(c, str):
                parts.append(c)
            elif hasattr(c, 'text'):
                parts.append(c.text)
            else:
                parts.append(str(c))
        return '\n'.join(parts)
    return str(content)


EVALUATION_CASES = [
    {
        "id": "CASE-01",
        "category": "Factual Explanation",
        "prompt": "Explain what a cryptographic hash chain is and how it guarantees tamper-evident provenance in 2 concise sentences.",
        "criteria": "Must mention hashing (or cryptographic digest), chaining (previous hash linkage), and tamper-evidence.",
        "validator": lambda txt: any(w in txt.lower() for w in ["chain", "link", "previous"]) and any(w in txt.lower() for w in ["hash", "digest", "cryptographic"]) and any(w in txt.lower() for w in ["tamper", "detect", "integrity", "alter"])
    },
    {
        "id": "CASE-02",
        "category": "Technical Reasoning",
        "prompt": "Given two SHA-256 event digests H1 and H2, explain why computing H3 = SHA256(H2 + H1) creates a directed chronological dependency.",
        "criteria": "Must explain collision resistance/one-way property or order dependency of inputs in hash concatenation.",
        "validator": lambda txt: any(w in txt.lower() for w in ["order", "sequence", "preimage", "collision", "chronological", "dependency", "one-way"])
    },
    {
        "id": "CASE-03",
        "category": "Multi-Step Reasoning",
        "prompt": "An autonomous AI workflow has 3 stages: (1) Ingestion of 100 rows, (2) Tool execution filtering rows where score > 80 yielding 25 rows, (3) Model decision on top 5 rows. What is the reduction percentage from ingestion to decision? Show brief calculation steps.",
        "criteria": "Must compute reduction from 100 to 5 rows as 95% reduction with clear steps.",
        "validator": lambda txt: "95" in txt or ("100" in txt and "5" in txt)
    },
    {
        "id": "CASE-04",
        "category": "Structured JSON Generation",
        "prompt": "Generate a valid JSON object representing an agent decision with fields: 'agent_id' (string), 'action' (string), 'confidence' (float between 0 and 1), and 'approved' (boolean). Return ONLY the raw JSON string.",
        "criteria": "Must parse as valid JSON containing agent_id, action, confidence, and approved keys.",
        "validator": lambda txt: validate_json(txt, ["agent_id", "action", "confidence", "approved"])
    },
    {
        "id": "CASE-05",
        "category": "Data Extraction",
        "prompt": "Extract the agent name, model identifier, and duration from this log: '2026-11-05T08:00:00Z [INFO] Agent AlphaAudit completed execution using gemini-3.5-flash in 432ms with status SUCCESS.' Format as: Agent: <val>, Model: <val>, Duration: <val>.",
        "criteria": "Must correctly extract AlphaAudit, gemini-3.5-flash, and 432ms.",
        "validator": lambda txt: "alphaaudit" in txt.lower() and "gemini" in txt.lower() and "432" in txt
    },
    {
        "id": "CASE-06",
        "category": "Summarization",
        "prompt": "Summarize the primary purpose of ProofMesh in one sentence based on this text: 'ProofMesh is a full-stack security framework for autonomous AI systems. It creates cryptographically verifiable provenance graphs in Neo4j, hashes all agent tool inputs and outputs with SHA-256, and computes rule-based trust assessment scores to enable reliable auditing.'",
        "criteria": "Must summarize AI provenance/trust/auditing accurately.",
        "validator": lambda txt: any(w in txt.lower() for w in ["provenance", "audit", "trust", "security"]) and len(txt) < 300
    },
    {
        "id": "CASE-07",
        "category": "Technology Comparison",
        "prompt": "Compare Neo4j graph databases vs relational PostgreSQL for tracking complex multi-agent provenance dependency paths. State 2 clear differentiators in 2-3 bullet points.",
        "criteria": "Must contrast graph traversal/relationships (Neo4j) vs relational joins/schema (PostgreSQL).",
        "validator": lambda txt: any(w in txt.lower() for w in ["graph", "traversal", "relationship"]) and any(w in txt.lower() for w in ["table", "relational", "join", "foreign key", "sql"])
    },
    {
        "id": "CASE-08",
        "category": "Evidence Evaluation",
        "prompt": "Evaluate this scenario: An agent retrieves data from an unauthenticated external URL with zero provenance history. Should this data be considered high, medium, or low trust, and why?",
        "criteria": "Must classify as low trust and explain lack of verification or unauthenticated origin.",
        "validator": lambda txt: "low" in txt.lower() and any(w in txt.lower() for w in ["unauthenticated", "unverified", "history", "untrusted", "source", "origin"])
    },
    {
        "id": "CASE-09",
        "category": "Uncertainty Handling",
        "prompt": "If a cryptographic provenance hash check passes, does that guarantee the AI model's text response is 100% factually true? Answer directly and explain the distinction between integrity and factual accuracy.",
        "criteria": "Must answer No/negative and distinguish ledger integrity (unaltered data) from external factual truth.",
        "validator": lambda txt: any(w in txt.lower()[:30] for w in ["no", "does not", "not necessarily"]) and any(w in txt.lower() for w in ["integrity", "factual", "truth", "accuracy", "hallucin"])
    },
    {
        "id": "CASE-10",
        "category": "Unsupported-Information Detection",
        "prompt": "Based ONLY on the fact 'Agent X ran query Q1 on database D1', can we deduce the exact name of the server administrator who deployed D1? Answer Yes or No with a 1-sentence justification.",
        "criteria": "Must answer No and explain that administrator identity is not provided.",
        "validator": lambda txt: "no" in txt.lower()[:20] and any(w in txt.lower() for w in ["not provide", "cannot", "unsupported", "not mention", "no information"])
    }
]


def validate_json(txt, required_keys):
    clean = txt.strip()
    if clean.startswith("```"):
        lines = clean.splitlines()
        clean = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
    try:
        data = json.loads(clean.strip())
        return isinstance(data, dict) and all(k in data for k in required_keys)
    except Exception:
        return False


def run_model_evaluations():
    print("==================================================================")
    print("PROOFMESH — GOOGLE GEMINI MODEL & LANGCHAIN EVALUATION SUITE")
    print("==================================================================\n")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[FAIL] GEMINI_API_KEY not found in environment.")
        return False

    model_name = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    print(f"Target Configured Model: {model_name}")
    print(f"Provider: Google Gemini via LangChain (langchain_google_genai)")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n")

    try:
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
        )
    except Exception as init_err:
        print(f"[FAIL] Failed to initialize ChatGoogleGenerativeAI: {init_err}")
        return False

    results = []
    total_passed = 0
    total_latency_ms = 0

    for idx, test in enumerate(EVALUATION_CASES, start=1):
        print(f"Running [{test['id']}] {test['category']}...")
        start_t = time.perf_counter()
        status_str = "FAIL"
        response_text = ""
        error_info = None

        try:
            response = llm.invoke([HumanMessage(content=test["prompt"])])
            latency_ms = (time.perf_counter() - start_t) * 1000
            total_latency_ms += latency_ms
            response_text = extract_text(response).strip()

            passed = test["validator"](response_text)
            if passed:
                status_str = "PASS"
                total_passed += 1
            else:
                status_str = "REVIEW"

        except Exception as e:
            latency_ms = (time.perf_counter() - start_t) * 1000
            error_info = str(e)
            status_str = "ERROR"

        print(f" -> Result: {status_str} ({latency_ms:.1f}ms)")

        results.append({
            "id": test["id"],
            "category": test["category"],
            "prompt": test["prompt"],
            "criteria": test["criteria"],
            "response": response_text or f"ERROR: {error_info}",
            "status": status_str,
            "latency_ms": round(latency_ms, 2),
        })

    avg_latency = round(total_latency_ms / len(EVALUATION_CASES), 2)
    pass_rate = round((total_passed / len(EVALUATION_CASES)) * 100, 1)

    print(f"\nEvaluation Complete: {total_passed}/{len(EVALUATION_CASES)} Passed ({pass_rate}%)")
    print(f"Average Latency: {avg_latency} ms\n")

    # Generate Markdown Report
    report_content = f"""# ProofMesh — Google Gemini Model Evaluation Report

**Evaluation Date**: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}  
**Model Under Test**: `{model_name}`  
**Provider / Integration**: Google Gemini via LangChain (`langchain_google_genai`)  
**Evaluation Scope**: 10 Independent Autonomous AI Reasoning & Provenance Competency Cases  
**Pass Rate**: **{pass_rate}% ({total_passed}/{len(EVALUATION_CASES)} passed)**  
**Average Latency**: **{avg_latency} ms**  

---

## Evaluation Summary Matrix

| Case ID | Category | Expected Capability | Status | Latency (ms) |
|---|---|---|---|---|
"""
    for r in results:
        status_badge = "✅ PASS" if r["status"] == "PASS" else ("⚠️ REVIEW" if r["status"] == "REVIEW" else "❌ ERROR")
        report_content += f"| **{r['id']}** | {r['category']} | {r['criteria']} | {status_badge} | {r['latency_ms']} ms |\n"

    report_content += "\n---\n\n## Detailed Test Cases and Observable Outputs\n\n"

    for r in results:
        report_content += f"""### {r['id']} — {r['category']}
- **Prompt**: "{r['prompt']}"
- **Evaluation Criteria**: {r['criteria']}
- **Status**: **{r['status']}** (Latency: {r['latency_ms']} ms)
- **Model Output**:
```text
{r['response']}
```

---
"""

    report_content += """## Academic & Scientific Attribution Principle
1. **Provenance Integrity vs. Factual Ground Truth**: Cryptographic hash chain verification mathematically establishes that recorded inputs, tool calls, and outputs have remained immutable and tamper-evident since generation. It does not independently guarantee empirical truth in the physical world without corroborating external trust assertions.
2. **Provider Capacity & SLA Handling**: Model calls are subject to Google Gemini rate limits and provider demand spikes (e.g. HTTP 429 / 503). In production, ProofMesh wraps invocations in exponential backoff and preserves intermediate tool provenance logs regardless of downstream LLM generation status.
"""

    report_path = Path("MODEL_EVALUATION_REPORT.md")
    with open(report_path, "w", encoding="utf-8") as rf:
        rf.write(report_content)

    print(f"Generated comprehensive report: {report_path.resolve()}")
    return True


if __name__ == "__main__":
    run_model_evaluations()

