import { AlertTriangle, X } from "lucide-react";

export default function ConfirmationDialog({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this operation?",
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        className="panel"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "24px",
          borderRadius: "14px",
          boxShadow: "0 20px 45px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: confirmVariant === "danger" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                color: confirmVariant === "danger" ? "#ef4444" : "#f59e0b",
                display: "grid",
                placeItems: "center",
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onCancel}
            aria-label="Close"
            style={{ width: "30px", height: "30px" }}
          >
            <X size={15} />
          </button>
        </div>

        <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5, margin: "0 0 20px" }}>
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`button ${confirmVariant === "danger" ? "button-danger" : "button-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

