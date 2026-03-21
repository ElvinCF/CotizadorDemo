type BarItem = {
  label: string;
  valueLabel: string;
  helper: string;
  ratio: number;
};

type AdminDashboardBarChartProps = {
  title: string;
  subtitle: string;
  items: BarItem[];
};

export default function AdminDashboardBarChart({
  title,
  subtitle,
  items,
}: AdminDashboardBarChartProps) {
  return (
    <article className="admin-dashboard-panel admin-dashboard-panel--bars">
      <div className="admin-dashboard-panel__head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="admin-bars">
        {items.map((item) => (
          <div className="admin-bars__item" key={item.label}>
            <div className="admin-bars__meta">
              <div>
                <strong>{item.label}</strong>
                <span>{item.helper}</span>
              </div>
              <span>{item.valueLabel}</span>
            </div>
            <div className="admin-bars__track">
              <span className="admin-bars__fill" style={{ width: `${Math.max(6, item.ratio * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
