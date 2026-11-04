import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "../context/ThemeContext";

const NODE_COLORS = {
  Agent: {
    border: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.12)",
    text: "#60a5fa",
    badge: "#2563eb",
  },
  Tool: {
    border: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.12)",
    text: "#a78bfa",
    badge: "#7c3aed",
  },
  DataSource: {
    border: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#34d399",
    badge: "#059669",
  },
  Decision: {
    border: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#fbbf24",
    badge: "#d97706",
  },
};

export default function WorkflowGraph({
  nodes = [],
  relationships = [],
  selectedNodeId = null,
  onSelectNode,
  searchQuery = "",
  height = "520px",
}) {
  const { theme } = useTheme();

  const { flowNodes, flowEdges } = useMemo(() => {
    // Layout coordinates per node type or calculated
    const typeOffsets = {
      Agent: { baseX: 60, baseY: 80, count: 0 },
      Tool: { baseX: 380, baseY: 80, count: 0 },
      DataSource: { baseX: 380, baseY: 280, count: 0 },
      Decision: { baseX: 60, baseY: 280, count: 0 },
    };

    const matchesQuery = (node) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const idMatch = String(node.id || "").toLowerCase().includes(q);
      const typeMatch = String(node.type || "").toLowerCase().includes(q);
      const propMatch = JSON.stringify(node.properties || {})
        .toLowerCase()
        .includes(q);
      return idMatch || typeMatch || propMatch;
    };

    const formattedNodes = nodes.map((node, index) => {
      const type = node.type || "Node";
      const colors = NODE_COLORS[type] || {
        border: "#64748b",
        bg: "rgba(100, 116, 139, 0.12)",
        text: "#94a3b8",
        badge: "#475569",
      };

      const tracker = typeOffsets[type] || {
        baseX: 100,
        baseY: 100,
        count: 0,
      };
      const x = tracker.baseX + (tracker.count % 2) * 260;
      const y = tracker.baseY + Math.floor(tracker.count / 2) * 160;
      tracker.count++;

      const isSelected = String(node.id) === String(selectedNodeId);
      const isHighlighted = matchesQuery(node);

      return {
        id: String(node.id),
        position: { x, y },
        data: {
          label: (
            <div
              className="graph-node-content"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    color: colors.text,
                    background: colors.bg,
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {type}
                </span>
                {node.properties?.status && (
                  <span
                    style={{
                      fontSize: "9px",
                      color: "#94a3b8",
                      background: "rgba(148, 163, 184, 0.1)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                    }}
                  >
                    {node.properties.status}
                  </span>
                )}
              </div>
              <strong
                style={{
                  fontSize: "12px",
                  wordBreak: "break-all",
                  color: "var(--text)",
                  marginTop: "2px",
                }}
              >
                {node.properties?.name || node.id}
              </strong>
            </div>
          ),
          rawNode: node,
        },
        style: {
          background: "var(--graph-node)",
          color: "var(--text)",
          border: `${isSelected ? "2px" : "1px"} solid ${
            isSelected ? "#38bdf8" : colors.border
          }`,
          borderRadius: "10px",
          padding: "12px",
          width: 230,
          boxShadow: isSelected
            ? "0 0 16px rgba(56, 189, 248, 0.35)"
            : "0 2px 8px rgba(0, 0, 0, 0.08)",
          opacity: isHighlighted ? 1 : 0.35,
          cursor: "pointer",
          transition: "all 0.2s ease",
        },
      };
    });

    const formattedEdges = relationships.map((rel, index) => {
      const isConnectedToSelected =
        selectedNodeId &&
        (String(rel.source) === String(selectedNodeId) ||
          String(rel.target) === String(selectedNodeId));

      return {
        id: `edge-${index}-${rel.source}-${rel.target}`,
        source: String(rel.source),
        target: String(rel.target),
        label: rel.type,
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isConnectedToSelected ? "#38bdf8" : "#5799ed",
          width: 18,
          height: 18,
        },
        style: {
          stroke: isConnectedToSelected ? "#38bdf8" : "#5799ed",
          strokeWidth: isConnectedToSelected ? 3 : 1.75,
        },
        labelStyle: {
          fill: "var(--graph-label)",
          fontSize: 10,
          fontWeight: 650,
          letterSpacing: "0.4px",
        },
        labelBgStyle: {
          fill: "var(--panel)",
          fillOpacity: 0.95,
          rx: 4,
          ry: 4,
        },
      };
    });

    return { flowNodes: formattedNodes, flowEdges: formattedEdges };
  }, [nodes, relationships, selectedNodeId, searchQuery]);

  const handleNodeClick = (_, node) => {
    if (onSelectNode) {
      onSelectNode(node.data.rawNode);
    }
  };

  const handlePaneClick = () => {
    if (onSelectNode) {
      onSelectNode(null);
    }
  };

  return (
    <div
      className="graph-canvas-wrapper"
      style={{
        position: "relative",
        height,
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--panel)",
      }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color={theme === "dark" ? "#29384c" : "#dce4ef"}
          gap={24}
          size={1.5}
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const type = nodes.find((n) => String(n.id) === node.id)?.type;
            return NODE_COLORS[type]?.border || "#5799ed";
          }}
          maskColor={
            theme === "dark" ? "rgba(9,17,31,.75)" : "rgba(230,237,246,.75)"
          }
          style={{
            background: "var(--panel)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
          }}
        />
      </ReactFlow>

      {/* Legend overlay */}
      <div
        className="graph-legend-overlay"
        style={{
          position: "absolute",
          bottom: "14px",
          left: "14px",
          display: "flex",
          gap: "12px",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          padding: "6px 14px",
          borderRadius: "8px",
          fontSize: "11px",
          zIndex: 10,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        {Object.entries(NODE_COLORS).map(([type, colors]) => (
          <span
            key={type}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: colors.border,
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--muted)", fontWeight: 500 }}>
              {type}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

