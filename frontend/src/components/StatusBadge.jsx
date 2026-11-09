import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default function StatusBadge({
  status = "unknown",
  label,
  size = "md",
  showIcon = true,
}) {
  const norm = String(status).toLowerCase();

  let bg = "rgba(148, 163, 184, 0.15)";
  let color = "var(--muted)";
  let Icon = Clock;

  if (norm.includes("complete") || norm.includes("verified") || norm.includes("active") || norm.includes("success") || norm.includes("high")) {
    bg = "rgba(16, 185, 129, 0.15)";
    color = "#10b981";
    Icon = CheckCircle2;
  } else if (norm.includes("admin") || norm.includes("warning") || norm.includes("potential") || norm.includes("medium")) {
    bg = "rgba(245, 158, 11, 0.15)";
    color = "#f59e0b";
    Icon = AlertTriangle;
  } else if (norm.includes("fail") || norm.includes("tamper") || norm.includes("disable") || norm.includes("error") || norm.includes("low")) {
    bg = "rgba(239, 68, 68, 0.15)";
    color = "#ef4444";
    Icon = ShieldAlert;
  } else if (norm.includes("tool") || norm.includes("model")) {
    bg = "rgba(139, 92, 246, 0.15)";
    color = "#a78bfa";
    Icon = ShieldCheck;
  }

  const padding = size === "sm" ? "2px 7px" : "3px 9px";
  const fontSize = size === "sm" ? "10px" : "11px";

  return (
    <span
      className="badge"
      style={{
        background: bg,
        color: color,
        padding,
        fontSize,
        fontWeight: 650,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        borderRadius: "12px",
      }}
    >
      {showIcon && <Icon size={size === "sm" ? 11 : 13} />}
      <span>{label || status}</span>
    </span>
  );
}

