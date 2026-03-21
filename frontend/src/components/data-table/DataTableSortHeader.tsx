import type { ReactNode } from "react";
import type { SortDirection } from "./types";

const SortNeutral = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const SortAsc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M8 13l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SortDesc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="m8 11 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type DataTableSortHeaderProps = {
  label: ReactNode;
  direction: SortDirection;
  onToggle: () => void;
  className?: string;
};

export default function DataTableSortHeader({
  label,
  direction,
  onToggle,
  className = "",
}: DataTableSortHeaderProps) {
  const Icon = direction === "asc" ? SortAsc : direction === "desc" ? SortDesc : SortNeutral;

  return (
    <button type="button" className={`data-table-sort ${className}`.trim()} onClick={onToggle}>
      <span>{label}</span>
      <span className={`data-table-sort__icon${direction ? " is-active" : ""}`} aria-hidden="true">
        <Icon />
      </span>
    </button>
  );
}
