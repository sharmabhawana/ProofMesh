import { useState } from "react";
import {
  ShieldCheck,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader,
  KeyRound,
} from "lucide-react";
import authService from "../services/authService";

export default function ForgotPassword({ onBackToLogin, mode = "user" }) {
  const isAdmin = mode === "admin";
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
      if (isAdmin) {
        await authService.adminForgotPassword(cleanEmail);
      } else {
        await authService.forgotPassword(cleanEmail);
      }
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

  const accentColor = isAdmin ? "#f59e0b" : "#3b82f6";
  const accentGradient = isAdmin
    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
    : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
  const accentShadow = isAdmin
    ? "rgba(245, 158, 11, 0.35)"
    : "rgba(59, 130, 246, 0.3)";

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
          border: `1px solid ${isAdmin ? "rgba(245, 158, 11, 0.4)" : "var(--border)"}`,
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
              background: accentGradient,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 14px",
              boxShadow: `0 6px 18px ${accentShadow}`,
            }}
          >
            {isAdmin ? <KeyRound size={26} /> : <ShieldCheck size={28} />}
          </div>
          <div
            style={{
              display: "inline-block",
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "3px 8px",
              borderRadius: "5px",
              background: isAdmin ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)",
              color: accentColor,
              marginBottom: "8px",
            }}
          >
            {isAdmin ? "Administrator Portal" : "Account Recovery"}
          </div>
          <h2
            style={{
              fontSize: "21px",
              fontWeight: 750,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {isAdmin ? "Administrator Password Recovery" : "Reset Your Password"}
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              marginTop: "6px",
              lineHeight: 1.5,
            }}
          >
            {isAdmin
              ? "Enter your registered administrator email address to receive a secure recovery link."
              : "Enter your registered email address and we'll send you a secure reset link."}
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
                  {isAdmin
                    ? "If an administrator account with that email exists, we've sent a password reset link. The link will expire in 15 minutes."
                    : "If an account with that email exists, we've sent a password reset link. The link will expire in 15 minutes."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onBackToLogin(isAdmin ? "admin" : "user")}
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
              {isAdmin ? "Back to Admin Sign In" : "Back to Sign In"}
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
                  {isAdmin ? "Administrator Email Address" : "Email Address"}
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
                    placeholder={isAdmin ? "admin@domain.com" : "user@domain.com"}
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
                  background: accentGradient,
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 650,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.75 : 1,
                  boxShadow: `0 4px 14px ${accentShadow}`,
                }}
              >
                {loading ? (
                  <>
                    <Loader size={15} className="spin" />
                    Sending recovery link...
                  </>
                ) : (
                  <>
                    <Mail size={15} />
                    {isAdmin ? "Send Admin Recovery Link" : "Send Reset Link"}
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
                onClick={() => onBackToLogin(isAdmin ? "admin" : "user")}
                style={{
                  background: "none",
                  border: "none",
                  color: accentColor,
                  fontWeight: 650,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {isAdmin ? "Back to Admin Sign In" : "Back to Sign In"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
