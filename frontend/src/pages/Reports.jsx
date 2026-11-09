import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Search,
  Filter,
  RotateCw,
  CheckCircle2,
  Calendar,
  Lock,
} from "lucide-react";
import dashboardService from "../services/dashboardService";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getReports();
      setReports(data);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownload = async (report) => {
    setDownloadingId(report.report_id);
    try {
      const filename = `${report.report_name.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
      await dashboardService.downloadReport(report.report_id, filename);
    } catch (err) {
      alert("Failed to download report. Check your session permissions.");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.report_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.report_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.workflow_id && r.workflow_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === "all" || r.report_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="badge">Audit & Compliance Artifacts</span>
          <h2>Analytical Reports</h2>
          <p>
            Inspect and securely download cryptographically verified audit reports, including live AI
            workflow provenance trails, ingestion integrity audits, and trust evaluations.
          </p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={fetchReports}
          disabled={loading}
          style={{ height: "38px" }}
        >
          <RotateCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
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
              placeholder="Search reports by name, ID, or workflow..."
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              height: "38px",
              minWidth: "200px",
            }}
          >
            <option value="all">All Report Categories</option>
            <option value="provenance">Provenance Execution</option>
            <option value="upload_validation">Ingestion & Validation</option>
            <option value="trust">Trust Assessment</option>
            <option value="integrity">Integrity Verification</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            Loading audit reports from storage...
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            No reports available yet. Run an AI workflow or ingest agent logs to generate analytical reports.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--panel-soft)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Report Title</th>
                  <th style={{ padding: "12px 16px" }}>Category</th>
                  <th style={{ padding: "12px 16px" }}>Report ID</th>
                  <th style={{ padding: "12px 16px" }}>Generated At</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 650 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FileText size={16} style={{ color: "var(--accent)" }} />
                        <span>{r.report_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="badge" style={{ textTransform: "capitalize" }}>
                        {r.report_type.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--muted)" }}>
                      {r.report_id}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "12px" }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "N/A"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={downloadingId === r.report_id}
                        onClick={() => handleDownload(r)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Download size={13} />
                        <span>{downloadingId === r.report_id ? "Downloading..." : "Download JSON"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

