import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AdminDashboardChartTooltip from "./AdminDashboardChartTooltip";

type ManzanaChartItem = {
  manzana: string;
  valorTotalMz: number;
  valorVendido: number;
  valorCobrado: number;
};

type ManzanaRankingMetric = "todas" | "valor_total_mz" | "valor_vendido" | "valor_cobrado";

type ManzanaRankingOption = {
  value: ManzanaRankingMetric;
  label: string;
};

type AdminDashboardManzanaChartProps = {
  title: string;
  subtitle: string;
  items: ManzanaChartItem[];
  metric: ManzanaRankingMetric;
  metricOptions: ManzanaRankingOption[];
  onMetricChange: (next: ManzanaRankingMetric) => void;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export default function AdminDashboardManzanaChart({
  title,
  subtitle,
  items,
  metric,
  metricOptions,
  onMetricChange,
}: AdminDashboardManzanaChartProps) {
  const chartData = items.map((item) => ({
    label: `MZ ${item.manzana}`,
    ...item,
  }));

  return (
    <article className="admin-dashboard-panel admin-dashboard-panel--bars">
      <div className="admin-dashboard-panel__head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <label className="admin-ranking__metric">
          <span className="sr-only">Metrica de ranking por manzana</span>
          <select value={metric} onChange={(event) => onMetricChange(event.target.value as ManzanaRankingMetric)}>
            {metricOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-bars admin-bars--recharts admin-bars--expanded">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 6 }} barGap={5}>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.45} vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              minTickGap={0}
              tick={{ fill: "var(--color-muted)", fontSize: 11, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tickFormatter={(value: number) => formatMoney(value)} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={66} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }
                const row = payload[0]?.payload as ManzanaChartItem | undefined;
                if (!row) {
                  return null;
                }
                return (
                  <AdminDashboardChartTooltip
                    title={`Manzana: ${String(label ?? "")}`}
                    rows={[
                      {
                        label: "Valor total",
                        value: formatMoney(row.valorTotalMz),
                        color: "color-mix(in srgb, var(--color-primary) 70%, white)",
                      },
                      {
                        label: "Vendido",
                        value: formatMoney(row.valorVendido),
                        color: "color-mix(in srgb, var(--color-warning) 72%, white)",
                      },
                      {
                        label: "Cobrado",
                        value: formatMoney(row.valorCobrado),
                        color: "color-mix(in srgb, var(--color-success) 72%, white)",
                      },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="valorTotalMz" name="Valor total" fill="color-mix(in srgb, var(--color-primary) 70%, white)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="valorVendido" name="Vendido" fill="color-mix(in srgb, var(--color-warning) 72%, white)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="valorCobrado" name="Cobrado" fill="color-mix(in srgb, var(--color-success) 72%, white)" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
