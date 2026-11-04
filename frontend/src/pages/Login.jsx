import { useState } from "react";
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login({
  onSwitchToRegister,
  onLoginSuccess,
  defaultMode = "user", // "user" | "admin"
}) {
  const { login, logout } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(defaultMode === "admin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier || !password) {
      setError("Please provide your username/email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await login(cleanIdentifier, password);
      const user = data.user;

      // Enforce Admin role check if logging in via the Admin Portal
      if (isAdminMode) {
        if (user.role !== "admin") {
          logout();
          setError(
            `Access Denied: The account "${user.username}" possesses standard "user" privileges and is not authorized to access the Admin Console. Please use standard User Sign In.`
          );
          setLoading(false);
          return;
        }
      }

      if (onLoginSuccess) {
        onLoginSuccess(user.role === "admin" && isAdminMode ? "admin" : "overview");
      }
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        "Invalid username/email or password. Please verify your credentials.";
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
          border: `1px solid ${isAdminMode ? "rgba(245, 158, 11, 0.4)" : "var(--border)"}`,
          borderRadius: "16px",
          padding: "36px 32px",
          boxShadow: "var(--shadow)",
          margin: "0 auto",
          transition: "border-color 0.25s ease",
        }}
      >
        {/* Role Toggle Switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--panel-soft)",
            padding: "4px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsAdminMode(false);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "7px",
              border: "none",
              background: !isAdminMode ? "var(--panel)" : "transparent",
              color: !isAdminMode ? "var(--accent)" : "var(--muted)",
              fontWeight: 650,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: !isAdminMode ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <ShieldCheck size={14} />
            <span>User Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAdminMode(true);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "7px",
              border: "none",
              background: isAdminMode ? "var(--panel)" : "transparent",
              color: isAdminMode ? "#f59e0b" : "var(--muted)",
              fontWeight: 650,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: isAdminMode ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <KeyRound size={14} />
            <span>Admin Portal</span>
          </button>
        </div>

        {/* Brand & Portal Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "14px",
              background: isAdminMode
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 14px",
              boxShadow: isAdminMode
                ? "0 6px 18px rgba(245, 158, 11, 0.35)"
                : "0 6px 18px rgba(59, 130, 246, 0.3)",
              transition: "background 0.25s ease",
            }}
          >
            {isAdminMode ? <KeyRound size={26} /> : <ShieldCheck size={28} />}
          </div>

          <h2 style={{ fontSize: "21px", fontWeight: 750, color: "var(--text)", margin: 0 }}>
            {isAdminMode ? "Administrator Access" : "Welcome to ProofMesh"}
          </h2>
          <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>
            {isAdminMode
              ? "Secure administrative access to the ProofMesh platform."
              : "Secure access to AI provenance and trust intelligence."}
          </p>
        </div>

        {/* Error notification */}
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
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              {isAdminMode ? "Admin Username or Email" : "Username or Email Address"}
            </label>
            <div style={{ position: "relative" }}>
              <User
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
                type="text"
                placeholder={isAdminMode ? "Enter your admin username or email" : "Enter your username or email"}
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
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
                }}
              />
            </div>
          </div>

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
              {isAdminMode ? "Admin Password" : "Password"}
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
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
                onClick={() => setShowPassword(!showPassword)}
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
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
              background: isAdminMode
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 650,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
              marginTop: "4px",
              boxShadow: isAdminMode
                ? "0 4px 14px rgba(217, 119, 6, 0.3)"
                : "0 4px 14px rgba(37, 99, 235, 0.25)",
            }}
          >
            <span>
              {loading
                ? "Authenticating..."
                : isAdminMode
                ? "Sign In as Administrator"
                : "Sign In"}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Register link */}
        {!isAdminMode && (
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
            Don't have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToRegister}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                fontWeight: 650,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
