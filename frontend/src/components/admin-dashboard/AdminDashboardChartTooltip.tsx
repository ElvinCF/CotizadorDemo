type TooltipRow = {
  label: string;
  value: string;
  color?: string;
};

type AdminDashboardChartTooltipProps = {
  title?: string;
  rows: TooltipRow[];
};

export default function AdminDashboardChartTooltip({ title, rows }: AdminDashboardChartTooltipProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="admin-chart-tooltip">
      {title ? <div className="admin-chart-tooltip__title">{title}</div> : null}
      <div className="admin-chart-tooltip__rows">
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="admin-chart-tooltip__row">
            <span className="admin-chart-tooltip__label">
              {row.color ? <i style={{ backgroundColor: row.color }} aria-hidden="true" /> : null}
              {row.label}
            </span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
