import { useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Workflow,
  Sparkles,
  Database,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export const NODE_CONFIG = {
  Agent: {
    border: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.12)",
    text: "#60a5fa",
    badge: "#2563eb",
    icon: ShieldCheck,
    label: "Agent",
  },
  Tool: {
    border: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.12)",
    text: "#a78bfa",
    badge: "#7c3aed",
    icon: Wrench,
    label: "Tool",
  },
  DataSource: {
    border: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#34d399",
    badge: "#059669",
    icon: Database,
    label: "Data Source",
  },
  Decision: {
    border: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#fbbf24",
    badge: "#d97706",
    icon: Sparkles,
    label: "Decision",
  },
};

export const RELATIONSHIP_CONFIG = {
  USED_TOOL: {
    color: "#8b5cf6",
    label: "USED_TOOL",
  },
  RETRIEVED_FROM: {
    color: "#10b981",
    label: "RETRIEVED_FROM",
  },
  INFLUENCED: {
    color: "#f59e0b",
    label: "INFLUENCED",
  },
  MADE_DECISION: {
    color: "#3b82f6",
    label: "MADE_DECISION",
  },
};

/**
 * Custom Provenance Node Component
 * Displays category badge, stage badge (Intermediate/Final), title, ID, and handles.
 */
function ProvenanceNode({ data, selected }) {
  const { node, config, isHighlighted, isEdgeHovered } = data;
  const type = node.type || "Agent";
  const properties = node.properties || {};
  const stage = properties.stage;
  const isIntermediate =
    stage === "Intermediate" ||
    String(node.id).toLowerCase().includes("intermediate");
  const isFinal =
    stage === "Final" || String(node.id).toLowerCase().includes("final");
  const Icon = config.icon || Workflow;

  const isSelected = selected || isEdgeHovered;

  return (
    <div
      className="provenance-node"
      style={{
        position: "relative",
        width: 240,
        padding: "12px 14px",
        borderRadius: "10px",
        background: "var(--graph-node, #111c2e)",
        border: `${isSelected ? "2px" : "1px"} solid ${
          isSelected ? "#38bdf8" : config.border
        }`,
        boxShadow: isSelected
          ? "0 0 16px rgba(56, 189, 248, 0.45)"
          : "0 2px 10px rgba(0, 0, 0, 0.15)",
        opacity: isHighlighted ? 1 : 0.35,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        color: "var(--text, #f1f5f9)",
        boxSizing: "border-box",
      }}
    >
      {/* Target Handle on Left Edge */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 10,
          height: 10,
          left: -6,
          background: config.border,
          border: "2px solid var(--panel, #0b1320)",
          borderRadius: "50%",
          zIndex: 2,
        }}
      />

      {/* Header Row: Category Badge + Stage/Status Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: config.text,
            background: config.bg,
            padding: "3px 8px",
            borderRadius: "5px",
          }}
        >
          <Icon size={11} />
          {config.label || type}
        </span>

        {/* Intermediate / Final stage pill for Decision nodes */}
        {type === "Decision" && (isIntermediate || isFinal) && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "9px",
              fontWeight: 750,
              letterSpacing: "0.4px",
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: "4px",
              color: isFinal ? "#34d399" : "#fbbf24",
              background: isFinal
                ? "rgba(16, 185, 129, 0.18)"
                : "rgba(245, 158, 11, 0.18)",
              border: `1px solid ${
                isFinal ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"
              }`,
            }}
          >
            {isFinal ? <CheckCircle2 size={10} /> : <Clock size={10} />}
            {isFinal ? "Final" : "Intermediate"}
          </span>
        )}

        {type !== "Decision" && properties.status && (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 600,
              color: "#94a3b8",
              background: "rgba(148, 163, 184, 0.12)",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            {properties.status}
          </span>
        )}
      </div>

      {/* Primary Title / Name */}
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          lineHeight: "1.4",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          color: "var(--text, #f1f5f9)",
          marginBottom: "4px",
        }}
      >
        {properties.name || node.id}
      </div>

      {/* ID Subtitle */}
      <div
        style={{
          fontSize: "10px",
          color: "var(--muted, #94a3b8)",
          wordBreak: "break-all",
          fontFamily: "monospace",
          letterSpacing: "-0.2px",
        }}
      >
        ID:{" "}
        {node.id.length > 28
          ? `${node.id.slice(0, 14)}...${node.id.slice(-10)}`
          : node.id}
      </div>

      {/* Contextual Properties (e.g. Model or Tool ID) */}
      {properties.model && (
        <div
          style={{
            marginTop: "6px",
            fontSize: "9px",
            color: "var(--muted, #94a3b8)",
            background: "var(--panel-soft, rgba(255,255,255,0.04))",
            padding: "2px 6px",
            borderRadius: "4px",
            display: "inline-block",
          }}
        >
          model: <strong>{properties.model}</strong>
        </div>
      )}

      {/* Source Handle on Right Edge */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          right: -6,
          background: config.border,
          border: "2px solid var(--panel, #0b1320)",
          borderRadius: "50%",
          zIndex: 2,
        }}
      />
    </div>
  );
}

