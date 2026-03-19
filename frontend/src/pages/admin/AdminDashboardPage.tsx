import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import AdminDashboardBarChart from "../../components/admin-dashboard/AdminDashboardBarChart";
import AdminDashboardDonutChart from "../../components/admin-dashboard/AdminDashboardDonutChart";
import AdminDashboardLineChart from "../../components/admin-dashboard/AdminDashboardLineChart";
import AdminDashboardRanking from "../../components/admin-dashboard/AdminDashboardRanking";
import AdminDashboardStatCard from "../../components/admin-dashboard/AdminDashboardStatCard";
import type {
  DashboardAdminFilters,
  DashboardAdminKpis,
  DashboardAdvisorSummaryItem,
  DashboardGroupBy,
  DashboardInventoryItem,
  DashboardRankingMetric,
  DashboardSalesSeriesItem,
  DashboardLotState,
} from "../../domain/dashboard";
import type { AdminUser } from "../../domain/adminUsers";
import type { SaleState } from "../../domain/ventas";
import { formatMoney } from "../../domain/formatters";
import { listAdminUsers } from "../../services/adminUsers";
import {
  getAdminDashboardAdvisorRanking,
  getAdminDashboardAdvisorSummary,
  getAdminDashboardInventory,
  getAdminDashboardKpis,
  getAdminDashboardSalesSeries,
} from "../../services/dashboard";

type DashboardFiltersState = {
  from: string;
  to: string;
  estadoLote: "" | DashboardLotState;
  estadoVenta: "" | SaleState;
  asesorId: string;
  groupBy: DashboardGroupBy;
  metric: DashboardRankingMetric;
  topN: string;
};

const SALE_STATE_OPTIONS: Array<{ value: "" | SaleState; label: string }> = [
  { value: "", label: "Todas" },
  { value: "SEPARADA", label: "Separada" },
  { value: "INICIAL_PAGADA", label: "Inicial pagada" },
  { value: "CONTRATO_FIRMADO", label: "Contrato firmado" },
  { value: "PAGANDO", label: "Pagando" },
  { value: "COMPLETADA", label: "Completada" },
  { value: "CAIDA", label: "Caida" },
];

const LOT_STATE_OPTIONS: Array<{ value: "" | DashboardLotState; label: string }> = [
  { value: "", label: "Todos" },
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "SEPARADO", label: "Separado" },
  { value: "VENDIDO", label: "Vendido" },
];

const GROUP_BY_OPTIONS: Array<{ value: DashboardGroupBy; label: string }> = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

const RANKING_METRIC_OPTIONS: Array<{ value: DashboardRankingMetric; label: string }> = [
  { value: "monto_vendido", label: "Monto vendido" },
  { value: "monto_cobrado", label: "Monto cobrado" },
  { value: "ticket_promedio_venta", label: "Ticket promedio" },
  { value: "saldo_pendiente", label: "Saldo pendiente" },
  { value: "cantidad_ventas", label: "Cantidad de ventas" },
  { value: "cartera_activa", label: "Cartera activa" },
  { value: "mayor_venta", label: "Mayor venta" },
];

const emptyKpis: DashboardAdminKpis = {
  inventarioTotal: 0,
  lotesDisponibles: 0,
  lotesSeparados: 0,
  lotesVendidos: 0,
  ventasActivas: 0,
  montoVendido: 0,
  montoCobrado: 0,
  saldoPendienteGlobal: 0,
  ticketPromedioVenta: 0,
  asesorTopId: null,
  asesorTopUsername: null,
  asesorTopNombre: null,
  asesorTopMontoVendido: 0,
};

const defaultFilters: DashboardFiltersState = {
  from: "",
  to: "",
  estadoLote: "",
  estadoVenta: "",
  asesorId: "",
  groupBy: "month",
  metric: "monto_vendido",
  topN: "5",
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

const IconTable = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3 10h18M9 5v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M15.5 11a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 19a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M14 18a4 4 0 0 1 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconLots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M6 5h12l3 5-9 9-9-9 3-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M9 5 7 10m8-5 2 5M3 10h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconSold = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="m4 12 4 4 12-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconMoney = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 9h.01M17 15h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconRate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 19V9m7 10V5m7 14v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="m4 9 4-4 4 3 5-5 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M4 7h16M7 12h10M10 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconExport = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 18v2h14v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const compactMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatBucketLabel = (bucket: string) => {
  const parsed = new Date(bucket);
  if (Number.isNaN(parsed.getTime())) {
    return bucket;
  }
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  })
    .format(parsed)
    .replace(".", "");
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0]?.charAt(0) ?? "";
  const last = (parts.length > 1 ? parts[parts.length - 1] : parts[0])?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase();
};

