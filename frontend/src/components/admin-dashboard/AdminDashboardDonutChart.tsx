import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import AdminDashboardChartTooltip from "./AdminDashboardChartTooltip";

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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const normalized = segments
    .map((segment) => ({ ...segment, value: Number(segment.value) || 0 }))
    .filter((segment) => segment.value > 0);

  const total = normalized.reduce((sum, segment) => sum + segment.value, 0);

  const withPct = normalized.map((segment) => ({
    ...segment,
    pct: total > 0 ? (segment.value / total) * 100 : 0,
  }));

  const renderLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    outerRadius?: number;
    payload?: { label?: string; value?: number; pct?: number; color?: string };
  }) => {
    const cx = props.cx ?? 0;
    const cy = props.cy ?? 0;
    const midAngle = props.midAngle ?? 0;
    const outerRadius = props.outerRadius ?? 0;
    const rad = Math.PI / 180;
    const p1x = cx + (outerRadius + 6) * Math.cos(-midAngle * rad);
    const p1y = cy + (outerRadius + 6) * Math.sin(-midAngle * rad);
    const p2x = cx + (outerRadius + 22) * Math.cos(-midAngle * rad);
    const p2y = cy + (outerRadius + 22) * Math.sin(-midAngle * rad);
    const textRight = p2x >= cx;
    const textX = p2x + (textRight ? 8 : -8);
    const label = props.payload?.label ?? "";
    const value = Number(props.payload?.value ?? 0);
    const pct = Number(props.payload?.pct ?? 0);
    const color = props.payload?.color ?? "var(--color-text)";
    return (
      <g>
        <path d={`M${p1x},${p1y} L${p2x},${p2y}`} stroke={color} strokeWidth={1.5} opacity={0.9} />
        <text
          x={textX}
          y={p2y}
          fill={color}
          fontSize={11}
          fontWeight={700}
          textAnchor={textRight ? "start" : "end"}
          dominantBaseline="central"
        >
          {`${label}: ${value} (${pct.toFixed(2)}%)`}
        </text>
      </g>
    );
  };

  return (
    <article className="admin-dashboard-panel admin-dashboard-panel--donut">
      <div className="admin-dashboard-panel__head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="admin-semidonut">
        <div className="admin-semidonut__chart">
          <ResponsiveContainer width="100%" height={175}>
            <PieChart>
              <Pie
                data={withPct}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="90%"
                startAngle={180}
                endAngle={0}
                innerRadius={62}
                outerRadius={88}
                paddingAngle={0}
                cornerRadius={0}
                stroke="none"
                labelLine={false}
                label={renderLabel}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                isAnimationActive={false}
              >
                {withPct.map((segment, index) => (
                  <Cell
                    key={segment.label}
                    fill={segment.color}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                    style={{ cursor: "pointer", transition: "opacity 160ms ease" }}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) {
                    return null;
                  }
                  const entry = payload[0];
                  const value = Number(entry.value ?? 0);
                  const pct = total > 0 ? (value / total) * 100 : 0;
                  return (
                    <AdminDashboardChartTooltip
                      rows={[
                        {
                          label: String(entry.name ?? "Estado"),
                          value: `${value} (${pct.toFixed(2)}%)`,
                          color: typeof entry.color === "string" ? entry.color : undefined,
                        },
                      ]}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="admin-semidonut__center">
            <strong>{centerValue}</strong>
            <span>{centerLabel}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
