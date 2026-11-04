import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorState({
  title = "Unable to load data",
  message = "An error occurred while communicating with the ProofMesh API.",
  onRetry,
  compact = false,
}) {
  return (
    <div
      className={`error-state-container ${compact ? "compact" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: compact ? "20px" : "48px 24px",
        gap: "12px",
        textAlign: "center",
        background: "var(--panel-soft)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.12)",
          color: "#ef4444",
          display: "grid",
          placeItems: "center",
        }}
      >
        <AlertCircle size={22} />
      </div>
      <div>
        <h4 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text)" }}>
          {title}
        </h4>
        <p
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            marginTop: "4px",
            maxWidth: 420,
          }}
        >
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="refresh-button"
          style={{ marginTop: 8 }}
        >
          <RefreshCw size={14} />
          <span>Retry request</span>
        </button>
      )}
    </div>
  );
}

