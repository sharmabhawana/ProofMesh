import { useState } from "react";
import {
  Activity,
  Server,
  Database,
  LockKeyhole,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
} from "lucide-react";
import dashboardService from "../services/dashboardService";
import LoadingState from "../components/LoadingState";

export default function SystemHealth({
  healthData,
  workflowData,
  integrityData,
  onRefresh,
}) {
  const [latency, setLatency] = useState(null);
  const [pinging, setPinging] = useState(false);

  const measureLatency = async () => {
    setPinging(true);
    const start = performance.now();
    try {
      await dashboardService.getHealth();
      const end = performance.now();
      setLatency(Math.round(end - start));
    } catch {
      setLatency(-1);
    } finally {
      setPinging(false);
    }
  };

  const services = [
    {
      name: "FastAPI Application Server",
      description: "Core REST backend providing provenance endpoints and authentication",
      status: healthData?.status === "healthy" ? "OPERATIONAL" : "DEGRADED",
      isHealthy: healthData?.status === "healthy",
      icon: Server,
      details: [
        { label: "Engine", value: "FastAPI / Uvicorn ASGI" },
        { label: "Response Status", value: healthData?.status || "Unavailable" },
        { label: "Target Host", value: "127.0.0.1:8000" },
      ],
    },
    {
      name: "Neo4j Provenance Graph",
      description: "Graph database storing agent entities, tools, data sources, and causal links",
      status: workflowData?.nodes ? "CONNECTED" : "UNAVAILABLE",
      isHealthy: !!workflowData?.nodes,
      icon: Database,
      details: [
        { label: "Indexed Nodes", value: `${workflowData?.total_nodes ?? workflowData?.nodes?.length ?? 0} Nodes` },
        { label: "Relationships", value: `${workflowData?.total_relationships ?? workflowData?.relationships?.length ?? 0} Edges` },
        { label: "Database Name", value: "proofmesh" },
      ],
    },
    {
      name: "SHA-256 Ledger & Hash Chain",
      description: "Cryptographic hash chain verifying provenance event sequencing and tamper detection",
      status: integrityData?.integrity_verified ? "VERIFIED" : "ATTENTION",
      isHealthy: !!integrityData?.integrity_verified,
      icon: LockKeyhole,
      details: [
        { label: "Algorithm", value: "SHA-256" },
        { label: "Integrity Status", value: integrityData?.status || "Unverified" },
        { label: "Tampering", value: integrityData?.tampering_detected ? "Detected" : "None" },
      ],
    },
    {
      name: "React 19 Dashboard Frontend",
      description: "Modern enterprise client built with React 19, Vite, and Lucide icons",
      status: "ACTIVE",
      isHealthy: true,
      icon: Cpu,
      details: [
        { label: "Runtime", value: "React 19.3.1 (Vite)" },
        { label: "Graph Engine", value: "@xyflow/react v12" },
        { label: "Analytics Library", value: "Recharts v3" },
      ],
    },
  ];

  return (
    <div
      className="page-container"
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* Header Card */}
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div className="eyebrow">DIAGNOSTICS & TELEMETRY</div>
          <h2 style={{ fontSize: "22px", fontWeight: 750, color: "var(--text)", margin: "4px 0" }}>
            Platform System Health
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0, maxWidth: 640 }}>
            Real-time status monitor inspecting API connectivity, Neo4j graph availability, cryptographic ledger consistency, and frontend runtime metrics.
          </p>
        </div>

        {/* Latency Probe Button */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {latency !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "var(--panel-soft)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: 650,
                color: latency > 0 ? "#10b981" : "#ef4444",
              }}
            >
              <Radio size={14} className={pinging ? "spin" : ""} />
              <span>{latency > 0 ? `${latency} ms Latency` : "Connection Failed"}</span>
            </div>
          )}

          <button
            type="button"
            className="button button-primary"
            onClick={measureLatency}
            disabled={pinging}
            style={{ height: "38px" }}
          >
            <Clock size={14} className={pinging ? "spin" : ""} />
            <span>{pinging ? "Pinging..." : "Test API Latency"}</span>
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {services.map((svc) => {
          const Icon = svc.icon;
          return (
            <article
              key={svc.name}
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
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "10px",
                      background: svc.isHealthy
                        ? "rgba(16, 185, 129, 0.12)"
                        : "rgba(239, 68, 68, 0.12)",
                      color: svc.isHealthy ? "#10b981" : "#ef4444",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                      {svc.name}
                    </h4>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: svc.isHealthy ? "#10b981" : "#ef4444",
                      }}
                    >
                      ● {svc.status}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
                {svc.description}
              </p>

              {/* Details table */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  background: "var(--panel-soft)",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                }}
              >
                {svc.details.map((d) => (
                  <div
                    key={d.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                    }}
                  >
                    <span style={{ color: "var(--muted)" }}>{d.label}:</span>
                    <strong style={{ color: "var(--text)" }}>{d.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

