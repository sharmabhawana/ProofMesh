import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  Play,
  AlertTriangle,
  CheckCircle2,
  Database,
  ArrowRight,
  ShieldAlert,
  Info,
  RefreshCw,
} from "lucide-react";
import dashboardService from "../services/dashboardService";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function ImpactAnalysis({
  workflowData,
  initialSelection = null,
}) {
  const [selectedNodeType, setSelectedNodeType] = useState(
    initialSelection?.node_type || "DataSource"
  );
  const [selectedNodeId, setSelectedNodeId] = useState(
    initialSelection?.node_id || "controlled_proofmesh_knowledge_base"
  );
  const [unreliableSim, setUnreliableSim] = useState(false);
  const [checkIntegrity, setCheckIntegrity] = useState(true);

  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Extract available sources from actual Neo4j workflow nodes
  const availableSources = (workflowData?.nodes || []).filter(
    (n) => n.type === "DataSource" || n.type === "Agent"
  );

  const runAnalysis = useCallback(async () => {
    if (!selectedNodeId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await dashboardService.getImpactAnalysis({
        node_type: selectedNodeType,
        node_id: selectedNodeId,
        unreliable: unreliableSim,
        check_integrity: checkIntegrity,
      });
      setImpactData(data);
    } catch (err) {
      setError(
        "Analysis failed: " +
          (err?.response?.data?.detail || err?.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  }, [selectedNodeType, selectedNodeId, unreliableSim, checkIntegrity]);

  // Run on initial mount
  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  return (
    <div
      className="page-container"
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* Header & Control Bar */}
      <div
        className="impact-control-bar"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div>
          <div className="eyebrow">DEPENDENCY TRAVERSAL ENGINE</div>
          <h2 style={{ fontSize: "22px", fontWeight: 750, color: "var(--text)", margin: "4px 0" }}>
            Downstream Impact Analysis
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0, maxWidth: 680 }}>
            Trace directed graph dependencies from a root data source or agent to identify decisions potentially affected by corrupted, biased, or untrusted inputs.
          </p>
        </div>

        {/* Interactive Controls Form */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "16px",
            flexWrap: "wrap",
            paddingTop: "12px",
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* Source Selector */}
          <div style={{ flex: "1 1 260px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 650,
                color: "var(--text)",
                marginBottom: "6px",
              }}
            >
              Select Target Source Node
            </label>
            <select
              value={selectedNodeId}
              onChange={(e) => {
                const targetId = e.target.value;
                setSelectedNodeId(targetId);
                const found = availableSources.find((s) => String(s.id) === targetId);
                if (found) setSelectedNodeType(found.type);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--panel-soft)",
                color: "var(--text)",
                fontSize: "13px",
                outline: "none",
              }}
            >
              {availableSources.length > 0 ? (
                availableSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.type}] {s.properties?.name || s.id}
                  </option>
                ))
              ) : (
                <option value="controlled_proofmesh_knowledge_base">
                  controlled_proofmesh_knowledge_base
                </option>
              )}
            </select>
          </div>

          {/* Simulation Toggles */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={unreliableSim}
                onChange={(e) => setUnreliableSim(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
              />
              <span>Simulate Unreliable Source</span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={checkIntegrity}
                onChange={(e) => setCheckIntegrity(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
              />
              <span>Check Chain Integrity</span>
            </label>
          </div>

          {/* Run Button */}
          <button
            onClick={runAnalysis}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 650,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
            }}
          >
            <Play size={14} />
            <span>{loading ? "Analyzing..." : "Execute Traversal"}</span>
          </button>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Impact analysis failed"
          message={error}
          onRetry={runAnalysis}
        />
      )}

      {loading && !impactData && (
        <LoadingState message="Executing breadth-first graph traversal..." />
      )}

      {impactData && (
        <>
          {/* Analysis Metrics Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div
              style={{
                padding: "20px",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
                Target Source
              </div>
              <strong style={{ fontSize: "16px", color: "var(--text)", wordBreak: "break-all" }}>
                {impactData.start_node?.name || selectedNodeId}
              </strong>
              <div style={{ fontSize: "11px", color: "var(--accent)", marginTop: "4px" }}>
                Type: {impactData.start_node?.node_type || selectedNodeType}
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
                Nodes Visited
              </div>
              <strong style={{ fontSize: "24px", color: "var(--text)" }}>
                {impactData.nodes_visited ?? 0}
              </strong>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                Traversal depth reachable
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
                Potentially Affected Decisions
              </div>
              <strong style={{ fontSize: "24px", color: "#f59e0b" }}>
                {impactData.affected_decision_count ?? 0}
              </strong>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                Decisions downstream of node
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
                Simulation Status
              </div>
              <strong
                style={{
                  fontSize: "16px",
                  color: impactData.unreliable_source_test ? "#ef4444" : "#10b981",
                }}
              >
                {impactData.unreliable_source_test ? "FLAGGED UNRELIABLE" : "STANDARD ANALYSIS"}
              </strong>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                Chain verify: {checkIntegrity ? "Enabled" : "Disabled"}
              </div>
            </div>
          </div>

          {/* Affected Decisions List */}
          <section
            className="panel"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldAlert size={20} style={{ color: "#f59e0b" }} />
              <h3 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
                Decisions Requiring Audit ({impactData.affected_decisions?.length || 0})
              </h3>
            </div>

            {impactData.affected_decisions?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {impactData.affected_decisions.map((decision, index) => {
                  const statusColors = {
                    POTENTIALLY_AFFECTED: { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b" },
                    FLAGGED_UNRELIABLE_SOURCE: { bg: "rgba(239, 68, 68, 0.12)", text: "#ef4444" },
                    FLAGGED_INTEGRITY_REVIEW: { bg: "rgba(139, 92, 246, 0.12)", text: "#8b5cf6" },
                  };
                  const colors = statusColors[decision.status] || {
                    bg: "rgba(100, 116, 139, 0.12)",
                    text: "#94a3b8",
                  };

                  return (
                    <article
                      key={index}
                      style={{
                        padding: "16px 20px",
                        background: "var(--panel-soft)",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <strong style={{ fontSize: "14px", color: "var(--text)" }}>
                          {decision.name || decision.node_id}
                        </strong>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "12px",
                            background: colors.bg,
                            color: colors.text,
                          }}
                        >
                          {decision.status}
                        </span>
                      </div>

                      <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                        {decision.reason}
                      </p>

                      {/* Dependency Path Chain */}
                      {decision.dependency_path?.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            padding: "8px 12px",
                            background: "var(--panel)",
                            borderRadius: "6px",
                            fontSize: "11px",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <span style={{ color: "var(--subtle)", fontWeight: 600 }}>Path:</span>
                          {decision.dependency_path.map((step, sIdx) => (
                            <span key={sIdx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ color: "var(--accent)", fontWeight: 600 }}>{step}</span>
                              {sIdx < decision.dependency_path.length - 1 && (
                                <ArrowRight size={12} style={{ color: "var(--muted)" }} />
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  background: "var(--panel-soft)",
                  borderRadius: "10px",
                  color: "var(--muted)",
                  fontSize: "13px",
                }}
              >
                No downstream decisions are reachable from this node in the directed Neo4j provenance graph.
              </div>
            )}
          </section>

          {/* Scientific Causal Disclaimer */}
          <div
            style={{
              padding: "16px 20px",
              background: "var(--panel-soft)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "12px",
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text)", fontWeight: 700, marginBottom: "4px" }}>
              <Info size={15} style={{ color: "var(--accent)" }} />
              <span>Scientific Attribution & Causality Principle</span>
            </div>
            Downstream decisions are identified via directed path reachability in the provenance knowledge graph. Reachability establishes potential influence and candidates for audit; it does not constitute independent mathematical proof that the upstream source was the sole or primary cause of a specific LLM output.
          </div>
        </>
      )}
    </div>
  );
}

