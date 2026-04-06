import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import { useProjectContext } from "../../app/ProjectContext";
import { buildPublicProjectPath } from "../../app/projectRoutes";
import DataTableFilters from "../../components/data-table/DataTableFilters";
import DataTableShell from "../../components/data-table/DataTableShell";
import DataTableToolbar from "../../components/data-table/DataTableToolbar";
import { buildDateBounds, isDateInRange, withDefaultDateRange } from "../../components/data-table/dateRange";
import type { SortState } from "../../components/data-table/types";
import SalesTable from "../../components/sales/SalesTable";
import type { SaleRecord, SaleState } from "../../domain/ventas";
import { listSales } from "../../services/ventas";

type SalesSortKey = "lote" | "cliente" | "asesor" | "estado" | "precio" | "fecha";

type SalesFiltersState = {
  estado: string;
  clienteKey: string;
  asesorId: string;
  fechaDesde: string;
  fechaHasta: string;
};

const defaultFilters: SalesFiltersState = {
  estado: "TODAS",
  clienteKey: "TODOS",
  asesorId: "TODOS",
  fechaDesde: "",
  fechaHasta: "",
};

const normalizeText = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const compareText = (left: string, right: string) => left.localeCompare(right, "es", { sensitivity: "base" });

const compareNumber = (left: number, right: number) => left - right;

const capitalizeName = (value: string) =>
  value
    .toLocaleLowerCase("es-PE")
    .replace(/\b([\p{L}\p{M}])/gu, (match) => match.toLocaleUpperCase("es-PE"));

const getClientKey = (sale: SaleRecord) => {
  const client = sale.cliente;
  if (!client) return null;
  if (client.id) return `id:${client.id}`;
  if (client.dni) return `dni:${client.dni}`;
  if (client.nombreCompleto) return `name:${normalizeText(client.nombreCompleto)}`;
  return null;
};

const buildLotesByManzanaLabel = (sale: SaleRecord) => {
  const lotes = (sale.lotes && sale.lotes.length > 0 ? sale.lotes : sale.lote ? [sale.lote] : [])
    .filter(Boolean)
    .map((lot) => ({ mz: String(lot.mz || "").trim().toUpperCase(), lote: Number(lot.lote) }))
    .filter((lot) => lot.mz && Number.isFinite(lot.lote));

  if (lotes.length === 0) return "";

  const grouped = lotes.reduce<Map<string, number[]>>((acc, lot) => {
    const current = acc.get(lot.mz) ?? [];
    current.push(lot.lote);
    acc.set(lot.mz, current);
    return acc;
  }, new Map());

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "es", { sensitivity: "base" }))
    .map(([mz, nums]) => `${mz}: ${Array.from(new Set(nums)).sort((a, b) => a - b).map((n) => String(n).padStart(2, "0")).join(",")}`)
    .join(" · ");
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