/**
 * Custom Provenance Edge Component
 * Orthogonal smoothstep routing with pill-background relationship labels and hover states.
 */
function ProvenanceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  style = {},
  markerEnd,
  label,
  data = {},
}) {
  const customCenterX = data.customCenterX;
  const [edgePath, defaultLabelX, defaultLabelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
    centerX: customCenterX,
  });

  const labelX =
    data.customLabelX !== undefined ? data.customLabelX : defaultLabelX;
  const labelY =
    data.customLabelY !== undefined ? data.customLabelY : defaultLabelY;
  const edgeColor = data.color || "#3b82f6";
  const isHighlighted = data.isHovered || data.isConnected;
  const theme = data.theme || "dark";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: isHighlighted ? "#38bdf8" : edgeColor,
          strokeWidth: isHighlighted ? 2.75 : 1.75,
          transition: "stroke 0.2s ease, stroke-width 0.2s ease",
        }}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: "6px",
              background: theme === "dark" ? "#0f172a" : "#ffffff",
              border: `1.5px solid ${isHighlighted ? "#38bdf8" : edgeColor}`,
              color: isHighlighted
                ? "#38bdf8"
                : theme === "dark"
                ? "#edf3fb"
                : "#0f172a",
              boxShadow: isHighlighted
                ? "0 0 12px rgba(56, 189, 248, 0.45)"
                : "0 2px 6px rgba(0,0,0,0.15)",
              transition: "all 0.2s ease",
              userSelect: "none",
              zIndex: 10,
              whiteSpace: "nowrap",
            }}
            className="nodrag nopan"
            onMouseEnter={data.onMouseEnter}
            onMouseLeave={data.onMouseLeave}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// React Flow custom type definitions (must remain static references)
const nodeTypes = {
  provenanceNode: ProvenanceNode,
};

const edgeTypes = {
  provenanceEdge: ProvenanceEdge,
};

