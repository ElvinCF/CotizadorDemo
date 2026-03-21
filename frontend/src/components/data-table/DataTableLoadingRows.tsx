type DataTableLoadingRowsProps = {
  colSpan: number;
  rows?: number;
  label?: string;
};

const widths = ["92%", "84%", "76%", "88%", "72%", "80%"];

export default function DataTableLoadingRows({
  colSpan,
  rows = 5,
  label = "Cargando datos",
}: DataTableLoadingRowsProps) {
  return (
    <>
      <tr>
        <td colSpan={colSpan} className="data-table__loading-caption-cell">
          <span className="data-table__loading-caption">{label}</span>
          <span className="data-table__loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </td>
      </tr>

      {Array.from({ length: rows }).map((_, index) => (
        <tr key={`table-loader-${index}`} className="data-table__skeleton-row" aria-hidden="true">
          <td colSpan={colSpan}>
            <div className="data-table__skeleton-wrap">
              <span
                className="data-table__skeleton-line"
                style={{
                  width: widths[index % widths.length],
                  animationDelay: `${index * 80}ms`,
                }}
              />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
