export default function TrustGauge({
  score,
  category = "Moderate",
  size = 220,
  strokeWidth = 15,
  showNote = true,
}) {
  const numericScore = Math.max(0, Math.min(100, Number(score) || 0));

  // Determine stroke color based on score and category
  let strokeColor = "#3985e8"; // Blue default
  if (category === "High" || numericScore >= 80) strokeColor = "#10b981"; // Emerald
  else if (category === "Moderate" || numericScore >= 60) strokeColor = "#f59e0b"; // Amber
  else strokeColor = "#ef4444"; // Red

  return (
    <div className="gauge-wrap" style={{ width: size, margin: "0 auto" }}>
      <svg
        viewBox="0 0 220 140"
        className="trust-gauge"
        role="img"
        aria-label={`Trust score gauge: ${numericScore} out of 100`}
      >
        {/* Track path */}
        <path
          d="M 25 115 A 85 85 0 0 1 195 115"
          fill="none"
          stroke="var(--track)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Active arc */}
        <path
          d="M 25 115 A 85 85 0 0 1 195 115"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${numericScore} 100`}
          style={{ transition: "stroke-dasharray 1s ease, stroke 0.5s ease" }}
        />
      </svg>
      <div className="gauge-value">
        <strong>{score != null ? numericScore : "--"}</strong>
        <span>out of 100</span>
      </div>
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <span
          className={`result-badge ${
            category === "High"
              ? "good"
              : category === "Moderate"
              ? "warning"
              : "bad"
          }`}
        >
          {category} Trust
        </span>
      </div>
      {showNote && (
        <p className="muted-note" style={{ textAlign: "center", marginTop: 10 }}>
          Rule-based provenance assessment — not a probability of factual truth.
        </p>
      )}
    </div>
  );
}

