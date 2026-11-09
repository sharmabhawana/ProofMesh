import { useState, useEffect } from "react";
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  Eye,
  X,
  Layers,
  FileText,
} from "lucide-react";
import dashboardService from "../services/dashboardService";

export default function WorkflowHistory({ onNavigate }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getWorkflows();
      setWorkflows(data);
    } catch (err) {
      console.error("Failed to load workflow history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch =
      w.workflow_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.workflow_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="badge">Execution Telemetry</span>
          <h2>Workflow History</h2>
          <p>
            Review all autonomous AI workflows executed under your ProofMesh account, complete with
            runtime durations, provenance event counts, and cryptographic outputs.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={fetchWorkflows}
            disabled={loading}
            style={{ height: "38px" }}
          >
            <RotateCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => onNavigate && onNavigate("create-workflow")}
            style={{ height: "38px" }}
          >
            <span>+ Create Workflow</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="panel" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search workflows by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                height: "38px",
                paddingLeft: "36px",
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: "38px",
              minWidth: "160px",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            Loading workflow history from PostgreSQL...
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            No workflows found. Run your first AI workflow from the "Create Workflow" page.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--panel-soft)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Workflow Name</th>
                  <th style={{ padding: "12px 16px" }}>Workflow ID</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px" }}>Started At</th>
                  <th style={{ padding: "12px 16px" }}>Duration</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkflows.map((wf) => (
                  <tr
                    key={wf.id}
                    style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{wf.workflow_name}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--muted)" }}>
                      {wf.workflow_id}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        className="badge"
                        style={{
                          background:
                            wf.status === "completed"
                              ? "rgba(16, 185, 129, 0.15)"
                              : wf.status === "failed"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(59, 130, 246, 0.15)",
                          color:
                            wf.status === "completed"
                              ? "#10b981"
                              : wf.status === "failed"
                              ? "#ef4444"
                              : "#3b82f6",
                          border: "none",
                        }}
                      >
                        {wf.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted)" }}>
                      {wf.started_at ? new Date(wf.started_at).toLocaleString() : "N/A"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {wf.execution_duration ? `${wf.execution_duration}s` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        type="button"
                        className="button"
                        onClick={() => setSelectedWorkflow(wf)}
                        style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedWorkflow && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
            zIndex: 1000,
          }}
          onClick={() => setSelectedWorkflow(null)}
        >
          <div
            className="panel"
            style={{ width: "100%", maxWidth: "600px", maxHeight: "85vh", overflowY: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px" }}>{selectedWorkflow.workflow_name}</h3>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "monospace" }}>
                  {selectedWorkflow.workflow_id}
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedWorkflow(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px" }}>
              <div>
                <strong style={{ display: "block", color: "var(--muted)", marginBottom: "4px" }}>Task Prompt</strong>
                <div style={{ padding: "10px", background: "var(--panel-soft)", borderRadius: "6px" }}>
                  {selectedWorkflow.description}
                </div>
              </div>

              {selectedWorkflow.results_summary && (
                <div>
                  <strong style={{ display: "block", color: "var(--muted)", marginBottom: "4px" }}>Agent Output</strong>
                  <div style={{ padding: "12px", background: "var(--panel-soft)", borderRadius: "6px", lineHeight: "1.5" }}>
                    {typeof selectedWorkflow.results_summary === "object"
                      ? selectedWorkflow.results_summary.output
                      : selectedWorkflow.results_summary}
                  </div>
                </div>
              )}

              {selectedWorkflow.error_message && (
                <div>
                  <strong style={{ display: "block", color: "#ef4444", marginBottom: "4px" }}>Error Details</strong>
                  <div style={{ padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "6px", color: "#ef4444" }}>
                    {selectedWorkflow.error_message}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", color: "var(--muted)" }}>
                <div>Started: {selectedWorkflow.started_at || "N/A"}</div>
                <div>Completed: {selectedWorkflow.completed_at || "N/A"}</div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setSelectedWorkflow(null);
                    if (onNavigate) onNavigate("workflow");
                  }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <Layers size={14} />
                  <span>Explore Graph</span>
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    setSelectedWorkflow(null);
                    if (onNavigate) onNavigate("reports");
                  }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <FileText size={14} />
                  <span>View Reports</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

