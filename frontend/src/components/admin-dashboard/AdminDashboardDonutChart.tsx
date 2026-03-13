type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type AdminDashboardDonutChartProps = {
  title: string;
  subtitle: string;
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
};

export default function AdminDashboardDonutChart({
  title,
  subtitle,
  segments,
  centerLabel,
  centerValue,
}: AdminDashboardDonutChartProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  let offset = 0;

  return (
    <article className="admin-dashboard-panel admin-dashboard-panel--donut">
      <div className="admin-dashboard-panel__head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="admin-donut">
        <div className="admin-donut__chart">
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <circle cx="80" cy="80" r={radius} className="admin-donut__track" />
            {segments.map((segment) => {
              const segmentLength = (segment.value / total) * circumference;
              const circle = (
                <circle
                  key={segment.label}
                  cx="80"
                  cy="80"
                  r={radius}
                  className="admin-donut__segment"
                  stroke={segment.color}
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += segmentLength;
              return circle;
            })}
          </svg>
          <div className="admin-donut__center">
            <strong>{centerValue}</strong>
            <span>{centerLabel}</span>
          </div>
        </div>

        <div className="admin-donut__legend">
          {segments.map((segment) => (
            <div className="admin-donut__legend-item" key={segment.label}>
              <span className="admin-donut__swatch" style={{ background: segment.color }} />
              <div>
                <strong>{segment.value}</strong>
                <span>{segment.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
