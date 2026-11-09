import { useState, useMemo } from "react";
import {
  Network,
  Search,
  Filter,
  Layers,
  X,
  ArrowRight,
  GitBranch,
  Info,
  Tag,
  Code,
  Share2,
} from "lucide-react";
import WorkflowGraph from "../components/WorkflowGraph";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function WorkflowExplorer({
  workflowData,
  isLoading,
  error,
  onRefresh,
  onNavigateToImpact,
}) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const nodes = workflowData?.nodes || [];
  const relationships = workflowData?.relationships || [];

  // Filter nodes based on selected type filter
  const filteredNodes = useMemo(() => {
    if (typeFilter === "ALL") return nodes;
    return nodes.filter((node) => node.type === typeFilter);
  }, [nodes, typeFilter]);

  // Keep relationships connected to filtered nodes
  const filteredRelationships = useMemo(() => {
    if (typeFilter === "ALL") return relationships;
    const visibleIds = new Set(filteredNodes.map((n) => String(n.id)));
    return relationships.filter(
      (rel) => visibleIds.has(String(rel.source)) && visibleIds.has(String(rel.target))
    );
  }, [filteredNodes, relationships, typeFilter]);

  // Calculate connected relationships for selected node
  const connectedInfo = useMemo(() => {
    if (!selectedNode) return { incoming: [], outgoing: [] };
    const id = String(selectedNode.id);
    const outgoing = relationships.filter((r) => String(r.source) === id);
    const incoming = relationships.filter((r) => String(r.target) === id);
    return { incoming, outgoing };
  }, [selectedNode, relationships]);

  if (isLoading && !workflowData) {
    return <LoadingState message="Fetching Neo4j provenance workflow graph..." />;
  }

  if (error && !workflowData) {
    return (
      <ErrorState
        title="Failed to load workflow graph"
        message={error}
        onRetry={onRefresh}
      />
    );
  }

  return (
    <div
      className="page-container"
      style={{ display: "flex", flexDirection: "column", gap: "20px" }}
    >
      {/* Header & Controls Toolbar */}
      <div
        className="explorer-toolbar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "16px 20px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "19px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Provenance Workflow Explorer
          </h2>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
            Total {nodes.length} nodes and {relationships.length} relationships loaded from Neo4j
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Node Type Filter Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--panel-soft)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "3px",
              gap: "2px",
            }}
          >
            {["ALL", "Agent", "Tool", "DataSource", "Decision"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  border: "none",
                  background: typeFilter === t ? "var(--panel)" : "transparent",
                  color: typeFilter === t ? "var(--accent)" : "var(--muted)",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 650,
                  cursor: "pointer",
                  boxShadow:
                    typeFilter === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "200px" }}>
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
              placeholder="Search graph nodes..."
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
        </div>
      </div>

      {/* Main Graph Area + Right Side Inspector Drawer */}
      <div
        className="graph-layout"
        style={{
          display: "grid",
          gridTemplateColumns: selectedNode ? "1fr 360px" : "1fr",
          gap: "20px",
          alignItems: "start",
          transition: "grid-template-columns 0.25s ease",
        }}
      >
        {/* Interactive React Flow Canvas */}
        <div style={{ position: "relative" }}>
          <WorkflowGraph
            nodes={filteredNodes}
            relationships={filteredRelationships}
            selectedNodeId={selectedNode?.id}
            onSelectNode={setSelectedNode}
            searchQuery={searchQuery}
            height="620px"
          />
        </div>

        {/* Right-Side Node Details Inspector */}
        {selectedNode && (
          <aside
            className="node-details-panel"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              height: "620px",
              overflowY: "auto",
              boxShadow: "var(--shadow)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "12px",
              }}
            >
              <div>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "10px",
                    fontWeight: 750,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    marginBottom: "6px",
                  }}
                >
                  {selectedNode.type}
                </span>
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--text)",
                    margin: 0,
                    wordBreak: "break-all",
                  }}
                >
                  {selectedNode.properties?.name || selectedNode.id}
                </h3>
              </div>

              <button
                className="icon-button"
                onClick={() => setSelectedNode(null)}
                style={{ padding: "4px" }}
                aria-label="Close inspector"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Actions */}
            {(selectedNode.type === "DataSource" || selectedNode.type === "Agent") && (
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  if (onNavigateToImpact) {
                    onNavigateToImpact({
                      node_type: selectedNode.type,
                      node_id: selectedNode.id,
                    });
                  }
                }}
                style={{ width: "100%", height: "38px" }}
              >
                <GitBranch size={14} />
                <span>Run Downstream Impact Analysis</span>
              </button>
            )}

            {/* Ingoing & Outgoing Relationships */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--subtle)",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Dependency Connections
              </div>

              {connectedInfo.outgoing.length > 0 && (
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>
                    Outgoing ({connectedInfo.outgoing.length}):
                  </div>
                  {connectedInfo.outgoing.map((rel, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "6px 10px",
                        background: "var(--panel-soft)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        marginBottom: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span style={{ color: "var(--accent)", fontWeight: 650 }}>
                        {rel.type}
                      </span>
                      <ArrowRight size={12} style={{ color: "var(--muted)" }} />
                      <span style={{ color: "var(--text)", wordBreak: "break-all" }}>
                        {rel.target}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {connectedInfo.incoming.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>
                    Incoming ({connectedInfo.incoming.length}):
                  </div>
                  {connectedInfo.incoming.map((rel, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "6px 10px",
                        background: "var(--panel-soft)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        marginBottom: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span style={{ color: "var(--text)", wordBreak: "break-all" }}>
                        {rel.source}
                      </span>
                      <ArrowRight size={12} style={{ color: "var(--muted)" }} />
                      <span style={{ color: "var(--accent)", fontWeight: 650 }}>
                        {rel.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {connectedInfo.outgoing.length === 0 && connectedInfo.incoming.length === 0 && (
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  No directed relationships connected.
                </div>
              )}
            </div>

            {/* Properties Table */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--subtle)",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Node Properties
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  background: "var(--panel-soft)",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                }}
              >
                {Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "4px 0",
                      borderBottom: "1px solid var(--border)",
                      fontSize: "11px",
                    }}
                  >
                    <span style={{ color: "var(--muted)", fontWeight: 600 }}>{key}</span>
                    <span
                      style={{
                        color: "var(--text)",
                        wordBreak: "break-all",
                        marginTop: "2px",
                        fontFamily: typeof val === "object" ? "monospace" : "inherit",
                      }}
                    >
                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

