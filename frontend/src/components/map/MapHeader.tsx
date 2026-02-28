import type { Lote } from "../../domain/types";

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
  return (
    <div className="map-header">
      <div className="map-header__left">
        <div className="view-toggle">
          <button className={view === "mapa" ? "btn active" : "btn ghost"} onClick={() => setView("mapa")}>
            Mapa
          </button>
          <button className={view === "tabla" ? "btn active" : "btn ghost"} onClick={() => setView("tabla")}>
            Tabla
          </button>
        </div>
        <div className="map-header__info kpi-chip">
          <strong>{filteredCount} de {totalCount}</strong> lotes
        </div>
        <div className="legend">
          <span className="legend__item libre">DISPONIBLE</span>
          <span className="legend__item separado">SEPARADO</span>
          <span className="legend__item vendido">VENDIDO</span>
        </div>
      </div>
      <div className="map-header__right">
        <div className="export-actions">
          {selectedLote && selectedLote.condicion !== "VENDIDO" && (
            <button className="btn ghost" onClick={onOpenProforma}>
              Crear proforma
            </button>
          )}
          <button className="btn ghost" onClick={onPrint}>
            Imprimir
          </button>
          {view === "tabla" && (
            <button className="btn ghost" onClick={onExportTable}>
              Exportar Excel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapHeader;