export default function SalesListPage() {
  const { role, loginUsername } = useAuth();
  const { display } = useProjectContext();
  const [items, setItems] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<SalesFiltersState>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<SortState<SalesSortKey>>({ key: "fecha", direction: "desc" });

  useEffect(() => {
    const run = async () => {
      try {
        setItems([]);
        setError(null);
        setLoading(true);
        const salesData = await listSales({ slug: display.projectSlug });
        setItems(salesData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar ventas.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [display.projectSlug]);

  const advisorSourceItems = useMemo(
    () =>
      items.filter((sale) => {
        const statusOk = filters.estado === "TODAS" || sale.estadoVenta === filters.estado;
        const clientOk = filters.clienteKey === "TODOS" || getClientKey(sale) === filters.clienteKey;
        const dateOk = isDateInRange(sale.fechaVenta, filters.fechaDesde, filters.fechaHasta);
        return statusOk && clientOk && dateOk;
      }),
    [filters.clienteKey, filters.estado, filters.fechaDesde, filters.fechaHasta, items]
  );

  const advisorOptions = useMemo(() => {
    const map = new Map<string, string>();
    advisorSourceItems.forEach((sale) => {
      if (sale.asesor?.id) {
        map.set(sale.asesor.id, sale.asesor.nombre || sale.asesor.username);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => compareText(a[1], b[1]))
      .map(([id, name]) => ({ id, name }));
  }, [advisorSourceItems]);

  const statusSourceItems = useMemo(
    () =>
      items.filter((sale) => {
        const clientOk = filters.clienteKey === "TODOS" || getClientKey(sale) === filters.clienteKey;
        const advisorOk = filters.asesorId === "TODOS" || sale.asesor?.id === filters.asesorId;
        const dateOk = isDateInRange(sale.fechaVenta, filters.fechaDesde, filters.fechaHasta);
        return clientOk && advisorOk && dateOk;
      }),
    [filters.asesorId, filters.clienteKey, filters.fechaDesde, filters.fechaHasta, items]
  );

  const statusOptions = useMemo<SaleState[]>(() => {
    const statuses = Array.from(new Set(statusSourceItems.map((sale) => sale.estadoVenta))) as SaleState[];
    const order: SaleState[] = [
      "SEPARADA",
      "INICIAL_PAGADA",
      "CONTRATO_FIRMADO",
      "PAGANDO",
      "COMPLETADA",
      "CAIDA",
    ];
    return statuses.sort((left, right) => order.indexOf(left) - order.indexOf(right));
  }, [statusSourceItems]);

  const clientSourceItems = useMemo(
    () =>
      items.filter((sale) => {
        const statusOk = filters.estado === "TODAS" || sale.estadoVenta === filters.estado;
        const advisorOk = filters.asesorId === "TODOS" || sale.asesor?.id === filters.asesorId;
        const dateOk = isDateInRange(sale.fechaVenta, filters.fechaDesde, filters.fechaHasta);
        return statusOk && advisorOk && dateOk;
      }),
    [filters.asesorId, filters.estado, filters.fechaDesde, filters.fechaHasta, items]
  );

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    clientSourceItems.forEach((sale) => {
      const clientKey = getClientKey(sale);
      const clientName = sale.cliente?.nombreCompleto?.trim();
      if (!clientKey || !clientName) return;
      const dni = sale.cliente?.dni?.trim();
      const label = dni ? `DNI ${dni} | ${capitalizeName(clientName)}` : capitalizeName(clientName);
      map.set(clientKey, label);
    });
    return Array.from(map.entries())
      .sort((a, b) => compareText(a[1], b[1]))
      .map(([id, name]) => ({ id, name }));
  }, [clientSourceItems]);

  const dateBounds = useMemo(() => {
    return buildDateBounds(items.map((sale) => sale.fechaVenta));
  }, [items]);

  useEffect(() => {
    if (!dateBounds.min || !dateBounds.max) return;

    setFilters((current) =>
      withDefaultDateRange(current, {
        min: dateBounds.min,
        max: dateBounds.max,
      })
    );
  }, [dateBounds.max, dateBounds.min]);

  useEffect(() => {
    if (filters.asesorId === "TODOS") return;
    if (advisorOptions.some((advisor) => advisor.id === filters.asesorId)) return;
    setFilters((current) => ({ ...current, asesorId: "TODOS" }));
  }, [advisorOptions, filters.asesorId]);

  useEffect(() => {
    if (filters.clienteKey === "TODOS") return;
    if (clientOptions.some((client) => client.id === filters.clienteKey)) return;
    setFilters((current) => ({ ...current, clienteKey: "TODOS" }));
  }, [clientOptions, filters.clienteKey]);

  useEffect(() => {
    if (filters.estado === "TODAS") return;
    if (statusOptions.includes(filters.estado as SaleState)) return;
    setFilters((current) => ({ ...current, estado: "TODAS" }));
  }, [filters.estado, statusOptions]);

  const visibleItems = useMemo(() => {
    const query = normalizeText(search);
    const filtered = items.filter((sale) => {
      const statusOk = filters.estado === "TODAS" || sale.estadoVenta === filters.estado;
      const clientOk = filters.clienteKey === "TODOS" || getClientKey(sale) === filters.clienteKey;
      const advisorOk = filters.asesorId === "TODOS" || sale.asesor?.id === filters.asesorId;
      const dateOk = isDateInRange(sale.fechaVenta, filters.fechaDesde, filters.fechaHasta);
      if (!statusOk || !clientOk || !advisorOk || !dateOk) return false;

      if (!query) return true;
      const loteLabel = buildLotesByManzanaLabel(sale);
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
          return compareText(buildLotesByManzanaLabel(left), buildLotesByManzanaLabel(right));
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

  const topbarActions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to={buildPublicProjectPath(display.projectSlug)}>
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
        meta={
          <div className="sales-page__meta-badges">
            <span className="data-table-shell__count">Ventas: {items.length}</span>
          </div>
        }
        toolbar={
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            onClearSearch={() => setSearch("")}
            searchPlaceholder="Buscar por cliente, DNI, lote o asesor"
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((current) => !current)}
            onClearFilters={resetFilters}
          />
        }
        filters={
          filtersOpen ? <DataTableFilters open className="data-table-filters--sales">
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

            <label className="data-table-filters__field">
              <span>Cliente</span>
              <select
                value={filters.clienteKey}
                onChange={(event) => setFilters((current) => ({ ...current, clienteKey: event.target.value }))}
              >
                <option value="TODOS">Todos</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="data-table-filters__field">
              <span>Estado</span>
              <select value={filters.estado} onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))}>
                <option value="TODAS">Todas</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
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
          </DataTableFilters> : null
        }
      >
        {error ? <p className="admin-error">{error}</p> : null}
        <SalesTable
          items={visibleItems}
          loading={loading}
          role={role}
          loginUsername={loginUsername}
          sort={sort}
          onSort={handleSort}
        />
      </DataTableShell>
    </AppShell>
  );
}