export default function WorkflowGraph({
  nodes = [],
  relationships = [],
  selectedNodeId = null,
  onSelectNode,
  searchQuery = "",
  height = "560px",
}) {
  const { theme } = useTheme();
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);

  const { flowNodes, flowEdges } = useMemo(() => {
    // 4 Distinct Hierarchical Columns
    // Column 1: Agent (x = 60)
    // Column 2: Tool (x = 380)
    // Column 3: DataSource (x = 700)
    // Column 4: Decision (x = 1040)
    const COLUMN_X = {
      Agent: 60,
      Tool: 380,
      DataSource: 700,
      Decision: 1040,
      Other: 1380,
    };

    // Partition nodes into columns
    const colMap = {
      Agent: [],
      Tool: [],
      DataSource: [],
      Decision: [],
      Other: [],
    };

    nodes.forEach((n) => {
      const type = n.type || "Other";
      if (colMap[type]) {
        colMap[type].push(n);
      } else {
        colMap.Other.push(n);
      }
    });

    // Sort Decisions: Intermediate first (top), Final second (bottom)
    colMap.Decision.sort((a, b) => {
      const aInter =
        String(a.properties?.stage || "").toLowerCase().includes("intermediate") ||
        String(a.id || "").toLowerCase().includes("intermediate");
      const bInter =
        String(b.properties?.stage || "").toLowerCase().includes("intermediate") ||
        String(b.id || "").toLowerCase().includes("intermediate");
      if (aInter && !bInter) return -1;
      if (!aInter && bInter) return 1;
      return 0;
    });

    // Compute Y positions
    const nodePositions = {};
    const CENTER_Y = 205;
    const SPACING = 160;

    Object.keys(colMap).forEach((type) => {
      const list = colMap[type];
      if (type === "Decision" && list.length === 2) {
        // Intermediate decision at top (y=60), Final decision at bottom (y=350)
        nodePositions[list[0].id] = { x: COLUMN_X.Decision, y: 60 };
        nodePositions[list[1].id] = { x: COLUMN_X.Decision, y: 350 };
      } else {
        const startY = CENTER_Y - ((list.length - 1) * SPACING) / 2;
        list.forEach((n, i) => {
          nodePositions[n.id] = {
            x: COLUMN_X[type] !== undefined ? COLUMN_X[type] : COLUMN_X.Other,
            y: startY + i * SPACING,
          };
        });
      }
    });

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

    // Determine nodes connected to hovered edge
    const hoveredEdge = relationships.find(
      (rel, index) =>
        `edge-${index}-${rel.source}-${rel.target}` === hoveredEdgeId
    );
    const hoveredSourceId = hoveredEdge ? String(hoveredEdge.source) : null;
    const hoveredTargetId = hoveredEdge ? String(hoveredEdge.target) : null;

    const formattedNodes = nodes.map((node) => {
      const type = node.type || "Agent";
      const config = NODE_CONFIG[type] || {
        border: "#64748b",
        bg: "rgba(100, 116, 139, 0.12)",
        text: "#94a3b8",
        badge: "#475569",
        icon: Workflow,
        label: type,
      };

      const pos = nodePositions[node.id] || { x: 60, y: 205 };
      const isSelected = String(node.id) === String(selectedNodeId);
      const isHighlighted = matchesQuery(node);
      const isEdgeHovered =
        String(node.id) === hoveredSourceId ||
        String(node.id) === hoveredTargetId;

      return {
        id: String(node.id),
        type: "provenanceNode",
        position: pos,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        selected: isSelected,
        data: {
          node,
          config,
          isHighlighted,
          isEdgeHovered,
          rawNode: node,
        },
      };
    });

    const formattedEdges = relationships.map((rel, index) => {
      const edgeId = `edge-${index}-${rel.source}-${rel.target}`;
      const relConfig =
        RELATIONSHIP_CONFIG[rel.type] || {
          color: "#5799ed",
          label: rel.type,
        };

      const isConnectedToSelected =
        selectedNodeId &&
        (String(rel.source) === String(selectedNodeId) ||
          String(rel.target) === String(selectedNodeId));
      const isHovered = edgeId === hoveredEdgeId;
      const isHighlighted = isConnectedToSelected || isHovered;

      // Identify multi-column span: Agent -> Decision
      const sourceNode = nodes.find((n) => String(n.id) === String(rel.source));
      const targetNode = nodes.find((n) => String(n.id) === String(rel.target));
      const isAgentToDecision =
        sourceNode?.type === "Agent" && targetNode?.type === "Decision";

      let customCenterX = undefined;
      let customLabelX = undefined;
      let customLabelY = undefined;

      if (isAgentToDecision) {
        // Step vertically in the channel between Agent and Tool (x = 335)
        customCenterX = 335;
        // Position label in the clear corridor above or below intermediate nodes
        const targetPos = nodePositions[rel.target];
        if (targetPos) {
          customLabelX = 510;
          customLabelY = targetPos.y + 50;
        }
      }

      return {
        id: edgeId,
        source: String(rel.source),
        target: String(rel.target),
        type: "provenanceEdge",
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        label: rel.type,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHighlighted ? "#38bdf8" : relConfig.color,
          width: 18,
          height: 18,
        },
        data: {
          color: relConfig.color,
          theme,
          isHovered,
          isConnected: isConnectedToSelected,
          customCenterX,
          customLabelX,
          customLabelY,
          onMouseEnter: () => setHoveredEdgeId(edgeId),
          onMouseLeave: () => setHoveredEdgeId(null),
        },
      };
    });

    return { flowNodes: formattedNodes, flowEdges: formattedEdges };
  }, [nodes, relationships, selectedNodeId, searchQuery, hoveredEdgeId, theme]);

  const handleNodeClick = (_, flowNode) => {
    if (onSelectNode) {
      onSelectNode(flowNode.data.rawNode);
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
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--panel)",
      }}
    >
      {nodes.length === 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
            zIndex: 10,
            background: "var(--panel)",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <Workflow
            size={40}
            style={{
              marginBottom: "12px",
              opacity: 0.35,
              color: "var(--accent)",
            }}
          />
          <strong style={{ color: "var(--text)", fontSize: "15px" }}>
            No Provenance Graph Nodes
          </strong>
          <p
            style={{
              fontSize: "13px",
              marginTop: "4px",
              maxWidth: "420px",
            }}
          >
            Execute an AI workflow or ingest external agent logs to render
            directed provenance relationship graphs.
          </p>
        </div>
      ) : null}

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2.5}
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
        <Controls
          showInteractive={false}
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const raw = nodes.find((n) => String(n.id) === node.id);
            const type = raw?.type;
            return NODE_CONFIG[type]?.border || "#5799ed";
          }}
          maskColor={
            theme === "dark" ? "rgba(9,17,31,.8)" : "rgba(230,237,246,.8)"
          }
          style={{
            position: "absolute",
            bottom: "14px",
            right: "14px",
            width: 170,
            height: 105,
            background: "var(--panel)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        />
      </ReactFlow>

      {/* Legend overlay: Node categories + Relationship types */}
      <div
        className="graph-legend-overlay"
        style={{
          position: "absolute",
          bottom: "14px",
          left: "14px",
          display: "flex",
          flexWrap: "wrap",
          gap: "14px",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          padding: "8px 16px",
          borderRadius: "10px",
          fontSize: "11px",
          zIndex: 10,
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          maxWidth: "calc(100% - 210px)",
        }}
      >
        {/* Node Categories */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: 700, color: "var(--subtle)" }}>Nodes:</span>
          {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
            <span
              key={type}
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: cfg.border,
                  display: "inline-block",
                }}
              />
              <span style={{ color: "var(--muted)", fontWeight: 550 }}>
                {cfg.label}
              </span>
            </span>
          ))}
        </div>

        {/* Relationship Types */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderLeft: "1px solid var(--border)",
            paddingLeft: "12px",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--subtle)" }}>
            Edges:
          </span>
          {Object.entries(RELATIONSHIP_CONFIG).map(([key, cfg]) => (
            <span
              key={key}
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
            >
              <span
                style={{
                  width: 14,
                  height: 2.5,
                  background: cfg.color,
                  display: "inline-block",
                  borderRadius: "2px",
                }}
              />
              <span
                style={{
                  color: "var(--muted)",
                  fontWeight: 550,
                  fontSize: "10px",
                }}
              >
                {cfg.label}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
