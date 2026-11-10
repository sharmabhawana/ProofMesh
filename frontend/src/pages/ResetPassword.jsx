import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader,
  KeyRound,
} from "lucide-react";
import authService from "../services/authService";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "Number (0-9)", test: (p) => /[0-9]/.test(p) },
  {
    label: "Special character (!@#$%…)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export default function ResetPassword({ onBackToLogin }) {
  // Extract ?token= from the URL
  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Warn immediately if there is no token in the URL
  useEffect(() => {
    if (!token) {
      setError(
        "Invalid or missing reset link. Please request a new password reset."
      );
    }
  }, [token]);

  const allRulesMet = PASSWORD_RULES.every((r) => r.test(newPassword));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (!allRulesMet) {
      setError("Password does not meet the requirements below.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.resetPassword(token, newPassword);
      setSuccess(true);
      // Remove the token from the URL so a refresh doesn't re-submit
      window.history.replaceState({}, "", window.location.pathname);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        "Something went wrong. Please try again or request a new reset link.";
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
            <KeyRound size={26} />
          </div>
          <h2
            style={{
              fontSize: "21px",
              fontWeight: 750,
              color: "var(--text)",
              margin: 0,
            }}
          >
            Set New Password
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              marginTop: "6px",
            }}
          >
            Choose a strong password for your ProofMesh account.
          </p>
        </div>

        {/* Success state */}
        {success ? (
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
                  Password updated successfully
                </p>
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: "12px",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  Your account password has been changed. You can now sign in
                  with your new password.
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
                border: "none",
                background:
                  "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 650,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
              }}
            >
              <ShieldCheck size={15} />
              Sign In to ProofMesh
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
              {/* New Password */}
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
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
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
                    type={showNew ? "text" : "password"}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading || !token}
                    style={{
                      width: "100%",
                      padding: "11px 42px 11px 40px",
                      borderRadius: "9px",
                      border: "1px solid var(--border)",
                      background: "var(--panel-soft)",
                      color: "var(--text)",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    aria-label={showNew ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: "4px",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength checklist */}
                {newPassword && (
                  <ul
                    style={{
                      marginTop: "10px",
                      paddingLeft: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(newPassword);
                      return (
                        <li
                          key={rule.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "7px",
                            fontSize: "11px",
                            color: met ? "#10b981" : "var(--muted)",
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              border: `1px solid ${met ? "#10b981" : "var(--border)"}`,
                              background: met
                                ? "rgba(16,185,129,0.15)"
                                : "transparent",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                              fontSize: "9px",
                            }}
                          >
                            {met ? "✓" : ""}
                          </span>
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Confirm Password */}
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
                  Confirm New Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
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
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading || !token}
                    style={{
                      width: "100%",
                      padding: "11px 42px 11px 40px",
                      borderRadius: "9px",
                      border: `1px solid ${
                        confirmPassword && confirmPassword !== newPassword
                          ? "rgba(239,68,68,0.5)"
                          : "var(--border)"
                      }`,
                      background: "var(--panel-soft)",
                      color: "var(--text)",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: "4px",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p
                    style={{
                      color: "#ef4444",
                      fontSize: "11px",
                      marginTop: "5px",
                    }}
                  >
                    Passwords do not match.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !token}
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
                  cursor: loading || !token ? "not-allowed" : "pointer",
                  opacity: loading || !token ? 0.75 : 1,
                  marginTop: "4px",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                }}
              >
                {loading ? (
                  <>
                    <Loader size={15} className="spin" />
                    Updating password...
                  </>
                ) : (
                  <>
                    <KeyRound size={15} />
                    Update Password
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
              <button
                type="button"
                onClick={onBackToLogin}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontWeight: 650,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "13px",
                }}
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

