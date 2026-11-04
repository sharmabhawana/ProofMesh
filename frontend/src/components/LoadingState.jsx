import { Loader2 } from "lucide-react";

export default function LoadingState({
  message = "Loading ProofMesh data...",
  compact = false,
}) {
  return (
    <div
      className={`loading-state-container ${compact ? "compact" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: compact ? "24px" : "64px 20px",
        gap: "14px",
        color: "var(--muted)",
      }}
    >
      <Loader2
        size={compact ? 24 : 36}
        className="spin"
        style={{ color: "var(--accent)" }}
      />
      <span style={{ fontSize: compact ? "12px" : "14px", fontWeight: 500 }}>
        {message}
      </span>
    </div>
  );
}

