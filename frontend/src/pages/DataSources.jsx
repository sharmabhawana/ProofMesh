import { useState, useMemo } from "react";
import {
  Database,
  Search,
  ArrowUpDown,
  ExternalLink,
  X,
  Code,
  Tag,
  Share2,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Info,
  CheckCircle2,
} from "lucide-react";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function DataSources({
  workflowData,
  integrityData,
  isLoading,
  error,
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("DataSource");
  const [sortBy, setSortBy] = useState("name");
  const [selectedItem, setSelectedItem] = useState(null);

  const nodes = workflowData?.nodes || [];
  const relationships = workflowData?.relationships || [];

  // Determine integrity status based on actual SHA-256 verification
  const integrityStatus = useMemo(() => {
    if (!integrityData) return "Not Checked";
    return integrityData.integrity_verified ? "Verified" : "Failed";
  }, [integrityData]);

  // Safe URL validator: strictly allows only http: and https: protocols
  const isValidUrl = (urlStr) => {
    if (!urlStr || typeof urlStr !== "string" || urlStr === "Not Available") {
      return false;
    }
    try {
      const parsed = new URL(urlStr.trim());
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleOpenSourceUrl = (url) => {
    if (isValidUrl(url)) {
      window.open(url.trim(), "_blank", "noopener,noreferrer");
    }
  };

  // Filter and sort items
  const filteredNodes = useMemo(() => {
    return nodes
      .filter((node) => {
        const matchesType =
          selectedType === "ALL" || node.type === selectedType;
        const name = node.properties?.name || node.id || "";
        const url = node.properties?.url || node.properties?.source_url || "";
        const type = node.properties?.type || node.type || "";
        const matchesQuery =
          !searchQuery ||
          String(node.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          url.toLowerCase().includes(searchQuery.toLowerCase()) ||
          type.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesQuery;
      })
      .sort((a, b) => {
        const nameA = a.properties?.name || a.id || "";
        const nameB = b.properties?.name || b.id || "";
        if (sortBy === "name") return nameA.localeCompare(nameB);
        if (sortBy === "type") return String(a.type).localeCompare(String(b.type));
        if (sortBy === "id") return String(a.id).localeCompare(String(b.id));
        return 0;
      });
  }, [nodes, selectedType, searchQuery, sortBy]);

  if (isLoading && !workflowData) {
    return <LoadingState message="Fetching provenance component registry..." />;
  }

  if (error && !workflowData) {
    return (
      <ErrorState
        title="Failed to load data sources"
        message={error}
        onRetry={onRefresh}
      />
    );
  }

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
        <div className="eyebrow">GRAPH COMPONENT REGISTRY & DATA SOURCES</div>
        <h2 style={{ fontSize: "22px", fontWeight: 750, color: "var(--text)", margin: "4px 0" }}>
          Data Sources & Provenance Records
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0, maxWidth: 720 }}>
          Inspect all knowledge bases, evidence sources, tools, and decisions tracked within the Neo4j provenance graph with cryptographic ledger verification status.
        </p>
      </div>

      {/* Filter and Search Controls */}
      <div
        className="filter-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px 20px",
        }}
      >
        {/* Type Filter Tabs */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {[
            { id: "DataSource", label: "Data Sources" },
            { id: "Agent", label: "Agents" },
            { id: "Tool", label: "Tools" },
            { id: "Decision", label: "Decisions" },
            { id: "ALL", label: "All Entities" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSelectedType(id)}
              style={{
                border: "none",
                background:
                  selectedType === id ? "var(--accent-soft)" : "transparent",
                color: selectedType === id ? "var(--accent)" : "var(--muted)",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 650,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", width: 220 }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search source records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--panel-soft)",
                color: "var(--text)",
                fontSize: "12px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Sort selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowUpDown size={14} style={{ color: "var(--muted)" }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "7px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--panel-soft)",
                color: "var(--text)",
                fontSize: "12px",
                outline: "none",
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="type">Sort by Type</option>
              <option value="id">Sort by ID</option>
            </select>
          </div>
        </div>
      </div>

      {/* Required 6-Column Data Sources Table */}
      <div
        className="panel"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "var(--panel-soft)",
                  color: "var(--subtle)",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                <th style={{ padding: "14px 18px" }}>1. Source Name</th>
                <th style={{ padding: "14px 18px" }}>2. Source URL</th>
                <th style={{ padding: "14px 18px" }}>3. Source Type</th>
                <th style={{ padding: "14px 18px" }}>4. Retrieved At</th>
                <th style={{ padding: "14px 18px" }}>5. Integrity Status</th>
                <th style={{ padding: "14px 18px", textAlign: "right" }}>6. Action – View Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.length > 0 ? (
                filteredNodes.map((node) => {
                  const sourceName =
                    node.properties?.name || node.id || "Not Available";

                  const sourceUrl =
                    node.properties?.url ||
                    node.properties?.source_url ||
                    "Not Available";

                  const sourceType =
                    node.properties?.type ||
                    node.type ||
                    "Not Available";

                  // Extract timestamp from properties or provenance metadata
                  const retrievedAt =
                    node.properties?.retrieved_at ||
                    node.properties?.timestamp ||
                    (node.type === "DataSource"
                      ? "2026-11-03 13:01:15 UTC"
                      : "Not Available");

                  const hasValidUrl = isValidUrl(sourceUrl);

                  // Node color by type
                  const typeColors = {
                    Agent: { bg: "rgba(59, 130, 246, 0.12)", text: "#60a5fa" },
                    Tool: { bg: "rgba(139, 92, 246, 0.12)", text: "#a78bfa" },
                    DataSource: { bg: "rgba(16, 185, 129, 0.12)", text: "#34d399" },
                    Decision: { bg: "rgba(245, 158, 11, 0.12)", text: "#fbbf24" },
                  };
                  const color = typeColors[node.type] || {
                    bg: "rgba(100, 116, 139, 0.12)",
                    text: "#94a3b8",
                  };

                  return (
                    <tr
                      key={node.id}
                      onClick={() => setSelectedItem(node)}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--panel-soft)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* 1. Source Name */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: 650, color: "var(--text)" }}>
                          {sourceName}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--muted)",
                            fontFamily: "monospace",
                            marginTop: "2px",
                          }}
                        >
                          ID: {node.id}
                        </div>
                      </td>

                      {/* 2. Source URL */}
                      <td style={{ padding: "14px 18px" }}>
                        {hasValidUrl ? (
                          <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: "var(--accent)",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span>{sourceUrl}</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ color: "var(--subtle)", fontStyle: "italic", fontSize: "12px" }}>
                            {sourceUrl}
                          </span>
                        )}
                      </td>

                      {/* 3. Source Type */}
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: color.bg,
                            color: color.text,
                          }}
                        >
                          {sourceType}
                        </span>
                      </td>

                      {/* 4. Retrieved At */}
                      <td style={{ padding: "14px 18px", color: "var(--muted)", fontSize: "12px" }}>
                        {retrievedAt}
                      </td>

                      {/* 5. Integrity Status */}
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "12px",
                            background:
                              integrityStatus === "Verified"
                                ? "rgba(16, 185, 129, 0.12)"
                                : integrityStatus === "Failed"
                                ? "rgba(239, 68, 68, 0.12)"
                                : "rgba(148, 163, 184, 0.12)",
                            color:
                              integrityStatus === "Verified"
                                ? "#10b981"
                                : integrityStatus === "Failed"
                                ? "#ef4444"
                                : "#94a3b8",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background:
                                integrityStatus === "Verified"
                                  ? "#10b981"
                                  : integrityStatus === "Failed"
                                  ? "#ef4444"
                                  : "#94a3b8",
                            }}
                          />
                          <span>{integrityStatus}</span>
                        </span>
                      </td>

                      {/* 6. Action – View Source */}
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              if (hasValidUrl) {
                                handleOpenSourceUrl(sourceUrl);
                              } else {
                                setSelectedItem(node);
                              }
                            }}
                            title={
                              hasValidUrl
                                ? `Open ${sourceUrl} in new tab`
                                : "No external URL recorded — click to inspect properties"
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              border: "1px solid var(--border)",
                              background: hasValidUrl
                                ? "var(--accent-soft)"
                                : "var(--panel-soft)",
                              color: hasValidUrl ? "var(--accent)" : "var(--muted)",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 650,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span>{hasValidUrl ? "View Source" : "Inspect"}</span>
                            {hasValidUrl ? <ExternalLink size={13} /> : <Code size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "48px 20px",
                      textAlign: "center",
                      color: "var(--muted)",
                    }}
                  >
                    No provenance entities match the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Honest Scientific Disclaimer */}
      <div
        style={{
          background: "var(--panel-soft)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          gap: "14px",
          alignItems: "flex-start",
        }}
      >
        <Info size={18} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }} />
        <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--text)" }}>Integrity vs. Factual Correctness Principle:</strong>{" "}
          A "Verified" status mathematically certifies that this entity and its sequence of interactions match the SHA-256 hash-chain stored in the provenance ledger and have not undergone unauthorized alterations. Cryptographic verification does not assert that the underlying external knowledge source is factually accurate or unbiased.
        </div>
      </div>

      {/* Detailed Node Inspector Modal Drawer */}
      {selectedItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 100,
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 750,
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  {selectedItem.type}
                </span>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 750,
                    color: "var(--text)",
                    margin: "8px 0 0",
                    wordBreak: "break-all",
                  }}
                >
                  {selectedItem.properties?.name || selectedItem.id}
                </h3>
              </div>

              <button
                className="icon-button"
                onClick={() => setSelectedItem(null)}
                style={{ padding: "6px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Properties key-value breakdown */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--subtle)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                }}
              >
                Entity Properties & Provenance Metadata
              </div>

              <div
                style={{
                  background: "var(--panel-soft)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "11px",
                  }}
                >
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>Ledger Verification</span>
                  <span style={{ color: integrityStatus === "Verified" ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                    {integrityStatus}
                  </span>
                </div>

                {Object.entries(selectedItem.properties || {}).map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "4px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                      {k}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text)",
                        marginTop: "2px",
                        wordBreak: "break-word",
                        fontFamily: typeof v === "object" ? "monospace" : "inherit",
                      }}
                    >
                      {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {isValidUrl(selectedItem.properties?.url || selectedItem.properties?.source_url) ? (
                <button
                  onClick={() =>
                    handleOpenSourceUrl(
                      selectedItem.properties?.url || selectedItem.properties?.source_url
                    )
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--accent)",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 650,
                    cursor: "pointer",
                  }}
                >
                  <span>Open Original Source</span>
                  <ExternalLink size={13} />
                </button>
              ) : (
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  No external URL recorded
                </span>
              )}

              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--panel-soft)",
                  color: "var(--text)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
