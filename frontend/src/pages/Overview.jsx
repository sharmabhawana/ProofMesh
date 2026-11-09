import {
  ShieldCheck,
  LockKeyhole,
  Network,
  GitBranch,
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock,
  Server,
  Database,
  ExternalLink,
  Play,
  Upload,
  FileText,
} from "lucide-react";
import StatCard from "../components/StatCard";
import TrustGauge from "../components/TrustGauge";
import WorkflowGraph from "../components/WorkflowGraph";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function Overview({
  dashboardData,
  isLoading,
  error,
  onRefresh,
  onNavigate,
}) {
  if (isLoading && !dashboardData.trust) {
    return <LoadingState message="Loading ProofMesh executive overview..." />;
  }

  if (error && !dashboardData.trust && !dashboardData.workflow) {
    return (
      <ErrorState
        title="Failed to load dashboard overview"
        message={error}
        onRetry={onRefresh}
      />
    );
  }

  const {
    trust,
    integrity,
    workflow,
    impact,
    health,
  } = dashboardData;

  const trustScore = trust?.trust_score;
  const trustCategory = trust?.trust_category || "Moderate";
  const integrityVerified = integrity?.integrity_verified ?? false;

  const totalNodes = workflow?.total_nodes ?? workflow?.nodes?.length ?? 0;
  const totalRels =
    workflow?.total_relationships ?? workflow?.relationships?.length ?? 0;
  const affectedCount =
    impact?.affected_decision_count ?? impact?.affected_decisions?.length ?? 0;

  const metrics = trust?.metrics || {};

  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Welcome Banner */}
      <div
        className="welcome-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div className="eyebrow">AI AGENT OBSERVABILITY & INTEGRITY PLATFORM</div>
          <h1 style={{ fontSize: "26px", fontWeight: 750, color: "var(--text)", margin: "4px 0" }}>
            Executive Provenance Overview
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0, maxWidth: 640 }}>
            Cryptographically verify AI agent actions, inspect causal dependency paths, and evaluate trust metrics using tamper-evident provenance logs.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            fontSize: "12px",
            color: "var(--muted)",
          }}
        >
          <Clock size={15} style={{ color: "var(--accent)" }} />
          <span>Real-time API sync active</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
        }}
      >
        {[
          {
            id: "create-workflow",
            label: "Run AI Workflow",
            desc: "Execute a live Gemini agent task",
            icon: Play,
            accent: "var(--accent)",
            bg: "var(--accent-soft)",
          },
          {
            id: "upload",
            label: "Upload Agent Data",
            desc: "Analyze external provenance logs",
            icon: Upload,
            accent: "#10b981",
            bg: "rgba(16,185,129,0.1)",
          },
          {
            id: "reports",
            label: "View Reports",
            desc: "Download and inspect run reports",
            icon: FileText,
            accent: "#a78bfa",
            bg: "rgba(167,139,250,0.1)",
          },
          {
            id: "agent-explorer",
            label: "Agent Explorer",
            desc: "Browse agent event traces",
            icon: Network,
            accent: "#f59e0b",
            bg: "rgba(245,158,11,0.1)",
          },
        ].map(({ id, label, desc, icon: Icon, accent, bg }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "16px 18px",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.18s, background 0.18s",
              color: "var(--text)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.background = bg;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--panel)";
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "10px",
                background: bg,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                color: accent,
              }}
            >
              <Icon size={18} />
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "13px", fontWeight: 650, color: "var(--text)", whiteSpace: "nowrap" }}>
                {label}
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {desc}
              </div>
            </div>
            <ArrowRight size={14} style={{ marginLeft: "auto", color: "var(--muted)", flexShrink: 0 }} />
          </button>
        ))}
      </div>

      {/* KPI Stats Grid */}
      <section className="stats-grid">
        <StatCard
          label="Overall Trust Score"
          value={trustScore != null ? `${trustScore}/100` : "--"}
          detail={`${trustCategory} trust classification`}
          icon={ShieldCheck}
          status={trustCategory === "High" ? "online" : "warning"}
        />
        <StatCard
          label="SHA-256 Integrity"
          value={integrity ? (integrityVerified ? "VERIFIED" : "ATTENTION") : "--"}
          detail={integrity?.message || "Cryptographic hash chain status"}
          icon={LockKeyhole}
          status={integrityVerified ? "online" : "warning"}
        />
        <StatCard
          label="Workflow Graph Nodes"
          value={totalNodes}
          detail={`${totalRels} directed dependencies`}
          icon={Network}
        />
        <StatCard
          label="Affected Decisions"
          value={affectedCount}
          detail="Identified via impact graph traversal"
          icon={GitBranch}
        />
      </section>

      {/* Two Column Section: Trust Breakdown & Cryptographic Integrity */}
      <div className="two-column" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
        {/* Trust Assessment Card */}
        <article
          className="panel"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="eyebrow">WEIGHTED METRICS</span>
              <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "2px 0 0" }}>
                Trust Score Assessment
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("trust")}
              className="button button-sm button-secondary"
              title="View full Trust Analytics"
            >
              <span>Details</span>
              <ExternalLink size={13} />
            </button>
          </div>

          <TrustGauge
            score={trustScore}
            category={trustCategory}
            size={200}
            showNote={false}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Object.entries(metrics).map(([key, metric]) => {
              const label = key.replaceAll("_", " ");
              const score = metric.score ?? 0;
              return (
                <div key={key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ textTransform: "capitalize", color: "var(--muted)" }}>
                      {label}
                    </span>
                    <strong style={{ color: "var(--text)" }}>{score}/100</strong>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--track)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${score}%`,
                        height: "100%",
                        background:
                          score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : "#f59e0b",
                        borderRadius: 3,
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Cryptographic Integrity Status Card */}
        <article
          className="panel"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="eyebrow">SHA-256 HASH CHAIN</span>
              <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "2px 0 0" }}>
                Integrity Verification Center
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("integrity")}
              className="button button-sm button-secondary"
              title="View full Integrity Center"
            >
              <span>Inspect Chain</span>
              <ExternalLink size={13} />
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              padding: "18px",
              background: integrityVerified
                ? "rgba(16, 185, 129, 0.08)"
                : "rgba(239, 68, 68, 0.08)",
              border: `1px solid ${
                integrityVerified
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              }`,
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: integrityVerified ? "#10b981" : "#ef4444",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              {integrityVerified ? <CheckCircle2 size={26} /> : <LockKeyhole size={26} />}
            </div>
            <div>
              <h4 style={{ margin: "0 0 4px", fontSize: "15px", color: "var(--text)" }}>
                {integrityVerified
                  ? "Hash Chain & Logs Verified"
                  : "Integrity Verification Failed"}
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
                {integrity?.message ||
                  "Cryptographic verification ensures that provenance events have not been altered."}
              </p>
            </div>
          </div>

          {/* Details breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Hash Algorithm</span>
              <strong style={{ color: "var(--text)", fontFamily: "monospace" }}>SHA-256</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Tampering Detected</span>
              <strong style={{ color: integrity?.tampering_detected ? "#ef4444" : "#10b981" }}>
                {integrity?.tampering_detected ? "YES - ALERT" : "NO"}
              </strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>FastAPI Status</span>
              <strong style={{ color: health?.status === "healthy" ? "#10b981" : "#f59e0b" }}>
                {health?.status === "healthy" ? "HEALTHY" : "CHECK REQUIRED"}
              </strong>
            </div>
          </div>

          <p style={{ fontSize: "11px", color: "var(--subtle)", margin: 0, lineHeight: 1.4 }}>
            * Note: Successful hash-chain verification guarantees consistency with the stored genesis chain; it does not replace third-party attestations against full-file rewriting.
          </p>
        </article>
      </div>

      {/* Workflow Graph Preview */}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span className="eyebrow">GRAPH OBSERVABILITY</span>
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "2px 0 0" }}>
              Agent Workflow & Provenance Topology
            </h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
              Interactive topology retrieved live from Neo4j ({totalNodes} nodes, {totalRels} relationships)
            </p>
          </div>

          <button
            onClick={() => onNavigate("workflow")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 650,
              cursor: "pointer",
            }}
          >
            <span>Open Explorer</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <WorkflowGraph
          nodes={workflow?.nodes || []}
          relationships={workflow?.relationships || []}
          height="380px"
          onSelectNode={() => onNavigate("workflow")}
        />
      </section>

      {/* System Health Quick Glance */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            padding: "16px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "8px",
              background: "rgba(59, 130, 246, 0.12)",
              color: "#3b82f6",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Server size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
              FastAPI Engine
            </div>
            <strong style={{ fontSize: "14px", color: "var(--text)" }}>
              {health ? "Operational" : "Offline"}
            </strong>
          </div>
        </div>

        <div
          style={{
            padding: "16px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#10b981",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Database size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
              Neo4j Graph DB
            </div>
            <strong style={{ fontSize: "14px", color: "var(--text)" }}>
              {workflow ? "Connected (5 Nodes)" : "Disconnected"}
            </strong>
          </div>
        </div>

        <div
          style={{
            padding: "16px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "8px",
              background: "rgba(139, 92, 246, 0.12)",
              color: "#8b5cf6",
              display: "grid",
              placeItems: "center",
            }}
          >
            <LockKeyhole size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
              SHA-256 Ledger
            </div>
            <strong style={{ fontSize: "14px", color: "var(--text)" }}>
              {integrityVerified ? "Chain Valid" : "Unverified"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

