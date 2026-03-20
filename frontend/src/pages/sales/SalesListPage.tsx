import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../app/AppShell";
import DataTableFilters from "../../components/data-table/DataTableFilters";
import DataTableShell from "../../components/data-table/DataTableShell";
import DataTableToolbar from "../../components/data-table/DataTableToolbar";
import { buildDateBounds, withDefaultDateRange } from "../../components/data-table/dateRange";
import type { SortState } from "../../components/data-table/types";
import SalesTable from "../../components/sales/SalesTable";
import type { SaleRecord } from "../../domain/ventas";
import { listSales } from "../../services/ventas";

type SalesSortKey = "lote" | "cliente" | "asesor" | "estado" | "precio" | "fecha";

type SalesFiltersState = {
  estado: string;
  asesorId: string;
  fechaDesde: string;
  fechaHasta: string;
};

const defaultFilters: SalesFiltersState = {
  estado: "TODAS",
  asesorId: "TODOS",
  fechaDesde: "",
  fechaHasta: "",
};

const normalizeText = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const compareText = (left: string, right: string) => left.localeCompare(right, "es", { sensitivity: "base" });

const compareNumber = (left: number, right: number) => left - right;

const inDateRange = (value: string, from: string, to: string) => {
  if (!from && !to) return true;
  const current = new Date(value);
  if (Number.isNaN(current.getTime())) return false;
  const currentTime = current.getTime();

  if (from) {
    const fromDate = new Date(from);
    if (!Number.isNaN(fromDate.getTime()) && currentTime < fromDate.getTime()) return false;
  }

  if (to) {
    const toDate = new Date(to);
    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      if (currentTime > toDate.getTime()) return false;
    }
  }

  return true;
};

