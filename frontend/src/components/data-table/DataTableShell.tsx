import type { ReactNode } from "react";

type DataTableShellProps = {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  toolbar: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function DataTableShell({
  title,
  subtitle,
  meta,
  toolbar,
  filters,
  children,
  className = "",
}: DataTableShellProps) {
  return (
    <section className={`data-table-shell ${className}`.trim()}>
      <header className="data-table-shell__head">
        <div className="data-table-shell__heading">
          <div className="data-table-shell__title-row">
            <h2>{title}</h2>
            {meta ? <div className="data-table-shell__meta">{meta}</div> : null}
          </div>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {toolbar}
      </header>

      <div className="data-table-shell__toolbar-zone">{filters}</div>

      <div className="data-table-shell__body">{children}</div>
    </section>
  );
}
