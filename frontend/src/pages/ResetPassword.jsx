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

export default function ResetPassword({ onBackToLogin, defaultMode = "user" }) {
  // Extract ?token= and ?mode= from URL
  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  });

  const [mode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") || defaultMode || "user";
  });

  const isAdmin = mode === "admin";
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
        "Invalid or missing reset link. Please request a new password recovery link."
      );
    }
  }, [token]);

  const allRulesMet = PASSWORD_RULES.every((r) => r.test(newPassword));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setError("Invalid reset link. Please request a new password recovery link.");
      return;
    }

    if (!allRulesMet) {
      setError("Password does not meet the complexity requirements below.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isAdmin) {
        await authService.adminResetPassword(token, newPassword);
      } else {
        await authService.resetPassword(token, newPassword);
      }
      setSuccess(true);
      // Clean query parameters from URL so refresh does not re-submit
      window.history.replaceState({}, "", window.location.pathname);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        "Something went wrong. Please request a new password recovery link.";
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
            {isAdmin ? "Set Administrator Password" : "Set New Password"}
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              marginTop: "6px",
            }}
          >
            {isAdmin
              ? "Choose a strong password for your ProofMesh administrator account."
              : "Choose a strong password for your ProofMesh account."}
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
                  {isAdmin
                    ? "Your administrator credentials have been securely updated. You can now access the Admin Portal."
                    : "Your account password has been changed. You can now sign in with your new password."}
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
                border: "none",
                background: accentGradient,
                color: "#fff",
                fontSize: "13px",
                fontWeight: 650,
                cursor: "pointer",
                boxShadow: `0 4px 14px ${accentShadow}`,
              }}
            >
              {isAdmin ? <KeyRound size={15} /> : <ShieldCheck size={15} />}
              {isAdmin ? "Sign In to Admin Portal" : "Sign In to ProofMesh"}
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
                  {isAdmin ? "New Administrator Password" : "New Password"}
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
                  Confirm Password
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
                  background: accentGradient,
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 650,
                  cursor: loading || !token ? "not-allowed" : "pointer",
                  opacity: loading || !token ? 0.75 : 1,
                  marginTop: "4px",
                  boxShadow: `0 4px 14px ${accentShadow}`,
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
                    {isAdmin ? "Update Administrator Password" : "Update Password"}
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
                onClick={() => onBackToLogin(isAdmin ? "admin" : "user")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "none",
                  color: accentColor,
                  fontWeight: 650,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "13px",
                }}
              >
                <ArrowLeft size={14} />
                {isAdmin ? "Back to Admin Sign In" : "Back to Sign In"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
