import { useState } from "react";
import {
  ShieldCheck,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";
import authService from "../services/authService";

export default function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(cleanEmail);
      setSubmitted(true);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        "Something went wrong. Please try again later.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-page-container"
      style={{
        width: "100%",
        flex: 1,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg)",
      }}
    >
      <div
        className="auth-card"
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "36px 32px",
          boxShadow: "var(--shadow)",
          margin: "0 auto",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "14px",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 14px",
              boxShadow: "0 6px 18px rgba(59, 130, 246, 0.3)",
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h2
            style={{
              fontSize: "21px",
              fontWeight: 750,
              color: "var(--text)",
              margin: 0,
            }}
          >
            Reset Your Password
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              marginTop: "6px",
            }}
          >
            Enter your registered email address and we&apos;ll send you a secure
            reset link.
          </p>
        </div>

        {/* Success state */}
        {submitted ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "14px",
                padding: "24px 16px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "12px",
                marginBottom: "24px",
              }}
            >
              <CheckCircle
                size={36}
                style={{ color: "#10b981", flexShrink: 0 }}
              />
              <div>
                <p
                  style={{
                    color: "#10b981",
                    fontWeight: 650,
                    fontSize: "14px",
                    margin: "0 0 6px",
                  }}
                >
                  Check your inbox
                </p>
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: "12px",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  If an account with that email exists, we&apos;ve sent a
                  password reset link. The link will expire in 15 minutes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onBackToLogin}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "12px",
                borderRadius: "9px",
                border: "1px solid var(--border)",
                background: "var(--panel-soft)",
                color: "var(--text)",
                fontSize: "13px",
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={15} />
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Error banner */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px 14px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  marginBottom: "20px",
                }}
              >
                <AlertCircle
                  size={16}
                  style={{ flexShrink: 0, marginTop: "2px" }}
                />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 650,
                    color: "var(--text)",
                    marginBottom: "6px",
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={16}
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--muted)",
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Enter your registered email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "11px 14px 11px 40px",
                      borderRadius: "9px",
                      border: "1px solid var(--border)",
                      background: "var(--panel-soft)",
                      color: "var(--text)",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                      opacity: loading ? 0.6 : 1,
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "12px",
                  borderRadius: "9px",
                  border: "none",
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 650,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.75 : 1,
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                }}
              >
                {loading ? (
                  <>
                    <Loader size={15} className="spin" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    <Mail size={15} />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            {/* Back to login */}
            <div
              style={{
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
                textAlign: "center",
                fontSize: "13px",
                color: "var(--muted)",
              }}
            >
              Remember your password?{" "}
              <button
                type="button"
                onClick={onBackToLogin}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontWeight: 650,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

