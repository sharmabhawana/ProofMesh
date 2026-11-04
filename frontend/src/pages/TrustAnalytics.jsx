import {
  ShieldCheck,
  Award,
  Calculator,
  HelpCircle,
  FileCheck2,
  Database,
  LockKeyhole,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import TrustGauge from "../components/TrustGauge";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function TrustAnalytics({
  trustData,
  isLoading,
  error,
  onRefresh,
}) {
  if (isLoading && !trustData) {
    return <LoadingState message="Computing ProofMesh rule-based trust assessment..." />;
  }

  if (error && !trustData) {
    return (
      <ErrorState
        title="Failed to calculate trust analytics"
        message={error}
        onRetry={onRefresh}
      />
    );
  }

  const trustScore = trustData?.trust_score ?? 0;
  const category = trustData?.trust_category || "Low";
  const metrics = trustData?.metrics || {};
  const weights = trustData?.weights || {
    source_reliability: 0.4,
    provenance_completeness: 0.3,
    integrity_verification: 0.3,
  };

  const chartData = [
    {
      name: "Source Reliability",
      score: metrics.source_reliability?.score ?? 0,
      weight: "40%",
      contribution: (
        (metrics.source_reliability?.score ?? 0) * (weights.source_reliability ?? 0.4)
      ).toFixed(1),
      color: "#3b82f6",
    },
    {
      name: "Provenance Completeness",
      score: metrics.provenance_completeness?.score ?? 0,
      weight: "30%",
      contribution: (
        (metrics.provenance_completeness?.score ?? 0) * (weights.provenance_completeness ?? 0.3)
      ).toFixed(1),
      color: "#8b5cf6",
    },
    {
      name: "Integrity Verification",
      score: metrics.integrity_verification?.score ?? 0,
      weight: "30%",
      contribution: (
        (metrics.integrity_verification?.score ?? 0) * (weights.integrity_verification ?? 0.3)
      ).toFixed(1),
      color: "#10b981",
    },
  ];

  return (
    <div
      className="page-container"
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "24px",
        }}
      >
        <div className="eyebrow">MATHEMATICAL PROVENANCE SCORING</div>
        <h2 style={{ fontSize: "22px", fontWeight: 750, color: "var(--text)", margin: "4px 0" }}>
          Trust Analytics & Scoring Engine
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0, maxWidth: 680 }}>
          ProofMesh quantifies autonomous AI trust using a multi-factor provenance model. Scores reflect trace completeness, explicit source attribution, and SHA-256 chain verification.
        </p>
      </div>

      {/* Top Row: Gauge + Formula Breakdown */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Gauge card */}
        <article
          className="panel"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="eyebrow" style={{ marginBottom: "16px" }}>
            COMPOSITE TRUST INDEX
          </span>
          <TrustGauge
            score={trustScore}
            category={category}
            size={220}
            showNote={true}
          />
        </article>

        {/* Formula breakdown card */}
        <article
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Calculator size={18} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
              Scoring Formulation & Weights
            </h3>
          </div>

          <div
            style={{
              padding: "12px 14px",
              background: "var(--panel-soft)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "12px",
              color: "var(--accent)",
              lineHeight: 1.6,
            }}
          >
            Trust Score = (0.40 × Source_Reliability) + (0.30 × Provenance_Completeness) + (0.30 × Integrity_Verification)
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {chartData.map((item) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--panel-soft)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <strong style={{ fontSize: "13px", color: "var(--text)" }}>{item.name}</strong>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Weight: {item.weight} · Score: {item.score}/100
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "14px", fontWeight: 750, color: item.color }}>
                    +{item.contribution}
                  </span>
                  <div style={{ fontSize: "10px", color: "var(--subtle)" }}>pts contribution</div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Contribution Bar Chart */}
      <section
        className="panel"
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
        <h3 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
          Component Contribution Comparison
        </h3>

        <div style={{ height: "260px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
            >
              <XAxis type="number" domain={[0, 100]} stroke="var(--muted)" fontSize={11} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--muted)"
                fontSize={11}
                width={160}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--panel)",
                  borderColor: "var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--text)",
                }}
                formatter={(val) => [`${val}/100`, "Raw Score"]}
              />
              <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Component Metric Details Breakdown Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Source Reliability */}
        <div
          style={{
            padding: "20px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Database size={18} style={{ color: "#3b82f6" }} />
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
              Source Reliability ({metrics.source_reliability?.score ?? 0}/100)
            </h4>
          </div>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
            Measures the percentage of evidence-captured events that explicitly record an identifiable external source.
          </p>
          <div style={{ fontSize: "11px", color: "var(--subtle)" }}>
            Identified Sources: {metrics.source_reliability?.details?.identified_sources ?? 0} /{" "}
            {metrics.source_reliability?.details?.evidence_events ?? 0} evidence events
          </div>
        </div>

        {/* Provenance Completeness */}
        <div
          style={{
            padding: "20px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileCheck2 size={18} style={{ color: "#8b5cf6" }} />
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
              Provenance Completeness ({metrics.provenance_completeness?.score ?? 0}/100)
            </h4>
          </div>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
            Ensures that core schema fields (<code>event_id</code>, <code>timestamp</code>, <code>event_type</code>, <code>agent</code>) are populated on all events.
          </p>
          <div style={{ fontSize: "11px", color: "var(--subtle)" }}>
            Complete Events: {metrics.provenance_completeness?.details?.complete_events ?? 0} /{" "}
            {metrics.provenance_completeness?.details?.total_events ?? 0} total events
          </div>
        </div>

        {/* Integrity Verification */}
        <div
          style={{
            padding: "20px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <LockKeyhole size={18} style={{ color: "#10b981" }} />
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
              Integrity Verification ({metrics.integrity_verification?.score ?? 0}/100)
            </h4>
          </div>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
            Binary score gate: 100 points if the entire SHA-256 genesis hash chain validates without error, 0 points if tampering is detected.
          </p>
          <div style={{ fontSize: "11px", color: "var(--subtle)" }}>
            Chain Status: {metrics.integrity_verification?.message || "Verified"}
          </div>
        </div>
      </div>

      {/* Limitations note */}
      {trustData?.limitations?.length > 0 && (
        <div
          style={{
            padding: "16px 20px",
            background: "var(--panel-soft)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            fontSize: "12px",
            color: "var(--muted)",
          }}
        >
          <strong style={{ color: "var(--text)", display: "block", marginBottom: "6px" }}>
            Rule-Based Provenance Assessment Transparency Notes:
          </strong>
          <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.6 }}>
            {trustData.limitations.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

