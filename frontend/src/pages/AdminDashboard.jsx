import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import dashboardService from "../services/dashboardService";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getAdminUsers();
      setUsers(data.users || []);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        "Failed to retrieve operator accounts from the administrative directory.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (targetUser) => {
    if (targetUser.id === user?.id) {
      setError("Self-Protection Policy: You cannot disable your own active administrator account.");
      return;
    }

    setUpdatingId(targetUser.id);
    setError(null);
    setActionSuccess(null);

    const newStatus = !targetUser.is_active;

    try {
      await dashboardService.updateUserStatus(targetUser.id, newStatus);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, is_active: newStatus ? 1 : 0 } : u
        )
      );
      setActionSuccess(
        `User "${targetUser.username}" has been ${newStatus ? "activated" : "disabled"} successfully.`
      );
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      const detail =
        err?.response?.data?.detail || "Failed to update operator status.";
      setError(detail);
    } finally {
      setUpdatingId(null);
    }
  };

  // RBAC Guard: If logged in user is not admin
  if (user?.role !== "admin") {
    return (
      <div
        className="page-container"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 20px",
          textAlign: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.12)",
            color: "#ef4444",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 750, color: "var(--text)", margin: 0 }}>
          Administrator Privileges Required (HTTP 403)
        </h2>
        <p style={{ color: "var(--muted)", maxWidth: 480, fontSize: "13px", lineHeight: 1.5 }}>
          Your current account (<strong>{user?.username || "Guest"}</strong>) possesses a standard <code>user</code> role and is not authorized to access administrative operations.
        </p>
      </div>
    );
  }

  // Filter users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      String(u.id).includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const disabledUsers = totalUsers - activeUsers;
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div
      className="page-container"
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* Header */}
      <div
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
          <div className="eyebrow" style={{ color: "#f59e0b" }}>
            RESTRICTED ACCESS · SYSTEM ADMINISTRATOR
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 750, color: "var(--text)", margin: "4px 0" }}>
            Operator Directory & Role Management
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0, maxWidth: 680 }}>
            Inspect registered platform operators, verify cryptographic privilege levels, and manage account authorization statuses.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 16px",
            background: "var(--panel-soft)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 650,
            color: "var(--text)",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Action / Error Alerts */}
      {actionSuccess && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "10px",
            color: "#10b981",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "10px",
            color: "#ef4444",
            fontSize: "13px",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
            Total Operators
          </div>
          <strong style={{ fontSize: "24px", color: "var(--text)" }}>{totalUsers}</strong>
        </div>

        <div
          style={{
            padding: "18px 20px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
            Active Accounts
          </div>
          <strong style={{ fontSize: "24px", color: "#10b981" }}>{activeUsers}</strong>
        </div>

        <div
          style={{
            padding: "18px 20px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
            Disabled Accounts
          </div>
          <strong style={{ fontSize: "24px", color: disabledUsers > 0 ? "#ef4444" : "var(--muted)" }}>
            {disabledUsers}
          </strong>
        </div>

        <div
          style={{
            padding: "18px 20px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
            Administrators
          </div>
          <strong style={{ fontSize: "24px", color: "#f59e0b" }}>{adminCount}</strong>
        </div>
      </div>

      {/* Search Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "14px 18px",
        }}
      >
        <div style={{ position: "relative", width: 280 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
            }}
          />
          <input
            type="text"
            placeholder="Search by username, email, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px 7px 32px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--panel-soft)",
              color: "var(--text)",
              fontSize: "12px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
          Showing <strong>{filteredUsers.length}</strong> of {totalUsers} accounts
        </div>
      </div>

      {/* Users Table */}
      <div
        className="panel"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "var(--panel-soft)",
                  color: "var(--subtle)",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                <th style={{ padding: "14px 18px" }}>ID</th>
                <th style={{ padding: "14px 18px" }}>Operator</th>
                <th style={{ padding: "14px 18px" }}>Email</th>
                <th style={{ padding: "14px 18px" }}>Access Role</th>
                <th style={{ padding: "14px 18px" }}>Created At</th>
                <th style={{ padding: "14px 18px" }}>Status</th>
                <th style={{ padding: "14px 18px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "36px", textAlign: "center" }}>
                    <LoadingState message="Loading operator registry..." compact />
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isSelf = u.id === user?.id;
                  const isUpdating = updatingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: isSelf ? "rgba(59, 130, 246, 0.04)" : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "14px 18px",
                          fontFamily: "monospace",
                          color: "var(--muted)",
                          fontSize: "12px",
                        }}
                      >
                        #{u.id}
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: 650, color: "var(--text)" }}>
                          {u.username}
                          {isSelf && (
                            <span
                              style={{
                                marginLeft: "6px",
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: "var(--accent-soft)",
                                color: "var(--accent)",
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>
                        {u.full_name && (
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {u.full_name}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "14px 18px", color: "var(--muted)" }}>
                        {u.email}
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background:
                              u.role === "admin"
                                ? "rgba(245, 158, 11, 0.15)"
                                : "rgba(59, 130, 246, 0.12)",
                            color: u.role === "admin" ? "#f59e0b" : "#60a5fa",
                            textTransform: "uppercase",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", color: "var(--muted)", fontSize: "12px" }}>
                        {u.created_at}
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: u.is_active
                              ? "rgba(16, 185, 129, 0.12)"
                              : "rgba(239, 68, 68, 0.12)",
                            color: u.is_active ? "#10b981" : "#ef4444",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: u.is_active ? "#10b981" : "#ef4444",
                            }}
                          />
                          <span>{u.is_active ? "Active" : "Disabled"}</span>
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSelf || isUpdating}
                          title={
                            isSelf
                              ? "You cannot disable your own administrator account"
                              : u.is_active
                              ? "Deactivate operator access"
                              : "Authorize and activate operator"
                          }
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            background: isSelf
                              ? "var(--panel-soft)"
                              : u.is_active
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(16, 185, 129, 0.1)",
                            color: isSelf
                              ? "var(--subtle)"
                              : u.is_active
                              ? "#ef4444"
                              : "#10b981",
                            fontSize: "11px",
                            fontWeight: 650,
                            cursor: isSelf || isUpdating ? "not-allowed" : "pointer",
                            opacity: isSelf ? 0.6 : 1,
                          }}
                        >
                          {u.is_active ? (
                            <>
                              <UserX size={12} />
                              <span>Disable</span>
                            </>
                          ) : (
                            <>
                              <UserCheck size={12} />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "36px", textAlign: "center", color: "var(--muted)" }}>
                    No operators match the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

