import {
  LayoutDashboard,
  Network,
  LockKeyhole,
  ShieldCheck,
  GitBranch,
  Database,
  Activity,
  Settings,
  LogOut,
  X,
  User,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const BASE_NAVIGATION_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "workflow", label: "Workflow Explorer", icon: Network },
  { id: "integrity", label: "Integrity Center", icon: LockKeyhole },
  { id: "trust", label: "Trust Analytics", icon: ShieldCheck },
  { id: "impact", label: "Impact Analysis", icon: GitBranch },
  { id: "sources", label: "Data Sources", icon: Database },
  { id: "health", label: "System Health", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

export const ADMIN_NAVIGATION_ITEM = {
  id: "admin",
  label: "Admin Console",
  icon: ShieldAlert,
  badge: "Admin",
};

export const NAVIGATION_ITEMS = [
  ...BASE_NAVIGATION_ITEMS,
  ADMIN_NAVIGATION_ITEM,
];

export default function Sidebar({
  activePage,
  onNavigate,
  isOpen,
  onClose,
  backendConnected = true,
}) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const navigationItems = isAdmin
    ? [...BASE_NAVIGATION_ITEMS, ADMIN_NAVIGATION_ITEM]
    : BASE_NAVIGATION_ITEMS;

  return (
    <>
      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        {/* Brand */}
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1>ProofMesh</h1>
            <span>AI TRUST & PROVENANCE</span>
          </div>
          <button
            className="mobile-close icon-button"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav">
          {navigationItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              className={`nav-link ${activePage === id ? "active" : ""}`}
              onClick={() => {
                onNavigate(id);
                if (onClose) onClose();
              }}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Icon size={18} style={{ color: id === "admin" ? "#f59e0b" : "inherit" }} />
                <span>{label}</span>
              </div>
              {badge && (
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 750,
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(245, 158, 11, 0.2)",
                    color: "#f59e0b",
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="sidebar-bottom">
          {/* Status badge */}
          <div className="sidebar-status">
            <span
              className={`mini-dot ${backendConnected ? "online" : "warning"}`}
            />
            <div>
              <strong>Backend Status</strong>
              <small>
                {backendConnected ? "FastAPI Operational" : "Backend Offline"}
              </small>
            </div>
          </div>

          {/* User Profile & Logout */}
          {user && (
            <div
              className="sidebar-user"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                marginTop: "10px",
                background: "var(--panel-soft)",
                borderRadius: "10px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: isAdmin
                      ? "rgba(245, 158, 11, 0.15)"
                      : "var(--accent-soft)",
                    color: isAdmin ? "#f59e0b" : "var(--accent)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {isAdmin ? <ShieldAlert size={16} /> : <User size={16} />}
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 650,
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.username}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: isAdmin ? "#f59e0b" : "var(--muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {user.role}
                  </div>
                </div>
              </div>
              <button
                className="icon-button"
                onClick={logout}
                title="Log out"
                style={{
                  color: "var(--muted)",
                  padding: "6px",
                  borderRadius: "6px",
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          <div className="sidebar-version">PROOFMESH · v1.0 ENTERPRISE</div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isOpen && (
        <button
          className="sidebar-overlay"
          onClick={onClose}
          aria-label="Close sidebar backdrop"
        />
      )}
    </>
  );
}
