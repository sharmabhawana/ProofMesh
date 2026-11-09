export default function PageHeader({
  badge,
  icon: Icon,
  title,
  description,
  actions,
}) {
  return (
    <div className="page-header" style={{ marginBottom: "24px" }}>
      <div>
        {badge && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <span className="badge">
              {Icon && <Icon size={12} />}
              <span>{badge}</span>
            </span>
          </div>
        )}
        <h2 style={{ fontSize: "22px", fontWeight: 750, color: "var(--text)", margin: "4px 0", letterSpacing: "-0.4px" }}>
          {title}
        </h2>
        {description && (
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0, maxWidth: 680, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {actions}
        </div>
      )}
    </div>
  );
}

