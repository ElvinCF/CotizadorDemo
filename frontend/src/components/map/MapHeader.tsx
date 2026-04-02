const IconMap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M3 6.5 9 3l6 3.5 6-3.5v14l-6 3.5-6-3.5-6 3.5V6.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconTable = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 10h18M9 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconExcel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M10 13h7m0 0-2.5-2.5M17 13l-2.5 2.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconDownload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M12 4v10m0 0 4-4m-4 4-4-4M5 18v2h14v-2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconSpinner = () => (
  <svg className="sales-spinner" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" opacity="0.28" />
    <path d="M12 4a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

type MapHeaderProps = {
  view: "mapa" | "tabla";
  setView: (next: "mapa" | "tabla") => void;
  filteredCount: number;
  onExportExecutivePdf: () => void;
  onExportTable: () => void;
  hideExecutiveExport?: boolean;
  exportExecutiveLoading?: boolean;
};

function MapHeader({
  view,
  setView,
  filteredCount,
  onExportExecutivePdf,
  onExportTable,
  hideExecutiveExport = false,
  exportExecutiveLoading = false,
}: MapHeaderProps) {
  return (
    <div className="map-header">
      <div className="map-header__row map-header__row--top">
        <div className="map-header__left">
          <div className="view-toggle">
            <button className={view === "mapa" ? "btn active" : "btn ghost"} onClick={() => setView("mapa")}>
              <IconMap />
              <span>Mapa</span>
            </button>
            <button className={view === "tabla" ? "btn active" : "btn ghost"} onClick={() => setView("tabla")}>
              <IconTable />
              <span>Tabla</span>
            </button>
          </div>
          <div className="map-header__info kpi-chip">
            <strong>{filteredCount}</strong> lotes
          </div>
        </div>
        <div className="map-header__right">
          {view === "mapa" && !hideExecutiveExport && (
            <button
              className="btn ghost export-download-btn"
              onClick={onExportExecutivePdf}
              aria-label="Descargar mapa ejecutivo"
              title="Descargar mapa ejecutivo"
              disabled={exportExecutiveLoading}
            >
              {exportExecutiveLoading ? <IconSpinner /> : <IconDownload />}
              <span className="label-desktop">Descargar mapa</span>
              <span className="label-tablet">Descargar</span>
            </button>
          )}
          {view === "tabla" && (
            <button
              className="btn ghost export-download-btn"
              onClick={onExportTable}
              aria-label="Exportar tabla a Excel"
              title="Exportar tabla a Excel"
            >
              <IconExcel />
              <span className="label-desktop">Exportar</span>
              <span className="label-tablet">Excel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapHeader;
