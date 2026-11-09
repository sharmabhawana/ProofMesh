import { useState, useEffect } from "react";
import {
  Upload as UploadIcon,
  FileCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCw,
  Eye,
  Lock,
  Layers,
  X,
  Database,
  Sparkles,
  BarChart2,
} from "lucide-react";
import dashboardService from "../services/dashboardService";

export default function UploadCenter({ onNavigate, onSelectUploadForGraph }) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "generate"

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Synthetic generator state
  const [genProfile, setGenProfile] = useState("normal_execution");
  const [genTargetEvents, setGenTargetEvents] = useState(100);
  const [genSeed, setGenSeed] = useState(42);
  const [genLoading, setGenLoading] = useState(false);

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Inspection modal state
  const [inspectUpload, setInspectUpload] = useState(null);
  const [uploadEvents, setUploadEvents] = useState([]);
  const [integrityResult, setIntegrityResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getUploads();
      setUploads(data);
    } catch (err) {
      console.error("Failed to fetch uploads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccessMsg(null);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a valid execution log file (JSON, JSONL, CSV, TXT, or ZIP).");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await dashboardService.uploadAgentData(selectedFile);
      setSuccessMsg(
        `Successfully ingested ${result.filename}! Extracted ${result.total_events} events across ${result.total_agents} agent(s). Snapshot SHA-256: ${result.snapshot_sha256.substring(0, 16)}...`
      );
      setSelectedFile(null);
      fetchUploads();
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Failed to process upload. Please verify the file format."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSynthetic = async (e) => {
    e.preventDefault();
    setGenLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await dashboardService.generateDataset({
        profile: genProfile,
        target_events: parseInt(genTargetEvents, 10),
        seed: parseInt(genSeed, 10),
        save_to_upload_center: true,
      });

      setSuccessMsg(
        `Generated synthetic dataset '${result.dataset_name}' (${result.total_events} events)! Automatically ingested as ${result.saved_upload_id}.`
      );
      fetchUploads();
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Failed to generate synthetic dataset."
      );
    } finally {
      setGenLoading(false);
    }
  };

  const handleInspect = async (upload) => {
    setInspectUpload(upload);
    setIntegrityResult(null);
    setValidationResult(null);
    try {
      const events = await dashboardService.getUploadEvents(upload.upload_id);
      setUploadEvents(events);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  const handleVerifyIntegrity = async (uploadId) => {
    try {
      const result = await dashboardService.getUploadIntegrity(uploadId);
      setIntegrityResult(result);
    } catch (err) {
      console.error("Integrity check failed:", err);
    }
  };

  const handleAuditDataset = async (uploadId) => {
    setValidating(true);
    try {
      const result = await dashboardService.validateDataset({ upload_id: uploadId });
      setValidationResult(result);
    } catch (err) {
      console.error("Dataset audit failed:", err);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="badge">External Provenance Ingestion</span>
          <h2>Customer Data Upload Center</h2>
          <p>
            Upload external AI-agent execution logs to parse provenance events, verify snapshot
            integrity, and generate interactive provenance relationship graphs.
          </p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={fetchUploads}
          disabled={loading}
          style={{ height: "38px" }}
        >
          <RotateCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Ingestion Mode Tabs */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: activeTab === "upload" ? "var(--accent)" : "var(--panel)",
            color: activeTab === "upload" ? "#fff" : "var(--text)",
            fontWeight: 650,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <UploadIcon size={16} />
          <span>Upload Customer Log</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("generate")}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: activeTab === "generate" ? "var(--accent)" : "var(--panel)",
            color: activeTab === "generate" ? "#fff" : "var(--text)",
            fontWeight: 650,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Sparkles size={16} />
          <span>Synthetic Dataset Generator (10 Profiles)</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Main Action Panel: Upload Form or Synthetic Generator */}
        {activeTab === "upload" ? (
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Upload Agent Execution Logs</h3>
                <p>Supported formats: JSON, JSONL, CSV, TXT, ZIP (Max: 25 MB)</p>
              </div>
              <UploadIcon size={20} style={{ color: "var(--accent)" }} />
            </div>

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "8px",
                  color: "#10b981",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: "10px",
                  padding: "30px 20px",
                  textAlign: "center",
                  background: "var(--panel-soft)",
                  cursor: "pointer",
                }}
                onClick={() => document.getElementById("file-upload-input").click()}
              >
                <FileText size={36} style={{ color: "var(--accent)", margin: "0 auto 10px" }} />
                <div style={{ fontWeight: 650, fontSize: "14px", color: "var(--text)" }}>
                  {selectedFile ? selectedFile.name : "Click to select or drop agent log files"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                    : "JSON, JSONL, CSV, TXT, or ZIP"}
                </div>
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".json,.jsonl,.csv,.txt,.zip"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="button button-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px",
                  fontWeight: 650,
                  fontSize: "13px",
                  cursor: uploading || !selectedFile ? "not-allowed" : "pointer",
                  opacity: uploading || !selectedFile ? 0.6 : 1,
                }}
              >
                <UploadIcon size={16} />
                <span>{uploading ? "Ingesting & Analyzing..." : "Upload & Validate Provenance"}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Controlled Synthetic Dataset Generator</h3>
                <p>Generate reproducible benchmarks with valid hash chains</p>
              </div>
              <Sparkles size={20} style={{ color: "var(--accent)" }} />
            </div>

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "8px",
                  color: "#10b981",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleGenerateSynthetic} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 650, marginBottom: "6px", color: "var(--text)" }}>
                  Scenario Profile:
                </label>
                <select
                  value={genProfile}
                  onChange={(e) => setGenProfile(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--panel-soft)",
                    color: "var(--text)",
                    fontSize: "13px",
                  }}
                >
                  <option value="normal_execution">Normal Execution (Baseline End-to-End)</option>
                  <option value="multi_agent_execution">Multi-Agent Collaboration (Orchestrator, Researcher, Auditor)</option>
                  <option value="missing_provenance">Missing Provenance (Completeness Penalty Test)</option>
                  <option value="unreliable_source">Unreliable Source (Untrusted External API Test)</option>
                  <option value="tool_failure">Tool Failure (Timeout & Exception Recovery)</option>
                  <option value="integrity_tampering">Integrity Tampering (Isolated Tamper Detection)</option>
                  <option value="conflicting_evidence">Conflicting Evidence (Multi-Source Discrepancy)</option>
                  <option value="incomplete_execution">Incomplete Execution (Abrupt Termination)</option>
                  <option value="large_workflow">Large Workflow (High Volume Benchmark)</option>
                  <option value="mixed_execution">Mixed Execution (Realistic Multi-Branch Trace)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 650, marginBottom: "6px", color: "var(--text)" }}>
                    Target Scale:
                  </label>
                  <select
                    value={genTargetEvents}
                    onChange={(e) => setGenTargetEvents(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--panel-soft)",
                      color: "var(--text)",
                      fontSize: "13px",
                    }}
                  >
                    <option value={100}>Small — 100 Events</option>
                    <option value={1000}>Medium — 1,000 Events</option>
                    <option value={10000}>Large — 10,000 Events</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 650, marginBottom: "6px", color: "var(--text)" }}>
                    Random Seed:
                  </label>
                  <input
                    type="number"
                    value={genSeed}
                    onChange={(e) => setGenSeed(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--panel-soft)",
                      color: "var(--text)",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={genLoading}
                className="button button-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px",
                  fontWeight: 650,
                  fontSize: "13px",
                  cursor: genLoading ? "not-allowed" : "pointer",
                  opacity: genLoading ? 0.6 : 1,
                  marginTop: "6px",
                }}
              >
                <Sparkles size={16} />
                <span>{genLoading ? "Synthesizing Dataset..." : "Generate Controlled Dataset"}</span>
              </button>
            </form>
          </div>
        )}

        {/* Security & Cryptographic Notice */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Cryptographic Verification Notice</h3>
              <p>Understanding ProofMesh ingestion safeguards</p>
            </div>
            <Lock size={20} style={{ color: "var(--accent)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "var(--muted)", lineHeight: 1.6 }}>
            <p>
              ProofMesh strictly prohibits execution of arbitrary uploaded code. Only structured telemetry
              records and text logs are parsed into verifiable provenance schemas.
            </p>
            <div style={{ padding: "12px", background: "var(--panel-soft)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <strong style={{ color: "var(--text)", display: "block", marginBottom: "4px" }}>
                Snapshot Ingestion Hashing:
              </strong>
              Upon upload, a SHA-256 digest is immediately computed over raw bytes. This proves consistency against
              subsequent storage modification, but does not verify historical pre-upload truth unless external cryptographic signatures accompany the file.
            </div>
            <div style={{ padding: "12px", background: "var(--panel-soft)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <strong style={{ color: "var(--text)", display: "block", marginBottom: "4px" }}>
                Automatic Isolation:
              </strong>
              Uploaded records are strictly isolated by customer account ID, preventing accidental crossover with live execution logs or other customer workloads.
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded History Table */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div className="panel-header" style={{ padding: "16px 20px" }}>
          <div>
            <h3>Uploaded Datasets</h3>
            <p>Customer-ingested provenance logs and validation audits</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            Loading upload history...
          </div>
        ) : uploads.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            No agent data uploaded yet. Select a file above to begin external provenance exploration.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--panel-soft)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Filename</th>
                  <th style={{ padding: "12px 16px" }}>Upload ID</th>
                  <th style={{ padding: "12px 16px" }}>Format</th>
                  <th style={{ padding: "12px 16px" }}>Total Events</th>
                  <th style={{ padding: "12px 16px" }}>Agents</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{u.original_filename}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--muted)" }}>
                      {u.upload_id}
                    </td>
                    <td style={{ padding: "12px 16px", textTransform: "uppercase", fontSize: "12px" }}>
                      {u.file_type}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{u.total_events}</td>
                    <td style={{ padding: "12px 16px" }}>{u.total_agents}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        className="badge"
                        style={{
                          background: u.processing_status === "processed" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: u.processing_status === "processed" ? "#10b981" : "#ef4444",
                          border: "none",
                        }}
                      >
                        {u.processing_status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="button"
                          onClick={() => handleInspect(u)}
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                        >
                          <Eye size={13} style={{ marginRight: "4px" }} />
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {inspectUpload && (
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
          onClick={() => setInspectUpload(null)}
        >
          <div
            className="panel"
            style={{ width: "100%", maxWidth: "700px", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px" }}>{inspectUpload.original_filename}</h3>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "monospace" }}>
                  {inspectUpload.upload_id}
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setInspectUpload(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="button"
                onClick={() => handleVerifyIntegrity(inspectUpload.upload_id)}
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
              >
                <Lock size={14} />
                <span>Verify Snapshot Digest</span>
              </button>
              <button
                type="button"
                className="button"
                onClick={() => handleAuditDataset(inspectUpload.upload_id)}
                disabled={validating}
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
              >
                <FileCheck size={14} />
                <span>{validating ? "Auditing Schema..." : "Audit Quality & Completeness"}</span>
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setInspectUpload(null);
                  if (onSelectUploadForGraph) onSelectUploadForGraph(inspectUpload.upload_id);
                  if (onNavigate) onNavigate("workflow");
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
              >
                <Layers size={14} />
                <span>Visualize in Graph</span>
              </button>
            </div>

            {/* Dataset Quality Validation Card */}
            {validationResult && (
              <div
                style={{
                  padding: "14px",
                  background: validationResult.valid ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                  border: `1px solid ${validationResult.valid ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ color: validationResult.valid ? "#10b981" : "#ef4444", fontSize: "13px" }}>
                    {validationResult.valid ? "✓ Schema & Provenance Audit PASSED" : "⚠ Quality Issues Detected"}
                  </strong>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: "var(--panel-soft)",
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    Completeness: {validationResult.completeness_score}% ({validationResult.completeness_classification})
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", margin: "8px 0" }}>
                  <div style={{ padding: "6px 8px", background: "var(--panel)", borderRadius: "6px" }}>
                    <strong>Total Events:</strong> {validationResult.total_events}
                  </div>
                  <div style={{ padding: "6px 8px", background: "var(--panel)", borderRadius: "6px" }}>
                    <strong>Missing Fields:</strong> {validationResult.missing_fields_count}
                  </div>
                  <div style={{ padding: "6px 8px", background: "var(--panel)", borderRadius: "6px" }}>
                    <strong>Duplicates:</strong> {validationResult.duplicate_count}
                  </div>
                </div>
                {validationResult.causal_relationship_issues && validationResult.causal_relationship_issues.length > 0 && (
                  <div style={{ color: "#ef4444", marginTop: "6px" }}>
                    {validationResult.causal_relationship_issues.map((iss, idx) => (
                      <div key={idx}>• {iss}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {integrityResult && (
              <div
                style={{
                  padding: "12px",
                  background: integrityResult.verified ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${integrityResult.verified ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ display: "block", color: integrityResult.verified ? "#10b981" : "#ef4444" }}>
                  {integrityResult.verified ? "✓ Snapshot Integrity PASS" : "✕ Tampering Detected"}
                </strong>
                <div>Hash: {integrityResult.current_snapshot_hash}</div>
                <div style={{ color: "var(--muted)", marginTop: "4px" }}>{integrityResult.explanation}</div>
              </div>
            )}

            <div style={{ fontSize: "13px" }}>
              <h4 style={{ margin: "0 0 10px" }}>Extracted Provenance Events ({uploadEvents.length})</h4>
              <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {uploadEvents.map((ev, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px",
                      background: "var(--panel-soft)",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 650, color: "var(--accent)" }}>{ev.event_type}</span>
                      <span style={{ color: "var(--muted)" }}>{ev.timestamp}</span>
                    </div>
                    {ev.tool && <div><strong>Tool:</strong> {ev.tool}</div>}
                    {ev.output && <div style={{ color: "var(--muted)", marginTop: "2px" }}><strong>Output:</strong> {String(ev.output).substring(0, 100)}...</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

