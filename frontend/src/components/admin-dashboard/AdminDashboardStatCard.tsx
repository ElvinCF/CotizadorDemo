import type { ReactNode } from "react";

type AdminDashboardStatCardProps = {
  label: string;
  value: string;
  helper: string;
  trend: string;
  tone?: "neutral" | "success" | "warning" | "info";
  icon: ReactNode;
};

export default function AdminDashboardStatCard({
  label,
  value,
  helper,
  trend,
  tone = "neutral",
  icon,
}: AdminDashboardStatCardProps) {
  return (
    <article className={`admin-dashboard-stat admin-dashboard-stat--${tone}`}>
      <div className="admin-dashboard-stat__head">
        <span className="admin-dashboard-stat__label">{label}</span>
        <span className="admin-dashboard-stat__icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong className="admin-dashboard-stat__value">{value}</strong>
      <div className="admin-dashboard-stat__foot">
        <span className="admin-dashboard-stat__trend">{trend}</span>
        <span className="admin-dashboard-stat__helper">{helper}</span>
      </div>
    </article>
  );
}
