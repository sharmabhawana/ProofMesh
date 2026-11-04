import { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Required fields check
    if (!cleanUsername || !cleanEmail || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    // Username format check
    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      setError("Username must be between 3 and 50 characters long.");
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError(
        "Username can only contain letters, numbers, underscores, dots, or hyphens."
      );
      return;
    }

    // Email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Password strength check
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one letter and one number.");
      return;
    }

    // Password confirmation match
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      await register(cleanUsername, cleanEmail, password, fullName.trim());
      setSuccess(true);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        "Registration failed. An account with this email or username may already exist.";
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
          maxWidth: "460px",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "36px 32px",
          boxShadow: "var(--shadow)",
          margin: "0 auto",
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
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
              fontSize: "22px",
              fontWeight: 750,
              color: "var(--text)",
              margin: 0,
            }}
          >
            Create Your Account
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              marginTop: "6px",
            }}
          >
            Join the ProofMesh provenance and trust platform.
          </p>
        </div>

        {/* Success notification */}
        {success ? (
          <div
            style={{
              padding: "24px 20px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "12px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <CheckCircle2 size={38} style={{ color: "#10b981" }} />
            <div>
              <h4
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: "0 0 6px",
                }}
              >
                Account Registered Successfully!
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--muted)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Your ProofMesh operator credentials have been securely provisioned. You can now proceed to login.
              </p>
            </div>
            <button
              onClick={onSwitchToLogin}
              style={{
                marginTop: "10px",
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#10b981",
                color: "#fff",
                fontWeight: 650,
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
              }}
            >
              Sign In Now
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
                  marginBottom: "18px",
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Full Name (Optional / Supported) */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 650,
                    color: "var(--text)",
                    marginBottom: "5px",
                  }}
                >
                  Full Name
                </label>
                <div style={{ position: "relative" }}>
                  <BadgeCheck
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
                    placeholder="Enter your full name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 40px",
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

              {/* Username */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 650,
                    color: "var(--text)",
                    marginBottom: "5px",
                  }}
                >
                  Username *
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
                    placeholder="Choose a username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 40px",
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

              {/* Email */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 650,
                    color: "var(--text)",
                    marginBottom: "5px",
                  }}
                >
                  Email Address *
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
                    placeholder="Enter your work email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 40px",
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

              {/* Password */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 650,
                    color: "var(--text)",
                    marginBottom: "5px",
                  }}
                >
                  Password (min. 8 characters, letter + number) *
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
                    placeholder="Create a password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{
                      width: "100%",
                      padding: "10px 42px 10px 40px",
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

              {/* Confirm Password */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 650,
                    color: "var(--text)",
                    marginBottom: "5px",
                  }}
                >
                  Confirm Password *
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
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 42px 10px 40px",
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
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 650,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.75 : 1,
                  marginTop: "6px",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                }}
              >
                <span>{loading ? "Registering..." : "Create Account"}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Back to Login */}
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
              Already registered?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontWeight: 650,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
