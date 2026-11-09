import { FolderOpen } from "lucide-react";

export default function EmptyState({
  icon: Icon = FolderOpen,
  title = "No records found",
  description = "No data is currently available for this section.",
  action,
}) {
  return (
    <div
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "54px 20px",
        textAlign: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--panel-soft)",
          border: "1px solid var(--border)",
          display: "grid",
          placeItems: "center",
          color: "var(--muted)",
        }}
      >
        <Icon size={24} />
      </div>
      <div>
        <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>
          {title}
        </h4>
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0, maxWidth: 440, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      {action && <div style={{ marginTop: "8px" }}>{action}</div>}
    </div>
  );
}