const metricToValue = (item: DashboardAdvisorSummaryItem, metric: DashboardRankingMetric) => {
  switch (metric) {
    case "monto_cobrado":
      return item.montoCobrado;
    case "ticket_promedio_venta":
      return item.ticketPromedioVenta;
    case "saldo_pendiente":
      return item.saldoPendiente;
    case "cantidad_ventas":
      return item.cantidadVentas;
    case "cartera_activa":
      return item.carteraActiva;
    case "mayor_venta":
      return item.mayorVenta;
    case "monto_vendido":
    default:
      return item.montoVendido;
  }
};

const metricToLabel = (metric: DashboardRankingMetric) =>
  RANKING_METRIC_OPTIONS.find((option) => option.value === metric)?.label ?? "Monto vendido";

const inventoryLabel = (state: DashboardInventoryItem["estadoComercial"]) => {
  switch (state) {
    case "SEPARADO":
      return "Separados";
    case "VENDIDO":
      return "Vendidos";
    case "DISPONIBLE":
    default:
      return "Disponibles";
  }
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUsername, loginPin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filters, setFilters] = useState<DashboardFiltersState>(defaultFilters);
  const [kpis, setKpis] = useState<DashboardAdminKpis>(emptyKpis);
  const [salesSeries, setSalesSeries] = useState<DashboardSalesSeriesItem[]>([]);
  const [inventory, setInventory] = useState<DashboardInventoryItem[]>([]);
  const [advisorSummary, setAdvisorSummary] = useState<DashboardAdvisorSummaryItem[]>([]);
  const [advisorRanking, setAdvisorRanking] = useState<DashboardAdvisorSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location.hash === "#usuarios") {
      navigate("/usuarios", { replace: true });
    }
  }, [location.hash, navigate]);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        const credentials = { username: loginUsername, pin: loginPin };
        const result = await listAdminUsers(credentials);
        if (!cancelled) {
          setUsers(result.users);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [loginPin, loginUsername]);

  const requestFilters = useMemo<DashboardAdminFilters>(
    () => ({
      from: filters.from || null,
      to: filters.to || null,
      estadoLote: filters.estadoLote || null,
      estadoVenta: filters.estadoVenta || null,
      asesorId: filters.asesorId || null,
    }),
    [filters.asesorId, filters.estadoLote, filters.estadoVenta, filters.from, filters.to]
  );

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      const [kpisResult, salesSeriesResult, inventoryResult, summaryResult, rankingResult] =
        await Promise.allSettled([
          getAdminDashboardKpis(requestFilters),
          getAdminDashboardSalesSeries({ ...requestFilters, groupBy: filters.groupBy }),
          getAdminDashboardInventory(requestFilters),
          getAdminDashboardAdvisorSummary(requestFilters),
          getAdminDashboardAdvisorRanking({
            ...requestFilters,
            metric: filters.metric,
            topN: Number.parseInt(filters.topN, 10) || 5,
          }),
        ]);

      if (cancelled) {
        return;
      }

      if (kpisResult.status === "fulfilled") {
        setKpis(kpisResult.value);
      } else {
        setKpis(emptyKpis);
        setError(kpisResult.reason instanceof Error ? kpisResult.reason.message : "No se pudo cargar KPIs.");
      }

      if (salesSeriesResult.status === "fulfilled") {
        setSalesSeries(salesSeriesResult.value);
      } else {
        setSalesSeries([]);
      }

      if (inventoryResult.status === "fulfilled") {
        setInventory(inventoryResult.value);
      } else {
        setInventory([]);
      }

      if (summaryResult.status === "fulfilled") {
        setAdvisorSummary(summaryResult.value);
      } else {
        setAdvisorSummary([]);
      }

      if (rankingResult.status === "fulfilled") {
        setAdvisorRanking(rankingResult.value);
      } else {
        setAdvisorRanking([]);
      }

      setLoading(false);
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [filters.groupBy, filters.metric, filters.topN, requestFilters]);

  const advisors = useMemo(
    () => users.filter((user) => user.rol === "ASESOR" && user.estado === "ACTIVO"),
    [users]
  );

  const topAdvisorName = useMemo(() => {
    if (!kpis.asesorTopNombre && !kpis.asesorTopUsername) {
      return "Sin asesor destacado";
    }
    return kpis.asesorTopNombre || kpis.asesorTopUsername || "Sin asesor destacado";
  }, [kpis.asesorTopNombre, kpis.asesorTopUsername]);

  const lineSeries = useMemo(
    () =>
      salesSeries.map((item) => ({
        label: formatBucketLabel(item.bucket),
        value: item.montoVendido,
      })),
    [salesSeries]
  );

  const donutSegments = useMemo(
    () =>
      inventory.map((item) => ({
        label: inventoryLabel(item.estadoComercial),
        value: item.cantidad,
        color:
          item.estadoComercial === "DISPONIBLE"
            ? "var(--admin-donut-disponible)"
            : item.estadoComercial === "SEPARADO"
              ? "var(--admin-donut-separado)"
              : "var(--admin-donut-vendido)",
      })),
    [inventory]
  );

  const summaryBars = useMemo(() => {
    const topItems = [...advisorSummary]
      .sort((a, b) => b.montoVendido - a.montoVendido)
      .slice(0, 5);
    const maxValue = Math.max(...topItems.map((item) => item.montoVendido), 1);

    return topItems.map((item) => ({
      label: item.asesorNombre || item.asesorUsername || "Asesor",
      helper: `${item.cantidadVentas} ventas · cartera ${item.carteraActiva}`,
      valueLabel: compactMoney(item.montoVendido),
      ratio: item.montoVendido / maxValue,
    }));
  }, [advisorSummary]);

  const rankingItems = useMemo(
    () =>
      advisorRanking.map((item) => {
        const name = item.asesorNombre || item.asesorUsername || "Asesor";
        const value = metricToValue(item, filters.metric);
        return {
          name,
          detail: `${item.cantidadVentas} ventas · cobrado ${compactMoney(item.montoCobrado)}`,
          valueLabel: filters.metric === "cantidad_ventas" || filters.metric === "cartera_activa" ? String(value) : compactMoney(value),
          helper: metricToLabel(filters.metric),
          initials: getInitials(name),
        };
      }),
    [advisorRanking, filters.metric]
  );

  const actions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to="/">
        <IconMap />
        Mapa
      </Link>
      <Link className="btn ghost topbar-action" to="/lotes">
        <IconTable />
        Lotes
      </Link>
      <Link className="btn ghost topbar-action" to="/usuarios">
        <IconUsers />
        Usuarios
      </Link>
    </nav>
  );

  const exportSummary = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      filters,
      kpis,
      salesSeries,
      inventory,
      advisorSummary,
      advisorRanking,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dashboard-admin-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="Dashboard Administrativo" actions={actions} contentClassName="main--admin-dashboard">
      <section className="admin-dashboard">
        <div className="admin-dashboard__hero">
          <div>
            <span className="admin-dashboard__eyebrow">Resumen operativo</span>
            <h2>Desempeno comercial del proyecto</h2>
            <p>
              Dashboard conectado a las funciones analytics del backend. Los filtros usan el contrato real
              de `devsimple` y reflejan ventas, inventario y asesores sin simulaciones locales.
            </p>
          </div>

          <div className="admin-dashboard__filters">
            <label className="admin-dashboard__filter">
              <span>
                <IconCalendar />
                Desde
              </span>
              <input
                type="date"
                value={filters.from}
                onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
              />
            </label>
            <label className="admin-dashboard__filter">
              <span>
                <IconCalendar />
                Hasta
              </span>
              <input
                type="date"
                value={filters.to}
                onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
              />
            </label>
            <label className="admin-dashboard__filter">
              <span>
                <IconFilter />
                Estado lote
              </span>
              <select
                value={filters.estadoLote}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    estadoLote: event.target.value as DashboardFiltersState["estadoLote"],
                  }))
                }
              >
                {LOT_STATE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-dashboard__filter">
              <span>
                <IconFilter />
                Estado venta
              </span>
              <select
                value={filters.estadoVenta}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    estadoVenta: event.target.value as DashboardFiltersState["estadoVenta"],
                  }))
                }
              >
                {SALE_STATE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-dashboard__filter">
              <span>
                <IconUsers />
                Asesor
              </span>
              <select
                value={filters.asesorId}
                onChange={(event) => setFilters((current) => ({ ...current, asesorId: event.target.value }))}
              >
                <option value="">Todos</option>
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {`${advisor.nombres} ${advisor.apellidos}`.trim() || advisor.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-dashboard__filter">
              <span>
                <IconFilter />
                Agrupar
              </span>
              <select
                value={filters.groupBy}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    groupBy: event.target.value as DashboardGroupBy,
                  }))
                }
              >
                {GROUP_BY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-dashboard__filter">
              <span>
                <IconRate />
                Ranking
              </span>
              <select
                value={filters.metric}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    metric: event.target.value as DashboardRankingMetric,
                  }))
                }
              >
                {RANKING_METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-dashboard__filter">
              <span>
                <IconLots />
                Top N
              </span>
              <input
                type="number"
                min={1}
                max={50}
                value={filters.topN}
                onChange={(event) => setFilters((current) => ({ ...current, topN: event.target.value }))}
              />
            </label>
            <button type="button" className="btn" onClick={exportSummary}>
              <IconExport />
              Exportar resumen
            </button>
          </div>
        </div>

        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-dashboard__stats">
          <AdminDashboardStatCard
            label="Inventario total"
            value={loading ? "..." : `${kpis.inventarioTotal}`}
            helper={`${kpis.lotesDisponibles} disponibles`}
            trend={`${kpis.lotesSeparados} separados · ${kpis.lotesVendidos} vendidos`}
            tone="info"
            icon={<IconLots />}
          />
          <AdminDashboardStatCard
            label="Ventas activas"
            value={loading ? "..." : `${kpis.ventasActivas}`}
            helper={topAdvisorName}
            trend={`Top ${compactMoney(kpis.asesorTopMontoVendido)}`}
            tone="success"
            icon={<IconSold />}
          />
          <AdminDashboardStatCard
            label="Monto vendido"
            value={loading ? "..." : compactMoney(kpis.montoVendido)}
            helper={`Cobrado ${compactMoney(kpis.montoCobrado)}`}
            trend={`Ticket ${compactMoney(kpis.ticketPromedioVenta)}`}
            tone="warning"
            icon={<IconMoney />}
          />
          <AdminDashboardStatCard
            label="Saldo pendiente"
            value={loading ? "..." : compactMoney(kpis.saldoPendienteGlobal)}
            helper={`${advisors.length} asesores activos`}
            trend={`Filtro ${filters.estadoVenta || filters.estadoLote || "general"}`}
            tone="neutral"
            icon={<IconRate />}
          />
        </div>

        <div className="admin-dashboard__charts">
          <AdminDashboardLineChart
            title="Serie de ventas"
            subtitle="Monto vendido agrupado segun el periodo seleccionado."
            legend={filters.groupBy}
            data={lineSeries}
          />
          <AdminDashboardDonutChart
            title="Distribucion de inventario"
            subtitle="Estados comerciales devueltos por analytics."
            segments={donutSegments}
            centerLabel="lotes"
            centerValue={`${kpis.inventarioTotal}`}
          />
        </div>

        <div className="admin-dashboard__bottom">
          <AdminDashboardBarChart
            title="Resumen por asesor"
            subtitle="Top por monto vendido en el rango y filtros actuales."
            items={summaryBars}
          />
          <AdminDashboardRanking
            title="Ranking de asesores"
            subtitle={`Ordenado por ${metricToLabel(filters.metric).toLowerCase()}.`}
            items={rankingItems}
          />
        </div>

        {!loading && salesSeries.length === 0 && inventory.length === 0 && advisorSummary.length === 0 ? (
          <p className="muted">No hay datos de dashboard para los filtros seleccionados.</p>
        ) : null}

        {!loading && inventory.length > 0 ? (
          <p className="muted">
            Inventario actual: {inventory.map((item) => `${inventoryLabel(item.estadoComercial)} ${item.cantidad}`).join(" · ")}
          </p>
        ) : null}

        {!loading ? (
          <p className="muted">
            Ticket promedio: {formatMoney(kpis.ticketPromedioVenta)} · Monto cobrado: {formatMoney(kpis.montoCobrado)}
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
