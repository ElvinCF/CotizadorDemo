import type { ReactNode } from "react";

type DashboardFilterToolbarProps = {
  id: string;
  open: boolean;
  className?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function DashboardFilterToolbar({
  id,
  open,
  className = "",
  actions = null,
  children,
}: DashboardFilterToolbarProps) {
  return (
    <div
      id={id}
      data-dashboard-print-hide="true"
      className={`admin-dashboard__hero admin-dashboard__hero--toolbar${open ? "" : " is-collapsed"}`}
    >
      {actions ? <div className="admin-dashboard__toolbar-actions-row">{actions}</div> : null}
      {open ? <div className={`admin-dashboard__filters ${className}`.trim()}>{children}</div> : null}
    </div>
  );
}
