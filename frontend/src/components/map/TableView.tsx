import { formatArea, formatMoney, normalizeStatusLabel, statusToClass } from "../../domain/formatters";
import type { FiltersState, Lote } from "../../domain/types";

type TableViewProps = {
  tableFiltersOpen: boolean;
  onToggleFilters: () => void;
  filters: FiltersState;
  setFilters: (next: FiltersState) => void;
  onResetFilters: () => void;
  filteredLotes: Lote[];
  selectedId: string | null;
  onSelectLote: (id: string) => void;
};

function TableView({
  tableFiltersOpen,
  onToggleFilters,
  filters,
  setFilters,
  onResetFilters,
  filteredLotes,
  selectedId,
  onSelectLote,
}: TableViewProps) {
  return (
    <div className="table-view">
      <div className="table-filters__header">
        <h4>Filtros</h4>
        <button className="btn ghost" onClick={onToggleFilters}>
          {tableFiltersOpen ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <div className={`table-filters ${tableFiltersOpen ? "open" : "closed"}`}>
        <label>
          MZ
          <input
            value={filters.mz}
            onChange={(event) => setFilters({ ...filters, mz: event.target.value })}
            placeholder="A o B"
          />
        </label>
        <label>
          Estado
          <select
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
          >
            <option value="TODOS">Todos</option>
            <option value="LIBRE">Libre</option>
            <option value="SEPARADO">Separado</option>
            <option value="VENDIDO">Vendido</option>
          </select>
        </label>
        <label>
          Precio min
          <input
            type="number"
            value={filters.priceMin}
            onChange={(event) => setFilters({ ...filters, priceMin: event.target.value })}
            placeholder="Desde S/ ..."
          />
        </label>
        <label>
          Precio max
          <input
            type="number"
            value={filters.priceMax}
            onChange={(event) => setFilters({ ...filters, priceMax: event.target.value })}
            placeholder="Hasta S/ ..."
          />
        </label>
        <label>
          Area min
          <input
            type="number"
            value={filters.areaMin}
            onChange={(event) => setFilters({ ...filters, areaMin: event.target.value })}
            placeholder="Min m2"
          />
        </label>
        <label>
          Area max
          <input
            type="number"
            value={filters.areaMax}
            onChange={(event) => setFilters({ ...filters, areaMax: event.target.value })}
            placeholder="Max m2"
          />
        </label>
        <button className="btn ghost" onClick={onResetFilters}>
          Limpiar
        </button>
      </div>
      <div className="table-scroll">
        <div className="table-header">
          <span>MZ</span>
          <span>LT</span>
          <span>AREA (M2)</span>
          <span>ASESOR</span>
          <span>PRECIO</span>
          <span>CONDICION</span>
          <span>VER</span>
        </div>
        {filteredLotes.map((lote) => (
          <button
            className={`table-row ${selectedId === lote.id ? "selected" : ""}`}
            key={lote.id}
            onClick={() => onSelectLote(lote.id)}
          >
            <span className="table-cell strong">{lote.mz}</span>
            <span className="table-cell strong">{lote.lote}</span>
            <span className="table-cell">{formatArea(lote.areaM2)}</span>
            <span className="table-cell">{lote.asesor ?? "-"}</span>
            <span className="table-cell">{formatMoney(lote.price)}</span>
            <span className={`table-cell status-pill ${statusToClass(lote.condicion)}`}>
              {normalizeStatusLabel(lote.condicion)}
            </span>
            <span className="table-cell table-action" aria-hidden="true">
              🔎
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TableView;
