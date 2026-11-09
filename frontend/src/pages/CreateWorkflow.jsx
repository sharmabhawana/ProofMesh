import { useState } from "react";
import {
  Play,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  ShieldCheck,
  Sparkles,
  Layers,
  Database,
  ArrowRight,
  Terminal,
  Activity,
  RotateCw,
} from "lucide-react";
import dashboardService from "../services/dashboardService";

const EVENT_TYPE_STYLES = {
  MODEL_DETAILS: { color: "#63a5ff", label: "Model Init" },
  LLM_CALL_START: { color: "#a78bfa", label: "LLM Request" },
  LLM_CALL_END: { color: "#10b981", label: "LLM Response" },
  TOOL_START: { color: "#f59e0b", label: "Tool Start" },
  TOOL_END: { color: "#10b981", label: "Tool End" },
  TOOL_ERROR: { color: "#ef4444", label: "Tool Error" },
  EVIDENCE_CAPTURED: { color: "#06b6d4", label: "Evidence" },
  INTERMEDIATE_DECISION: { color: "#8b5cf6", label: "Reasoning" },
  DECISION: { color: "#10b981", label: "Final Decision" },
};

function getEventStyle(type) {
  return EVENT_TYPE_STYLES[type] || { color: "var(--muted)", label: type };
}

