type RankingItem = {
  name: string;
  detail: string;
  valueLabel: string;
  helper: string;
  initials: string;
};

type RankingMetricOption = {
  value: string;
  label: string;
};

type AdminDashboardRankingProps = {
  title: string;
  subtitle: string;
  items: RankingItem[];
  metric?: string;
  metricOptions?: RankingMetricOption[];
  onMetricChange?: (metric: string) => void;
};

export default function AdminDashboardRanking({
  title,
  subtitle,
  items,
  metric,
  metricOptions,
  onMetricChange,
}: AdminDashboardRankingProps) {
  return (
    <article className="admin-dashboard-panel admin-dashboard-panel--ranking">
      <div className="admin-dashboard-panel__head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {metric && metricOptions && onMetricChange ? (
          <label className="admin-ranking__metric">
            <span className="sr-only">Metrica ranking</span>
            <select value={metric} onChange={(event) => onMetricChange(event.target.value)}>
              {metricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="admin-ranking">
        {items.map((item) => (
          <div className="admin-ranking__item" key={`${item.name}-${item.detail}`}>
            <span className="admin-ranking__avatar">{item.initials}</span>
            <div className="admin-ranking__body">
              <strong>{item.name}</strong>
              <span>{item.detail}</span>
            </div>
            <div className="admin-ranking__value">
              <strong>{item.valueLabel}</strong>
              <span>{item.helper}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
