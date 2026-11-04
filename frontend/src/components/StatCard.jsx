export default function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  status,
  trend,
  className = "",
}) {
  return (
    <article className={`stat-card ${className}`}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className="stat-icon">
            <Icon size={19} />
          </span>
        )}
      </div>
      <div className="stat-value">{value ?? "--"}</div>
      {(detail || status || trend) && (
        <div className="stat-detail">
          {status && <span className={`mini-dot ${status}`} />}
          {detail && <span>{detail}</span>}
          {trend && <span className={`stat-trend ${trend.type}`}>{trend.text}</span>}
        </div>
      )}
    </article>
  );
}

