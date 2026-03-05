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
    <rect x="3" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 9h6M7 13h6M7 17h4M17 7l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

type MapHeaderProps = {
  view: "mapa" | "tabla";
  setView: (next: "mapa" | "tabla") => void;
  filteredCount: number;
  totalCount: number;
  onExportExecutivePdf: () => void;
  onExportTable: () => void;
};

function MapHeader({
  view,
  setView,
  filteredCount,
  totalCount,
  onExportExecutivePdf,
  onExportTable,
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
            <strong>{filteredCount} de {totalCount}</strong> lotes
          </div>
        </div>
        <div className="map-header__right">
          {view === "mapa" && (
            <button
              className="btn ghost export-download-btn"
              onClick={onExportExecutivePdf}
              aria-label="Descargar mapa ejecutivo"
              title="Descargar mapa ejecutivo"
            >
              <IconDownload />
              <span className="label-desktop">Descargar mapa</span>
              <span className="label-tablet">Descargar</span>
            </button>
          )}
          {view === "tabla" && (
            <button className="btn ghost" onClick={onExportTable}>
              <IconExcel /> Exportar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapHeader;
