import type { ReactNode } from "react";

type DataTableFiltersProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
};

export default function DataTableFilters({ open, children, className = "" }: DataTableFiltersProps) {
  return (
    <div className={`data-table-filters${open ? " is-open" : ""} ${className}`.trim()}>
      <div className="data-table-filters__inner">{children}</div>
    </div>
  );
}
