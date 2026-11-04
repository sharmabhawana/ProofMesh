import { Menu, Moon, Sun, RefreshCw, ShieldCheck } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { NAVIGATION_ITEMS } from "./Sidebar";

export default function Topbar({
  activePage,
  onOpenSidebar,
  onRefresh,
  isLoading,
  backendConnected = true,
}) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const currentNav =
    NAVIGATION_ITEMS.find((item) => item.id === activePage) || {
      label: "Dashboard",
    };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="icon-button mobile-menu"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <div className="breadcrumb">
            <span>ProofMesh</span>
            <span style={{ margin: "0 6px", color: "var(--subtle)" }}>/</span>
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>
              {currentNav.label}
            </span>
          </div>
          <h2 style={{ fontSize: "19px", fontWeight: 700, margin: 0 }}>
            {currentNav.label}
          </h2>
        </div>
      </div>

      <div className="topbar-actions">
        {/* Backend Connectivity Status */}
        <div
          className={`connection-pill ${
            !backendConnected ? "has-error" : ""
          }`}
          title={
            backendConnected
              ? "FastAPI backend connected"
              : "Backend unavailable"
          }
        >
          <span
            className={`mini-dot ${
              isLoading
                ? "warning"
                : backendConnected
                ? "online"
                : "warning"
            }`}
          />
          <span>
            {isLoading
              ? "Syncing"
              : backendConnected
              ? "API Connected"
              : "API Disconnected"}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          className="icon-button theme-button"
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Refresh Data Button */}
        <button
          className="refresh-button"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh dashboard data from backend"
        >
          <RefreshCw size={14} className={isLoading ? "spin" : ""} />
          <span>Refresh</span>
        </button>

        {/* User Badge */}
        {user && (
          <div
            className="user-badge-top"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 10px",
              borderRadius: "20px",
              background: "var(--panel-soft)",
              border: "1px solid var(--border)",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={14} style={{ color: "var(--accent)" }} />
            <span>{user.username}</span>
          </div>
        )}
      </div>
    </header>
  );
}