const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconKanban = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="4" y="5" width="5" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <rect x="10.5" y="5" width="3" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <rect x="15" y="5" width="5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default function SalesListPage() {
  const [items, setItems] = useState<SaleRecord[]>([]);
  const [totalLotes, setTotalLotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<SalesFiltersState>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sort, setSort] = useState<SortState<SalesSortKey>>({ key: "fecha", direction: "desc" });

  useEffect(() => {
    const run = async () => {
      try {
        const [salesData, lotesResponse] = await Promise.all([
          listSales(),
          fetch("/api/lotes", { cache: "no-store" }),
        ]);

        setItems(salesData);

        if (lotesResponse.ok) {
          const payload = (await lotesResponse.json()) as { items?: unknown[] };
          setTotalLotes(Array.isArray(payload.items) ? payload.items.length : 0);
        } else {
          setTotalLotes(0);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar ventas.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const advisorOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((sale) => {
      if (sale.asesor?.id) {
        map.set(sale.asesor.id, sale.asesor.nombre || sale.asesor.username);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => compareText(a[1], b[1]))
      .map(([id, name]) => ({ id, name }));
  }, [items]);

  const dateBounds = useMemo(() => {
    return buildDateBounds(items.map((sale) => sale.fechaVenta));
  }, [items]);

  useEffect(() => {
    if (!dateBounds.min || !dateBounds.max) return;

    setFilters((current) => withDefaultDateRange(current, dateBounds));
  }, [dateBounds.max, dateBounds.min]);

  const visibleItems = useMemo(() => {
    const query = normalizeText(search);
    const filtered = items.filter((sale) => {
      const statusOk = filters.estado === "TODAS" || sale.estadoVenta === filters.estado;
      const advisorOk = filters.asesorId === "TODOS" || sale.asesor?.id === filters.asesorId;
      const dateOk = inDateRange(sale.fechaVenta, filters.fechaDesde, filters.fechaHasta);
      if (!statusOk || !advisorOk || !dateOk) return false;

      if (!query) return true;
      const loteLabel = sale.lote ? `${sale.lote.codigo} ${sale.lote.mz} lote ${sale.lote.lote}` : "";
      const haystack = normalizeText(
        [loteLabel, sale.cliente?.nombreCompleto || "", sale.cliente?.dni || "", sale.asesor?.nombre || "", sale.estadoVenta].join(
          " "
        )
      );
      return haystack.includes(query);
    });

    if (!sort.key || !sort.direction) return filtered;

    const sorted = [...filtered].sort((left, right) => {
      switch (sort.key) {
        case "lote":
          return compareText(left.lote?.codigo || "", right.lote?.codigo || "");
        case "cliente":
          return compareText(left.cliente?.nombreCompleto || "", right.cliente?.nombreCompleto || "");
        case "asesor":
          return compareText(left.asesor?.nombre || "", right.asesor?.nombre || "");
        case "estado":
          return compareText(left.estadoVenta, right.estadoVenta);
        case "precio":
          return compareNumber(left.precioVenta, right.precioVenta);
        case "fecha":
          return compareNumber(new Date(left.fechaVenta).getTime(), new Date(right.fechaVenta).getTime());
        default:
          return 0;
      }
    });

    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [filters, items, search, sort]);

  const handleSort = (key: SalesSortKey) => {
    setSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      if (current.direction === "desc") return { key: null, direction: null };
      return { key, direction: "asc" };
    });
  };

  const resetFilters = () =>
    setFilters({
      ...defaultFilters,
      fechaDesde: dateBounds.min,
      fechaHasta: dateBounds.max,
    });

  const actions = (
    <>
      <button type="button" className="btn ghost data-table-toolbar__btn" disabled>
        <IconKanban />
        <span className="data-table-toolbar__btn-label">Kanban</span>
      </button>
    </>
  );

  const topbarActions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to="/">
        <IconMap />
        Mapa
      </Link>
    </nav>
  );

  return (
    <AppShell title="Gestion de Ventas" actions={topbarActions} contentClassName="main--data-table">
      <DataTableShell
        className="sales-page"
        title="Ventas registradas"
        meta={<span className="data-table-shell__count">{`${items.length} de ${totalLotes}`}</span>}
        toolbar={
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            onClearSearch={() => setSearch("")}
            searchPlaceholder="Buscar por cliente, DNI, lote o asesor"
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((current) => !current)}
            onClearFilters={resetFilters}
            actions={actions}
          />
        }
        filters={
          <DataTableFilters open={filtersOpen}>
            <label className="data-table-filters__field">
              <span>Estado</span>
              <select value={filters.estado} onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))}>
                <option value="TODAS">Todas</option>
                <option value="SEPARADA">Separada</option>
                <option value="INICIAL_PAGADA">Inicial pagada</option>
                <option value="CONTRATO_FIRMADO">Contrato firmado</option>
                <option value="PAGANDO">Pagando</option>
                <option value="COMPLETADA">Completada</option>
                <option value="CAIDA">Caida</option>
              </select>
            </label>

            <label className="data-table-filters__field">
              <span>Asesor</span>
              <select
                value={filters.asesorId}
                onChange={(event) => setFilters((current) => ({ ...current, asesorId: event.target.value }))}
              >
                <option value="TODOS">Todos</option>
                {advisorOptions.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="data-table-filters__field data-table-filters__field--date">
              <span>Desde</span>
              <input
                type="date"
                value={filters.fechaDesde}
                min={dateBounds.min || undefined}
                max={filters.fechaHasta || dateBounds.max || undefined}
                onChange={(event) => setFilters((current) => ({ ...current, fechaDesde: event.target.value }))}
              />
            </label>

            <label className="data-table-filters__field data-table-filters__field--date">
              <span>Hasta</span>
              <input
                type="date"
                value={filters.fechaHasta}
                min={filters.fechaDesde || dateBounds.min || undefined}
                max={dateBounds.max || undefined}
                onChange={(event) => setFilters((current) => ({ ...current, fechaHasta: event.target.value }))}
              />
            </label>
          </DataTableFilters>
        }
      >
        {error ? <p className="admin-error">{error}</p> : null}
        <SalesTable items={visibleItems} loading={loading} sort={sort} onSort={handleSort} />
      </DataTableShell>
    </AppShell>
  );
}
