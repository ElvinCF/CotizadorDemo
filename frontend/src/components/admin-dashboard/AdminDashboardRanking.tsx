type RankingItem = {
  name: string;
  detail: string;
  valueLabel: string;
  helper: string;
  initials: string;
};

type AdminDashboardRankingProps = {
  title: string;
  subtitle: string;
  items: RankingItem[];
};

export default function AdminDashboardRanking({
  title,
  subtitle,
  items,
}: AdminDashboardRankingProps) {
  return (
    <article className="admin-dashboard-panel admin-dashboard-panel--ranking">
      <div className="admin-dashboard-panel__head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
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
