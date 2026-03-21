type LineDatum = {
  label: string;
  value: number;
};

type AdminDashboardLineChartProps = {
  title: string;
  subtitle: string;
  legend: string;
  data: LineDatum[];
};

const buildPath = (values: number[], width: number, height: number) => {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

export default function AdminDashboardLineChart({
  title,
  subtitle,
  legend,
  data,
}: AdminDashboardLineChartProps) {
  const values = data.map((item) => item.value);
  const width = 520;
  const height = 210;
  const path = buildPath(values, width, height);
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <article className="admin-dashboard-panel admin-dashboard-panel--line">
      <div className="admin-dashboard-panel__head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="admin-dashboard-panel__legend">{legend}</span>
      </div>

      <div className="admin-line-chart">
        <svg viewBox={`0 0 ${width} ${height + 24}`} aria-hidden="true" preserveAspectRatio="none">
          {[0.25, 0.5, 0.75, 1].map((tick) => (
            <line
              key={tick}
              x1="0"
              x2={width}
              y1={height * tick}
              y2={height * tick}
              className="admin-line-chart__grid"
            />
          ))}
          <path d={areaPath} className="admin-line-chart__area" />
          <path d={path} className="admin-line-chart__path" />
          {values.map((value, index) => {
            const max = Math.max(...values, 1);
            const min = Math.min(...values, 0);
            const range = Math.max(max - min, 1);
            const stepX = values.length > 1 ? width / (values.length - 1) : width;
            const x = index * stepX;
            const y = height - ((value - min) / range) * height;
            return <circle key={`${data[index]?.label}-${value}`} cx={x} cy={y} r="4" className="admin-line-chart__dot" />;
          })}
        </svg>
        <div className="admin-line-chart__labels">
          {data.map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
