import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Eye,
  Database,
  Terminal,
  Activity,
  Layers,
  Calendar,
  X,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ShieldCheck,
  Cpu,
  FileCode,
} from "lucide-react";
import dashboardService from "../services/dashboardService";

export default function AgentDataExplorer() {
  const [uploads, setUploads] = useState([]);
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [events, setEvents] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState(null);

  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Inspection Modal
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalTab, setModalTab] = useState("overview"); // "overview" or "raw"

  // 1. Load user uploads
  const loadUploads = async () => {
    setLoadingUploads(true);
    setError(null);
    try {
      const list = await dashboardService.getUploads();
      setUploads(list || []);
      if (list && list.length > 0) {
        // If current selection is invalid or not set, select first
        if (!selectedUploadId || !list.some((u) => u.upload_id === selectedUploadId)) {
          setSelectedUploadId(list[0].upload_id);
        }
      }
    } catch (err) {
      console.error("Failed to load uploads for explorer:", err);
      setError("Failed to load datasets. Please verify your connection.");
    } finally {
      setLoadingUploads(false);
    }
  };

  useEffect(() => {
    loadUploads();
  }, []);

  // 2. Load events whenever selectedUploadId changes
  const loadEvents = async (uploadId) => {
    if (!uploadId) {
      setEvents([]);
      return;
    }
    setLoadingEvents(true);
    setError(null);
    try {
      const evs = await dashboardService.getUploadEvents(uploadId);
      setEvents(Array.isArray(evs) ? evs : []);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to load events for upload:", err);
      setError("Failed to retrieve events for the selected dataset.");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (selectedUploadId) {
      loadEvents(selectedUploadId);
    }
  }, [selectedUploadId]);

  // Extract unique filters from events
  const { eventTypes, agents, workflows } = useMemo(() => {
    const types = new Set();
    const ags = new Set();
    const wfs = new Set();

    events.forEach((ev) => {
      const t = ev.event_type || ev.type;
      if (t) types.add(t);
      const a = ev.agent || ev.agent_id;
      if (a) ags.add(a);
      const w = ev.workflow_id || ev.metadata?.workflow_id;
      if (w) wfs.add(w);
    });

    return {
      eventTypes: Array.from(types).sort(),
      agents: Array.from(ags).sort(),
      workflows: Array.from(wfs).sort(),
    };
  }, [events]);

  // Filtered and Sorted Events
  const filteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = events.filter((ev) => {
      const eventType = String(ev.event_type || ev.type || "");
      const agent = String(ev.agent || ev.agent_id || "");
      const model = String(ev.model || ev.model_name || "");
      const tool = String(ev.tool || ev.tool_name || "");
      const workflowId = String(ev.workflow_id || ev.metadata?.workflow_id || "");
      const inputStr = typeof ev.input_data === "string" ? ev.input_data : (typeof ev.input === "string" ? ev.input : JSON.stringify(ev.input_data || ev.input || ""));
      const outputStr = typeof ev.output_data === "string" ? ev.output_data : (typeof ev.output === "string" ? ev.output : JSON.stringify(ev.output_data || ev.output || ""));
      const eventId = String(ev.event_id || "");

      const matchesSearch =
        !q ||
        eventType.toLowerCase().includes(q) ||
        agent.toLowerCase().includes(q) ||
        model.toLowerCase().includes(q) ||
        tool.toLowerCase().includes(q) ||
        workflowId.toLowerCase().includes(q) ||
        inputStr.toLowerCase().includes(q) ||
        outputStr.toLowerCase().includes(q) ||
        eventId.toLowerCase().includes(q);

      const matchesType = typeFilter === "all" || eventType === typeFilter;
      const matchesAgent = agentFilter === "all" || agent === agentFilter;
      const matchesWorkflow = workflowFilter === "all" || workflowId === workflowFilter;

      return matchesSearch && matchesType && matchesAgent && matchesWorkflow;
    });

    // Sort by sequence or timestamp
    return filtered.sort((a, b) => {
      const seqA = a.sequence !== undefined ? a.sequence : 0;
      const seqB = b.sequence !== undefined ? b.sequence : 0;
      if (seqA !== seqB) {
        return sortOrder === "asc" ? seqA - seqB : seqB - seqA;
      }
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });
  }, [events, searchTerm, typeFilter, agentFilter, workflowFilter, sortOrder]);

  // Paginated slice
  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  const selectedUpload = uploads.find((u) => u.upload_id === selectedUploadId);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <span className="badge">Telemetry & Execution Trace</span>
          <h2>Agent Data Explorer</h2>
          <p>
            Filter, search, and deeply inspect observable AI-agent execution traces, tool inputs and
            outputs, captured evidence, and decision chains.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="button"
            onClick={() => {
              loadUploads();
              if (selectedUploadId) loadEvents(selectedUploadId);
            }}
            disabled={loadingUploads || loadingEvents}
            title="Refresh datasets and events"
          >
            <RotateCw size={14} className={loadingEvents ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Dataset Selector & Primary Toolbar */}
      <div className="panel" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Active Dataset */}
          <div style={{ flex: "1 1 280px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Active Ingested Dataset:
            </label>
            <select
              value={selectedUploadId}
              onChange={(e) => setSelectedUploadId(e.target.value)}
              style={{ width: "100%", height: "38px" }}
              disabled={loadingUploads}
            >
              {uploads.length === 0 ? (
                <option value="">No Uploaded Datasets Found</option>
              ) : (
                uploads.map((u) => (
                  <option key={u.upload_id} value={u.upload_id}>
                    {u.original_filename} ({u.total_events} events)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Search Trace */}
          <div style={{ flex: "2 1 280px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Search Trace:
            </label>
            <div style={{ position: "relative" }}>
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
                placeholder="Search event type, tool, agent, payload..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: "100%", height: "38px", paddingLeft: "36px" }}
              />
            </div>
          </div>

          {/* Event Type Filter */}
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Event Type:
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: "100%", height: "38px" }}
            >
              <option value="all">All Types ({events.length})</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Agent Filter */}
          {agents.length > 1 && (
            <div style={{ flex: "1 1 160px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                Agent:
              </label>
              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: "100%", height: "38px" }}
              >
                <option value="all">All Agents</option>
                {agents.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Order Toggle */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Order:
            </label>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              style={{ height: "38px" }}
              title="Toggle sequence / timestamp sort order"
            >
              <ArrowUpDown size={14} />
              <span>{sortOrder === "asc" ? "Oldest First" : "Newest First"}</span>
            </button>
          </div>
        </div>

        {/* Dataset Metadata Bar */}
        {selectedUpload && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border)",
              fontSize: "12px",
              color: "var(--muted)",
            }}
          >
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <span>
                Upload ID: <code style={{ color: "var(--text)" }}>{selectedUpload.upload_id}</code>
              </span>
              <span>
                Total Ingested: <strong style={{ color: "var(--text)" }}>{selectedUpload.total_events}</strong> events
              </span>
              <span>
                Agents: <strong style={{ color: "var(--text)" }}>{selectedUpload.total_agents}</strong>
              </span>
              <span>
                Workflows: <strong style={{ color: "var(--text)" }}>{selectedUpload.total_workflows}</strong>
              </span>
            </div>
            <div>
              Showing <strong style={{ color: "var(--text)" }}>{filteredEvents.length}</strong> matching records
            </div>
          </div>
        )}
      </div>

      {/* Events Table Container */}
      <div className="panel" style={{ padding: 0, overflow: "hidden", marginBottom: "20px" }}>
        {loadingEvents ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
            <RotateCw size={24} className="spin" style={{ margin: "0 auto 12px", display: "block", color: "var(--accent)" }} />
            <div>Retrieving and normalizing dataset events...</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
            <Database size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
            <h4 style={{ color: "var(--text)", marginBottom: "6px" }}>No Matching Events Found</h4>
            <p style={{ maxWidth: 460, margin: "0 auto", fontSize: "13px" }}>
              {events.length === 0
                ? "This dataset has 0 events or is currently empty."
                : "No events match the active search query or filter criteria. Try clearing the search or filter."}
            </p>
            {events.length > 0 && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("all");
                  setAgentFilter("all");
                  setWorkflowFilter("all");
                }}
                style={{ marginTop: "16px" }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>Seq</th>
                  <th style={{ width: "160px" }}>Event Type</th>
                  <th>Agent / Model</th>
                  <th>Tool Invoked</th>
                  <th>Payload / Evidence Preview</th>
                  <th style={{ width: "110px" }}>Timestamp</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.map((ev, idx) => {
                  const eventType = ev.event_type || ev.type || "UNKNOWN";
                  const agentName = ev.agent || ev.agent_id || "Agent";
                  const modelName = ev.model || ev.model_name;
                  const toolName = ev.tool || ev.tool_name;
                  const seqNum = ev.sequence !== undefined ? ev.sequence : (currentPage - 1) * pageSize + idx + 1;

                  // Preview text
                  const preview =
                    typeof ev.output_data === "string"
                      ? ev.output_data
                      : typeof ev.output === "string"
                      ? ev.output
                      : typeof ev.input_data === "string"
                      ? ev.input_data
                      : typeof ev.input === "string"
                      ? ev.input
                      : ev.evidence || ev.decision || "—";

                  return (
                    <tr key={ev.event_id || idx}>
                      <td style={{ color: "var(--muted)", fontWeight: 600 }}>{seqNum}</td>
                      <td>
                        <span className="badge" style={{ fontSize: "10px", fontWeight: 700 }}>
                          {eventType}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 650, color: "var(--text)" }}>{agentName}</div>
                        {modelName && (
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>{modelName}</div>
                        )}
                      </td>
                      <td>
                        {toolName ? (
                          <span style={{ fontFamily: "monospace", color: "var(--accent)", fontWeight: 600 }}>
                            {toolName}
                          </span>
                        ) : (
                          <span style={{ color: "var(--subtle)" }}>—</span>
                        )}
                      </td>
                      <td style={{ maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted)", fontSize: "12px" }}>
                        {String(preview).slice(0, 80)}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="button button-sm button-secondary"
                          onClick={() => {
                            setSelectedEvent(ev);
                            setModalTab("overview");
                          }}
                          title="View detailed event telemetry"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredEvents.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px",
              borderTop: "1px solid var(--border)",
              background: "var(--panel-soft)",
              flexWrap: "wrap",
              gap: "12px",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)" }}>
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ padding: "3px 8px", height: "30px", fontSize: "12px" }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredEvents.length} total)
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="button button-sm button-secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <button
                type="button"
                className="button button-sm button-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deep Event Inspection Modal */}
      {selectedEvent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
            zIndex: 1000,
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: "760px",
              maxHeight: "88vh",
              overflowY: "auto",
              boxShadow: "0 20px 45px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span className="badge">{selectedEvent.event_type || selectedEvent.type || "EVENT"}</span>
                  {selectedEvent.sequence !== undefined && (
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                      Sequence #{selectedEvent.sequence}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: "var(--text)" }}>
                  Event Trace Telemetry
                </h3>
                <code style={{ fontSize: "11px", color: "var(--muted)", wordBreak: "break-all" }}>
                  {selectedEvent.event_id || "No Event ID"}
                </code>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <button
                type="button"
                className={`button button-sm ${modalTab === "overview" ? "button-primary" : "button-secondary"}`}
                onClick={() => setModalTab("overview")}
              >
                <Activity size={13} />
                <span>Normalized Details</span>
              </button>
              <button
                type="button"
                className={`button button-sm ${modalTab === "raw" ? "button-primary" : "button-secondary"}`}
                onClick={() => setModalTab("raw")}
              >
                <FileCode size={13} />
                <span>Raw JSON</span>
              </button>
            </div>

            {modalTab === "overview" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px" }}>
                {/* Grid Attributes */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  <div style={{ padding: "10px", background: "var(--panel-soft)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Agent</div>
                    <strong style={{ color: "var(--text)", fontSize: "13px" }}>{selectedEvent.agent || selectedEvent.agent_id || "Default Agent"}</strong>
                  </div>
                  <div style={{ padding: "10px", background: "var(--panel-soft)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Model / Provider</div>
                    <strong style={{ color: "var(--text)", fontSize: "13px" }}>{selectedEvent.model || "—"} ({selectedEvent.provider || "Standard"})</strong>
                  </div>
                  <div style={{ padding: "10px", background: "var(--panel-soft)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Workflow Ref</div>
                    <strong style={{ color: "var(--text)", fontSize: "13px", wordBreak: "break-all" }}>{selectedEvent.workflow_id || selectedEvent.metadata?.workflow_id || "—"}</strong>
                  </div>
                  <div style={{ padding: "10px", background: "var(--panel-soft)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Timestamp</div>
                    <strong style={{ color: "var(--text)", fontSize: "13px" }}>
                      {selectedEvent.timestamp ? new Date(selectedEvent.timestamp).toLocaleString() : "—"}
                    </strong>
                  </div>
                </div>

                {/* Tool Invocation */}
                {(selectedEvent.tool || selectedEvent.tool_name) && (
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Tool Invocation
                    </label>
                    <div style={{ padding: "10px 14px", background: "var(--panel-soft)", border: "1px solid var(--border)", borderRadius: "8px", fontFamily: "monospace", color: "var(--accent)" }}>
                      {selectedEvent.tool || selectedEvent.tool_name}
                    </div>
                  </div>
                )}

                {/* Input Payload */}
                {(selectedEvent.input !== undefined || selectedEvent.input_data !== undefined) && (
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Input Payload
                    </label>
                    <pre
                      style={{
                        padding: "12px",
                        background: "var(--panel-soft)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        overflowX: "auto",
                        maxHeight: "180px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {typeof (selectedEvent.input_data || selectedEvent.input) === "object"
                        ? JSON.stringify(selectedEvent.input_data || selectedEvent.input, null, 2)
                        : String(selectedEvent.input_data || selectedEvent.input)}
                    </pre>
                  </div>
                )}

                {/* Output / Result / Decision */}
                {(selectedEvent.output !== undefined || selectedEvent.output_data !== undefined || selectedEvent.decision !== undefined) && (
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Output / Decision Result
                    </label>
                    <pre
                      style={{
                        padding: "12px",
                        background: "var(--panel-soft)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        overflowX: "auto",
                        maxHeight: "180px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {typeof (selectedEvent.output_data || selectedEvent.output || selectedEvent.decision) === "object"
                        ? JSON.stringify(selectedEvent.output_data || selectedEvent.output || selectedEvent.decision, null, 2)
                        : String(selectedEvent.output_data || selectedEvent.output || selectedEvent.decision)}
                    </pre>
                  </div>
                )}

                {/* Evidence */}
                {selectedEvent.evidence && (
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Associated Evidence
                    </label>
                    <pre
                      style={{
                        padding: "10px 12px",
                        background: "var(--panel-soft)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        overflowX: "auto",
                      }}
                    >
                      {typeof selectedEvent.evidence === "object"
                        ? JSON.stringify(selectedEvent.evidence, null, 2)
                        : String(selectedEvent.evidence)}
                    </pre>
                  </div>
                )}

                {/* Metadata */}
                {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Metadata & Telemetry Flags
                    </label>
                    <pre
                      style={{
                        padding: "10px 12px",
                        background: "var(--panel-soft)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        overflowX: "auto",
                      }}
                    >
                      {JSON.stringify(selectedEvent.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <pre
                  style={{
                    padding: "14px",
                    background: "var(--panel-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    overflowX: "auto",
                    maxHeight: "450px",
                  }}
                >
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
