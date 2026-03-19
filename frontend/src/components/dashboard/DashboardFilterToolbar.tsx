import type { ReactNode } from "react";

type DashboardFilterToolbarProps = {
  id: string;
  open: boolean;
  className?: string;
  children: ReactNode;
};

export default function DashboardFilterToolbar({
  id,
  open,
  className = "",
  children,
}: DashboardFilterToolbarProps) {
  return (
    <div id={id} className={`admin-dashboard__hero admin-dashboard__hero--toolbar${open ? "" : " is-collapsed"}`}>
      <div className={`admin-dashboard__filters ${className}`.trim()}>{children}</div>
    </div>
  );
}
