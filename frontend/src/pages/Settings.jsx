import { useState } from "react";
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Key,
  Globe,
  Sun,
  Moon,
  Trash2,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { API_BASE_URL } from "../services/api";

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = () => {
    // Preserve token and theme, purge other local caches
    const token = localStorage.getItem("proofmesh_token");
    const storedUser = localStorage.getItem("proofmesh_user");
    const storedTheme = localStorage.getItem("proofmesh-theme");

    localStorage.clear();

    if (token) localStorage.setItem("proofmesh_token", token);
    if (storedUser) localStorage.setItem("proofmesh_user", storedUser);
    if (storedTheme) localStorage.setItem("proofmesh-theme", storedTheme);

    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  return (
    <div
      className="page-container"
      style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "860px" }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "24px",
        }}
      >
        <div className="eyebrow">SYSTEM CONFIGURATION</div>
        <h2 style={{ fontSize: "22px", fontWeight: 750, color: "var(--text)", margin: "4px 0" }}>
          Platform Settings & User Profile
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
          Manage your authenticated identity, customize interface preferences, and view API connection endpoints.
        </p>
      </div>

      {/* User Identity Card */}
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
          <User size={20} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Authenticated Operator Profile
          </h3>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            background: "var(--panel-soft)",
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
              Username
            </div>
            <strong style={{ fontSize: "14px", color: "var(--text)" }}>
              {user?.username || "Anonymous"}
            </strong>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
              Email Address
            </div>
            <strong style={{ fontSize: "14px", color: "var(--text)" }}>
              {user?.email || "Not provided"}
            </strong>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
              Access Role
            </div>
            <span
              style={{
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                marginTop: "2px",
              }}
            >
              {user?.role || "Operator"}
            </span>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
              Account State
            </div>
            <strong style={{ fontSize: "14px", color: user?.is_active ? "#10b981" : "#ef4444" }}>
              {user?.is_active ? "Active & Authorized" : "Disabled"}
            </strong>
          </div>
        </div>
      </article>

      {/* API & Security Details */}
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
          <Globe size={20} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Backend API Target
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              fontSize: "13px",
            }}
          >
            <span style={{ color: "var(--muted)" }}>Base URL:</span>
            <strong style={{ color: "var(--accent)", fontFamily: "monospace" }}>
              {API_BASE_URL}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              fontSize: "13px",
            }}
          >
            <span style={{ color: "var(--muted)" }}>Authentication Scheme:</span>
            <strong style={{ color: "var(--text)" }}>OAuth2 Bearer Token (JWT / HS256)</strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              fontSize: "13px",
            }}
          >
            <span style={{ color: "var(--muted)" }}>Token Expiration:</span>
            <strong style={{ color: "var(--text)" }}>60 Minutes Sliding Window</strong>
          </div>
        </div>
      </article>

      {/* Interface & Theme Preferences */}
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
        <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
          Interface Theme & Appearance
        </h3>

        <div style={{ display: "flex", gap: "16px" }}>
          <button
            onClick={() => setTheme("dark")}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "10px",
              border: `2px solid ${theme === "dark" ? "var(--accent)" : "var(--border)"}`,
              background: "var(--panel-soft)",
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              fontWeight: 650,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <Moon size={18} />
            <span>Dark Navy (Enterprise)</span>
          </button>

          <button
            onClick={() => setTheme("light")}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "10px",
              border: `2px solid ${theme === "light" ? "var(--accent)" : "var(--border)"}`,
              background: "var(--panel-soft)",
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              fontWeight: 650,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <Sun size={18} />
            <span>Light Interface</span>
          </button>
        </div>
      </article>

      {/* Session Management & Danger Zone */}
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
        <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
          Session & Data Actions
        </h3>

        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleClearCache}
            style={{ height: "38px" }}
          >
            <Trash2 size={16} />
            <span>{cacheCleared ? "Cache Cleared!" : "Clear Local Storage Cache"}</span>
          </button>

          <button
            type="button"
            className="button button-danger"
            onClick={logout}
            style={{ height: "38px" }}
          >
            <LogOut size={16} />
            <span>End Session & Sign Out</span>
          </button>
        </div>
      </article>
    </div>
  );
}

