import type { ReactNode } from "react";

type DataTableProps = {
  children: ReactNode;
  className?: string;
};

export default function DataTable({ children, className = "" }: DataTableProps) {
  return <div className={`data-table ${className}`.trim()}>{children}</div>;
}
