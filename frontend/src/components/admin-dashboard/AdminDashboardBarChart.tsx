import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AdminDashboardChartTooltip from "./AdminDashboardChartTooltip";

type BarItem = {
  label: string;
  valueLabel: string;
  helper: string;
  ratio: number;
  primaryAmount?: number;
  secondaryValueLabel?: string;
  secondaryRatio?: number;
  secondaryAmount?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
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
  const hasSecondary = items.some((item) => typeof item.secondaryRatio === "number");
  const chartData = items.map((item) => ({
    label: item.label,
    valueLabel: item.valueLabel,
    primaryLabel: item.primaryLabel ?? "Vendido",
    helper: item.helper,
    value: Math.max(0, Number(item.ratio) * 100),
    primaryAmount: Number(item.primaryAmount ?? 0) || 0,
    secondaryValueLabel: item.secondaryValueLabel ?? "",
    secondaryLabel: item.secondaryLabel ?? "Cobrado",
    secondaryValue: Math.max(0, Number(item.secondaryRatio ?? 0) * 100),
    secondaryAmount: Number(item.secondaryAmount ?? 0) || 0,
  }));

  return (
    <article className="admin-dashboard-panel admin-dashboard-panel--bars">
      <div className="admin-dashboard-panel__head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="admin-bars admin-bars--recharts admin-bars--expanded">
        <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * (hasSecondary ? 66 : 48))}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 6, right: 80, left: 6, bottom: 6 }}>
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey="label"
              width={130}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text)", fontSize: 12, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ fill: "color-mix(in srgb, var(--color-primary) 10%, transparent)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }
                const rows = payload
                  .map((entry) => {
                    const dataKey = String(entry.dataKey ?? "");
                    if (dataKey === "secondaryValue") {
                      return {
                        label: String(entry.payload?.secondaryLabel ?? "Cobrado"),
                        value: String(entry.payload?.secondaryValueLabel ?? `${Number(entry.value ?? 0).toFixed(1)}%`),
                        color: typeof entry.color === "string" ? entry.color : undefined,
                      };
                    }
                    return {
                      label: String(entry.payload?.primaryLabel ?? "Vendido"),
                      value: String(entry.payload?.valueLabel ?? `${Number(entry.value ?? 0).toFixed(1)}%`),
                      color: typeof entry.color === "string" ? entry.color : undefined,
                    };
                  })
                  .filter(Boolean);
                const soldAmount = Number(payload[0]?.payload?.primaryAmount ?? 0);
                const collectedAmount = Number(payload[0]?.payload?.secondaryAmount ?? 0);
                const pendingAmount = Math.max(0, soldAmount - collectedAmount);
                const formatMoney = (value: number) =>
                  new Intl.NumberFormat("es-PE", {
                    style: "currency",
                    currency: "PEN",
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(value);
                return (
                  <AdminDashboardChartTooltip
                    title={`Asesor: ${String(label ?? "")}`}
                    rows={[
                      ...rows,
                      {
                        label: "Por cobrar",
                        value: formatMoney(pendingAmount),
                        color: "color-mix(in srgb, var(--color-warning) 78%, white)",
                      },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 0, 0, 0]} minPointSize={6}>
              {chartData.map((item) => (
                <Cell
                  key={item.label}
                  fill="color-mix(in srgb, var(--color-primary) 70%, white)"
                />
              ))}
              <LabelList
                dataKey="valueLabel"
                position="right"
                fill="var(--color-text)"
                fontSize={12}
                fontWeight={700}
              />
            </Bar>
            {hasSecondary ? (
              <Bar dataKey="secondaryValue" radius={[0, 0, 0, 0]} minPointSize={6}>
                {chartData.map((item) => (
                  <Cell
                    key={`${item.label}-secondary`}
                    fill="color-mix(in srgb, var(--color-success) 70%, white)"
                  />
                ))}
                <LabelList
                  dataKey="secondaryValueLabel"
                  position="right"
                  fill="var(--color-text)"
                  fontSize={11}
                  fontWeight={700}
                />
              </Bar>
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
