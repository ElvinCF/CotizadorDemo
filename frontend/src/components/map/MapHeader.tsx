import type { Lote } from "../../domain/types";

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

const IconPrinter = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M7 8V4h10v4M7 15h10v6H7v-6Zm12 0h2v-5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v5h2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconExcel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 9h6M7 13h6M7 17h4M17 7l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

type MapHeaderProps = {
  view: "mapa" | "tabla";
  setView: (next: "mapa" | "tabla") => void;
  filteredCount: number;
  totalCount: number;
  selectedLote: Lote | null;
  onOpenProforma: () => void;
  onPrint: () => void;
  onExportTable: () => void;
};

function MapHeader({
  view,
  setView,
  filteredCount,
  totalCount,
  selectedLote,
  onOpenProforma,
  onPrint,
  onExportTable,
}: MapHeaderProps) {
  const legend =
    view === "mapa" ? (
      <div className="map-header__legend" aria-label="Estado de lotes">
        <span className="status-pill libre">Disponible</span>
        <span className="status-pill separado">Separado</span>
        <span className="status-pill vendido">Vendido</span>
      </div>
    ) : null;

  return (
    <div className="map-header">
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
        {legend}
      </div>
      <div className="map-header__right">
        <div className="export-actions">
          {selectedLote && selectedLote.condicion !== "VENDIDO" && (
            <button className="btn ghost" onClick={onOpenProforma}>
              <IconPlus /> Proforma
            </button>
          )}
          <button className="btn ghost icon-only" onClick={onPrint} aria-label="Imprimir vista">
            <IconPrinter />
          </button>
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
