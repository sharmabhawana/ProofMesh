import { useState } from "react";
import {
  LockKeyhole,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Shield,
  FileCheck,
  Hash,
  Database,
  Layers,
  Info,
} from "lucide-react";
import dashboardService from "../services/dashboardService";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function IntegrityCenter({
  integrityData,
  isLoading,
  error,
  onRefresh,
}) {
  const [verifying, setVerifying] = useState(false);
  const [localResult, setLocalResult] = useState(null);
  const [localError, setLocalError] = useState(null);

  const activeData = localResult || integrityData;
  const isVerified = activeData?.integrity_verified ?? false;

  const handleVerifyChain = async () => {
    setVerifying(true);
    setLocalError(null);
    try {
      const res = await dashboardService.getIntegrityStatus();
      setLocalResult(res);
      if (onRefresh) onRefresh();
    } catch (err) {
      setLocalError("Error running cryptographic verification: " + (err.response?.data?.detail || err.message));
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading && !activeData) {
    return <LoadingState message="Verifying SHA-256 cryptographic hash chain..." />;
  }

  if (error && !activeData) {
    return (
      <ErrorState
        title="Failed to verify provenance integrity"
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
      {/* Top Header Card */}
      <div
        className="section-header"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div className="eyebrow">PROOF OF PROVENANCE LEDGER</div>
          <h2 style={{ fontSize: "22px", fontWeight: 750, color: "var(--text)", margin: "4px 0" }}>
            Cryptographic Integrity Center
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0, maxWidth: 640 }}>
            Every AI agent prompt, tool invocation, intermediate memory state, and output is hashed with SHA-256 and chronologically linked into an immutable hash chain.
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={verifying}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "9px",
            fontSize: "13px",
            fontWeight: 650,
            cursor: verifying ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
          }}
        >
          <RefreshCw size={15} className={verifying ? "spin" : ""} />
          <span>{verifying ? "Verifying SHA-256 Chain..." : "Re-Verify Ledger"}</span>
        </button>
      </div>

      {localError && (
        <div
          style={{
            padding: "14px 18px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "10px",
            color: "#ef4444",
            fontSize: "13px",
          }}
        >
          {localError}
        </div>
      )}

      {/* Main Verification Status Card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Verification Status Hero */}
        <article
          className="panel"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: isVerified
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
              color: isVerified ? "#10b981" : "#ef4444",
              display: "grid",
              placeItems: "center",
              boxShadow: isVerified
                ? "0 0 24px rgba(16, 185, 129, 0.2)"
                : "0 0 24px rgba(239, 68, 68, 0.2)",
            }}
          >
            {isVerified ? <CheckCircle2 size={40} /> : <AlertTriangle size={40} />}
          </div>

          <div>
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 750,
                letterSpacing: "0.5px",
                background: isVerified ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: isVerified ? "#10b981" : "#ef4444",
                marginBottom: "8px",
              }}
            >
              STATUS: {activeData?.status || (isVerified ? "PASS" : "FAIL")}
            </span>
            <h3 style={{ fontSize: "20px", fontWeight: 750, color: "var(--text)", margin: 0 }}>
              {isVerified ? "Cryptographic Chain Intact" : "Verification Inconsistency Detected"}
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginTop: "8px",
                maxWidth: 420,
                lineHeight: 1.5,
              }}
            >
              {activeData?.message}
            </p>
          </div>

          <div
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "var(--panel-soft)",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            <span style={{ color: "var(--muted)" }}>Tampering Detected:</span>
            <strong style={{ color: activeData?.tampering_detected ? "#ef4444" : "#10b981" }}>
              {activeData?.tampering_detected ? "YES - TAMPERED" : "NO - VALID"}
            </strong>
          </div>
        </article>

        {/* Technical Cryptographic Specification */}
        <article
          className="panel"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Hash size={20} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
              Cryptographic Parameters
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Hash Function</span>
              <strong style={{ color: "var(--text)", fontFamily: "monospace" }}>SHA-256 (256-bit digest)</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Genesis Seed Block</span>
              <strong style={{ color: "var(--text)", fontFamily: "monospace", fontSize: "11px" }}>
                0000000000000000... (64 zeros)
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Chained Records</span>
              <strong style={{ color: "var(--text)" }}>8 Recorded Events</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Canonical Encoding</span>
              <strong style={{ color: "var(--text)" }}>RFC 8785 Canonical JSON (sorted keys)</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Chaining Formula</span>
              <strong style={{ color: "var(--accent)", fontFamily: "monospace", fontSize: "11px" }}>
                H(i) = SHA256(seq || prev_hash || canonical_event)
              </strong>
            </div>
          </div>
        </article>
      </div>

      {/* Honest Scientific Limitations & Security Context */}
      <div
        className="security-advisory"
        style={{
          background: "var(--panel-soft)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px 24px",
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            background: "rgba(59, 130, 246, 0.15)",
            color: "var(--accent)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Info size={20} />
        </div>
        <div>
          <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
            Cryptographic Integrity vs. Factual Accuracy Disclaimer
          </h4>
          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              fontSize: "12px",
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            <li>
              <strong>Internal Consistency:</strong> A valid SHA-256 hash chain mathematically guarantees that recorded logs match the chronological ledger without post-facto alterations.
            </li>
            <li>
              <strong>Not Factual Truth:</strong> Cryptographic verification does not determine whether external sources or LLM hallucinations are factually accurate.
            </li>
            <li>
              <strong>Threat Model Boundary:</strong> An adversary with full write access to both local log files and chain storage can rewrite both simultaneously. For production zero-trust deployments, external decentralized checkpoints or hardware secure enclaves are required.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

