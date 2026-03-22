import {
  Area,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminDashboardChartTooltip from "./AdminDashboardChartTooltip";

type LineDatum = {
  label: string;
  sold?: number;
  collected?: number;
  value?: number;
};

type AdminDashboardLineChartProps = {
  title: string;
  subtitle: string;
  legend: string;
  data: LineDatum[];
  groupBy?: "day" | "week" | "month";
  onGroupByChange?: (next: "day" | "week" | "month") => void;
};

const formatCompactK = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(Math.round(value));

export default function AdminDashboardLineChart({
  title,
  subtitle,
  legend,
  data,
  groupBy,
  onGroupByChange,
}: AdminDashboardLineChartProps) {
  const chartData = data.map((item) => ({
    label: item.label,
    sold: Number(item.sold ?? item.value ?? 0),
    collected: Number(item.collected ?? 0),
  }));

  return (
    <article className="admin-dashboard-panel admin-dashboard-panel--line">
      <div className="admin-dashboard-panel__head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="admin-line-chart__head-actions">
          <span className="admin-dashboard-panel__legend">{legend}</span>
          {groupBy && onGroupByChange ? (
            <div className="admin-line-chart__groupby" role="tablist" aria-label="Agrupacion">
              <button
                type="button"
                className={`btn ghost ${groupBy === "day" ? "is-active" : ""}`}
                onClick={() => onGroupByChange("day")}
              >
                Día
              </button>
              <button
                type="button"
                className={`btn ghost ${groupBy === "week" ? "is-active" : ""}`}
                onClick={() => onGroupByChange("week")}
              >
                Sem
              </button>
              <button
                type="button"
                className={`btn ghost ${groupBy === "month" ? "is-active" : ""}`}
                onClick={() => onGroupByChange("month")}
              >
                Mes
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="admin-line-chart admin-line-chart--recharts" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 26, right: 30, left: 6, bottom: 6 }}>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.45} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              cursor={{ stroke: "var(--color-border)", strokeOpacity: 0.7 }}
              content={({ active, label }) => {
                if (!active) {
                  return null;
                }
                const point = chartData.find((item) => item.label === String(label ?? ""));
                if (!point) {
                  return null;
                }
                return (
                  <AdminDashboardChartTooltip
                    title={`Periodo: ${String(label ?? "")}`}
                    rows={[
                      {
                        label: "Vendido",
                        value: new Intl.NumberFormat("es-PE", {
                          style: "currency",
                          currency: "PEN",
                          maximumFractionDigits: 2,
                        }).format(Number(point.sold ?? 0) || 0),
                        color: "var(--color-primary)",
                      },
                      {
                        label: "Cobrado",
                        value: new Intl.NumberFormat("es-PE", {
                          style: "currency",
                          currency: "PEN",
                          maximumFractionDigits: 2,
                        }).format(Number(point.collected ?? 0) || 0),
                        color: "color-mix(in srgb, var(--color-success) 70%, white)",
                      },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="sold"
              stroke="none"
              fill="color-mix(in srgb, var(--color-primary) 14%, transparent)"
              isAnimationActive
              animationDuration={450}
            />
            <Line
              type="monotone"
              dataKey="sold"
              name="sold"
              stroke="var(--color-primary)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--color-primary-strong)", stroke: "var(--color-surface)", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive
              animationDuration={500}
            >
              <LabelList
                dataKey="sold"
                position="top"
                offset={8}
                formatter={(value: unknown) => formatCompactK(Number(value ?? 0))}
                className="admin-line-chart__point-label"
              />
            </Line>
            <Line
              type="monotone"
              dataKey="collected"
              name="collected"
              stroke="color-mix(in srgb, var(--color-success) 70%, white)"
              strokeWidth={2.6}
              strokeDasharray="5 4"
              dot={{ r: 3.4, fill: "color-mix(in srgb, var(--color-success) 65%, white)", stroke: "var(--color-surface)", strokeWidth: 2 }}
              activeDot={{ r: 4 }}
              isAnimationActive
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