export default function CreateWorkflow({ onNavigate, onWorkflowComplete }) {
  const [workflowName, setWorkflowName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [modelName, setModelName] = useState("gemini-3.5-flash-lite");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showEventsDetail, setShowEventsDetail] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workflowName.trim() || !taskDescription.trim()) {
      setError("Please provide both a workflow name and task description.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await dashboardService.runWorkflow({
        workflow_name: workflowName.trim(),
        task_description: taskDescription.trim(),
        model_name: modelName,
      });
      setResult(data);
      if (onWorkflowComplete) {
        onWorkflowComplete(data);
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Failed to execute AI workflow. Please check your network and API configuration."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreloadPrompt = (title, desc) => {
    setWorkflowName(title);
    setTaskDescription(desc);
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setShowEventsDetail(false);
  };

  const provenanceEvents = result?.provenance_events || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="badge">Autonomous AI Execution</span>
          <h2>Create &amp; Run AI Workflow</h2>
          <p>
            Trigger actual AI-agent execution with real-time cryptographic provenance tracking,
            tool invocation, evidence recording, and Neo4j graph synchronization.
          </p>
        </div>
        {result && (
          <button
            type="button"
            className="button button-secondary"
            onClick={handleReset}
            style={{ height: "38px" }}
          >
            <RotateCw size={14} />
            <span>New Workflow</span>
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
        {/* Execution Form */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Workflow Configuration</h3>
              <p>Configure agent parameters and prompt instructions</p>
            </div>
            <Cpu size={20} style={{ color: "var(--accent)" }} />
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "12px 14px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "8px",
                color: "#ef4444",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Workflow Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Compliance Audit &amp; Verification"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--panel-soft)",
                  color: "var(--text)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                AI Model Integration
              </label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--panel-soft)",
                  color: "var(--text)",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                <option value="gemini-3.5-flash-lite">Google Gemini 3.5 Flash Lite (Verified Production Endpoint)</option>
                <option value="gemini-3.8-flash">Google Gemini 3.8 Flash (High-Capacity Reasoning)</option>
                <option value="gemini-flash-latest">Google Gemini Flash Latest (Rolling Release)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Agent Task or Prompt Description *
              </label>
              <textarea
                rows={5}
                placeholder="Describe the task for the autonomous agent. The agent will invoke knowledge tools, collect evidence, make structured decisions, and record SHA-256 provenance events."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--panel-soft)",
                  color: "var(--text)",
                  fontSize: "13px",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: "1.5",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button button-primary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px 20px",
                fontWeight: 650,
                fontSize: "14px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Play size={16} />
              <span>{loading ? "Executing Autonomous Agent..." : "RUN AI WORKFLOW"}</span>
            </button>
          </form>

          {/* Quick templates */}
          <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: "10px" }}>
              Suggested Benchmark Prompts:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <button
                type="button"
                className="button button-secondary"
                style={{ fontSize: "12px", padding: "6px 12px" }}
                onClick={() =>
                  handlePreloadPrompt(
                    "Provenance Reliability Assessment",
                    "Explain how provenance tracking improves reliability and reduces hallucination in AI agents in 3 short points."
                  )
                }
              >
                Trustworthy AI Provenance
              </button>
              <button
                type="button"
                className="button button-secondary"
                style={{ fontSize: "12px", padding: "6px 12px" }}
                onClick={() =>
                  handlePreloadPrompt(
                    "AI Agent Evidence Verification",
                    "Retrieve controlled evidence on AI agents and evaluate decision accountability."
                  )
                }
              >
                Agent Evidence Verification
              </button>
              <button
                type="button"
                className="button button-secondary"
                style={{ fontSize: "12px", padding: "6px 12px" }}
                onClick={() =>
                  handlePreloadPrompt(
                    "Cryptographic Hash Chain Test",
                    "Analyze the properties and importance of cryptographic hash chains for AI provenance integrity verification."
                  )
                }
              >
                Hash Chain Integrity
              </button>
            </div>
          </div>
        </div>

        {/* Execution Output Panel */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <div className="panel-header">
            <div>
              <h3>Execution Status &amp; Provenance</h3>
              <p>Real-time execution telemetry and output</p>
            </div>
            <ShieldCheck size={20} style={{ color: "var(--accent)" }} />
          </div>

          {loading ? (
            <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "40px 20px", textAlign: "center" }}>
              <div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: "3px solid var(--border)",
                    borderTopColor: "var(--accent)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 16px",
                  }}
                />
                <h4 style={{ margin: "0 0 6px" }}>Executing AI Workflow...</h4>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                  Calling Gemini LLM, querying tools, recording SHA-256 events...
                </p>
              </div>
            </div>
          ) : result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Status banner */}
              <div
                style={{
                  padding: "12px 14px",
                  background: result.status === "completed"
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${result.status === "completed"
                    ? "rgba(16, 185, 129, 0.3)"
                    : "rgba(239, 68, 68, 0.3)"}`,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <CheckCircle2 size={20} style={{ color: result.status === "completed" ? "#10b981" : "#ef4444", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 650, fontSize: "13px", color: "var(--text)" }}>
                    {result.status === "completed" ? "Execution Succeeded" : "Execution Failed"} ({result.execution_duration}s)
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace", marginTop: "2px" }}>
                    {result.workflow_id} · {result.provenance_events_count} Events Captured
                  </div>
                </div>
              </div>

              {/* Evidence */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 650, color: "var(--muted)", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  Tool Evidence Captured
                </label>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--panel-soft)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    border: "1px solid var(--border)",
                    lineHeight: 1.5,
                    maxHeight: "80px",
                    overflowY: "auto",
                    color: "var(--text)",
                  }}
                >
                  {result.evidence || "No external tool evidence requested"}
                </div>
              </div>

              {/* Agent Output */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 650, color: "var(--muted)", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  Agent Final Output
                </label>
                <div
                  style={{
                    padding: "12px",
                    background: "var(--panel-soft)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    border: "1px solid var(--border)",
                    lineHeight: 1.6,
                    maxHeight: "140px",
                    overflowY: "auto",
                    color: "var(--text)",
                  }}
                >
                  {result.output}
                </div>
              </div>

              {/* Provenance Events Timeline */}
              {provenanceEvents.length > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 650, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                      Provenance Events ({provenanceEvents.length})
                    </label>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setShowEventsDetail(!showEventsDetail)}
                      style={{ fontSize: "11px", padding: "3px 8px", minHeight: "unset" }}
                    >
                      {showEventsDetail ? "Collapse" : "Expand"}
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0",
                      maxHeight: showEventsDetail ? "400px" : "160px",
                      overflowY: "auto",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      background: "var(--panel-soft)",
                    }}
                  >
                    {provenanceEvents.map((ev, idx) => {
                      const style = getEventStyle(ev.event_type);
                      return (
                        <div
                          key={ev.event_id || idx}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px",
                            padding: "8px 12px",
                            borderBottom: idx < provenanceEvents.length - 1 ? "1px solid var(--border)" : "none",
                            fontSize: "12px",
                          }}
                        >
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: style.color,
                              flexShrink: 0,
                              marginTop: "4px",
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                              <span style={{ fontWeight: 600, color: style.color }}>{style.label}</span>
                              {ev.tool && (
                                <span style={{ color: "var(--muted)", fontSize: "11px" }}>{ev.tool}</span>
                              )}
                            </div>
                            {showEventsDetail && (
                              <div style={{ color: "var(--muted)", fontSize: "11px", marginTop: "2px", fontFamily: "monospace", wordBreak: "break-all" }}>
                                {ev.event_id?.substring(0, 16)}...
                              </div>
                            )}
                          </div>
                          <span style={{ color: "var(--subtle)", fontSize: "10px", flexShrink: 0 }}>
                            #{idx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--panel-soft)",
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Activity size={14} style={{ color: "var(--accent)" }} />
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: "10px" }}>Duration</div>
                    <div style={{ fontWeight: 600 }}>{result.execution_duration}s</div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--panel-soft)",
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <ShieldCheck size={14} style={{ color: "#10b981" }} />
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: "10px" }}>SHA-256 Events</div>
                    <div style={{ fontWeight: 600 }}>{result.provenance_events_count}</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  className="button"
                  onClick={() => onNavigate && onNavigate("workflow")}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <Layers size={14} />
                  <span>View Graph</span>
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => onNavigate && onNavigate("history")}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <Clock size={14} />
                  <span>History</span>
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => onNavigate && onNavigate("reports")}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <FileText size={14} />
                  <span>Reports</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "40px 20px", textAlign: "center" }}>
              <div>
                <Sparkles size={36} style={{ color: "var(--muted)", margin: "0 auto 12px", opacity: 0.5 }} />
                <h4 style={{ margin: "0 0 6px", color: "var(--text)" }}>Ready for Execution</h4>
                <p style={{ fontSize: "12px", color: "var(--muted)", maxWidth: "300px", margin: "0 auto" }}>
                  Enter your workflow parameters on the left and click "RUN AI WORKFLOW" to start live agent execution.
                </p>
                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    fontSize: "12px",
                    color: "var(--muted)",
                    textAlign: "left",
                    maxWidth: "280px",
                    margin: "20px auto 0",
                  }}
                >
                  {[
                    "Calls Google Gemini LLM via LangChain",
                    "Records 8 cryptographic provenance events",
                    "Updates SHA-256 chain on disk",
                    "Syncs with Neo4j graph database",
                    "Generates downloadable audit report",
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <ArrowRight size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
