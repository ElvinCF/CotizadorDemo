import { useMemo, useState } from "react";
import { formatArea, formatMoney, normalizeStatusLabel, statusToClass } from "../../domain/formatters";
import type { FiltersState, Lote } from "../../domain/types";

const IconFilterOn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M4 6h16M7 11h10M10 16h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M15 19.5 13 17v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconFilterOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M4 6h16M7 11h10M10 16h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 20 16 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

type TableViewProps = {
  tableFiltersOpen: boolean;
  onToggleFilters: () => void;
  allLotes: Lote[];
  filters: FiltersState;
  setFilters: (next: FiltersState) => void;
  onResetFilters: () => void;
  filteredLotes: Lote[];
  selectedId: string | null;
  onSelectLote: (id: string) => void;
  canOpenSales: boolean;
  salesByLoteCode: Record<string, string>;
  onOpenSale: (lote: Lote, activeSaleId: string | null) => void;
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
  canOpenSales,
  salesByLoteCode,
  onOpenSale,
}: TableViewProps) {
  const [tableQuery, setTableQuery] = useState("");

  const visibleLotes = useMemo(() => {
    const term = tableQuery.trim().toLowerCase();
    if (!term) {
      return filteredLotes;
    }

    return filteredLotes.filter((lote) => {
      const searchable = [
        lote.id,
        lote.mz,
        lote.lote,
        lote.condicion,
        normalizeStatusLabel(lote.condicion),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [filteredLotes, tableQuery]);

  return (
    <div className="table-view">
      <div className="table-filters__toolbar">
        <label className="table-filters__search" aria-label="Buscar lote">
          <span className="table-filters__search-icon">
            <IconSearch />
          </span>
          <input
            type="search"
            value={tableQuery}
            onChange={(event) => setTableQuery(event.target.value)}
            placeholder="Buscar lote o estado"
          />
        </label>
        <button className="btn ghost table-filters__toggle" onClick={onToggleFilters} type="button">
          {tableFiltersOpen ? <IconFilterOff /> : <IconFilterOn />}
          <span>{tableFiltersOpen ? "Ocultar" : "Filtro"}</span>
        </button>
      </div>
      <div className={`table-filters ${tableFiltersOpen ? "open" : "closed"}`}>
        <label className="table-filters__field table-filters__field--status">
          Estado
          <select
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
          >
            <option value="TODOS">Todos</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="SEPARADO">Separado</option>
            <option value="VENDIDO">Vendido</option>
          </select>
        </label>
        <label className="table-filters__field table-filters__field--price-min">
          Precio min
          <input
            type="number"
            value={filters.priceMin}
            onChange={(event) => setFilters({ ...filters, priceMin: event.target.value })}
            placeholder="Desde S/"
          />
        </label>
        <label className="table-filters__field table-filters__field--price-max">
          Precio max
          <input
            type="number"
            value={filters.priceMax}
            onChange={(event) => setFilters({ ...filters, priceMax: event.target.value })}
            placeholder="Hasta S/"
          />
        </label>
        <label className="table-filters__field table-filters__field--area-min">
          Area min
          <input
            type="number"
            value={filters.areaMin}
            onChange={(event) => setFilters({ ...filters, areaMin: event.target.value })}
            placeholder="Min m2"
          />
        </label>
        <label className="table-filters__field table-filters__field--area-max">
          Area max
          <input
            type="number"
            value={filters.areaMax}
            onChange={(event) => setFilters({ ...filters, areaMax: event.target.value })}
            placeholder="Max m2"
          />
        </label>
        <div className="table-filters__actions">
          <button className="btn ghost" onClick={onResetFilters} type="button">
            Limpiar
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <div className="table-grid">
          <div className={`table-header ${!canOpenSales ? "table-header--public" : ""}`}>
            <span>MZ</span>
            <span>LT</span>
            <span>AREA (M2)</span>
            <span>PRECIO</span>
            <span>CONDICION</span>
            {canOpenSales ? <span>ACCION</span> : null}
          </div>
          {visibleLotes.map((lote) => (
            <div
              className={`table-row ${selectedId === lote.id ? "selected" : ""} ${!canOpenSales ? "table-row--public" : ""}`}
              key={lote.id}
              onClick={() => onSelectLote(lote.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectLote(lote.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="table-cell strong">{lote.mz}</span>
              <span className="table-cell strong">{lote.lote}</span>
              <span className="table-cell">{formatArea(lote.areaM2)}</span>
              <span className="table-cell">{formatMoney(lote.price)}</span>
              <span className={`table-cell status-pill ${statusToClass(lote.condicion)}`}>
                {normalizeStatusLabel(lote.condicion)}
              </span>
              {canOpenSales ? (
                <span className="table-cell table-cell--action">
                  {(() => {
                    const activeSaleId = salesByLoteCode[lote.id] ?? null;
                    return (
                      <button
                        type="button"
                        className={`btn ghost table-row__action ${activeSaleId ? "is-active" : "is-create"}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenSale(lote, activeSaleId);
                        }}
                      >
                        {activeSaleId ? "Ver venta" : "Crear venta"}
                      </button>
                    );
                  })()}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TableView;
