import type { ReactNode } from "react";

type DashboardFilterFieldProps = {
  label: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function DashboardFilterField({
  label,
  icon,
  className = "",
  children,
}: DashboardFilterFieldProps) {
  return (
    <label className={`admin-dashboard__filter ${className}`.trim()}>
      <span>
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
