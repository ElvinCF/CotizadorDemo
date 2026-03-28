import { useMemo, useState } from "react";
import DataTableSortHeader from "../data-table/DataTableSortHeader";
import type { SortState } from "../data-table/types";
import { formatArea, formatMoney, normalizeStatusLabel, statusToClass } from "../../domain/formatters";
import type { FiltersState, Lote } from "../../domain/types";

type LoteSaleAccess = {
  saleId: string;
  ownerUsername: string | null;
};

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
  salesByLoteCode: Record<string, LoteSaleAccess>;
  canAccessSaleFromLot: (saleAccess?: LoteSaleAccess | null) => boolean;
  onOpenSale: (lote: Lote, activeSaleId: string | null) => void;
};

type TableSortKey = "mz" | "lote" | "areaM2" | "price" | "condicion";

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
  canAccessSaleFromLot,
  onOpenSale,
}: TableViewProps) {
  const [tableQuery, setTableQuery] = useState("");
  const [sort, setSort] = useState<SortState<TableSortKey>>({ key: "mz", direction: "asc" });

  const handleSort = (key: TableSortKey) => {
    setSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      if (current.direction === "desc") return { key: null, direction: null };
      return { key, direction: "asc" };
    });
  };

  const sortDirectionFor = (key: TableSortKey) => (sort.key === key ? sort.direction : null);

  const visibleLotes = useMemo(() => {
    const term = tableQuery.trim().toLowerCase();
    const queried = !term
      ? filteredLotes
      : filteredLotes.filter((lote) => {
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

    if (!sort.key || !sort.direction) {
      return queried;
    }

    const ordered = [...queried].sort((a, b) => {
      switch (sort.key) {
        case "mz":
          return a.mz.localeCompare(b.mz, undefined, { numeric: true, sensitivity: "base" });
        case "lote":
          return a.lote - b.lote;
        case "areaM2":
          return (a.areaM2 ?? -Infinity) - (b.areaM2 ?? -Infinity);
        case "price":
          return (a.price ?? -Infinity) - (b.price ?? -Infinity);
        case "condicion":
          return normalizeStatusLabel(a.condicion).localeCompare(normalizeStatusLabel(b.condicion), undefined, {
            sensitivity: "base",
          });
        default:
          return 0;
      }
    });

    return sort.direction === "desc" ? ordered.reverse() : ordered;
  }, [filteredLotes, sort.direction, sort.key, tableQuery]);

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
            <DataTableSortHeader label="MZ" direction={sortDirectionFor("mz")} onToggle={() => handleSort("mz")} />
            <DataTableSortHeader label="LT" direction={sortDirectionFor("lote")} onToggle={() => handleSort("lote")} />
            <DataTableSortHeader
              label="AREA (M2)"
              direction={sortDirectionFor("areaM2")}
              onToggle={() => handleSort("areaM2")}
            />
            <DataTableSortHeader
              label="PRECIO"
              direction={sortDirectionFor("price")}
              onToggle={() => handleSort("price")}
            />
            <DataTableSortHeader
              label="CONDICION"
              direction={sortDirectionFor("condicion")}
              onToggle={() => handleSort("condicion")}
            />
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
                    const activeSale = salesByLoteCode[lote.id] ?? null;
                    const activeSaleId = activeSale?.saleId ?? null;
                    const canUseSaleAction = canAccessSaleFromLot(activeSale);
                    return (
                      <button
                        type="button"
                        className={`btn ghost table-row__action ${activeSaleId ? "is-active" : "is-create"}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!canUseSaleAction) return;
                          onOpenSale(lote, activeSaleId);
                        }}
                        disabled={!canUseSaleAction}
                        title={!canUseSaleAction ? "No puedes abrir ni crear ventas sobre un lote con venta activa de otro asesor" : undefined}
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
