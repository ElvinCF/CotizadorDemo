import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import AdminDashboardBarChart from "../../components/admin-dashboard/AdminDashboardBarChart";
import AdminDashboardDonutChart from "../../components/admin-dashboard/AdminDashboardDonutChart";
import AdminDashboardLineChart from "../../components/admin-dashboard/AdminDashboardLineChart";
import AdminDashboardRanking from "../../components/admin-dashboard/AdminDashboardRanking";
import AdminDashboardStatCard from "../../components/admin-dashboard/AdminDashboardStatCard";
import DashboardFilterField from "../../components/dashboard/DashboardFilterField";
import DashboardFilterToggle from "../../components/dashboard/DashboardFilterToggle";
import DashboardFilterToolbar from "../../components/dashboard/DashboardFilterToolbar";
import DashboardToolbarActions from "../../components/dashboard/DashboardToolbarActions";
import type {
  DashboardAdvisorClientItem,
  DashboardAdvisorKpis,
  DashboardAdvisorOperationsByStateItem,
  DashboardAdvisorPaymentItem,
  DashboardCollectionsSeriesItem,
  DashboardCommonFilters,
  DashboardGroupBy,
  DashboardLotState,
  DashboardPaymentFilters,
  DashboardSalesSeriesItem,
} from "../../domain/dashboard";
import type { PaymentType, SaleState } from "../../domain/ventas";
import { formatMoney } from "../../domain/formatters";
import {
  getAdvisorDashboardClients,
  getAdvisorDashboardCollectionsSeries,
  getAdvisorDashboardKpis,
  getAdvisorDashboardOperationsByStage,
  getAdvisorDashboardPayments,
  getAdvisorDashboardSalesSeries,
} from "../../services/dashboard";

type AdvisorDashboardFiltersState = {
  from: string;
  to: string;
  estadoLote: "" | DashboardLotState;
  estadoVenta: "" | SaleState;
  groupBy: DashboardGroupBy;
  tipoPago: "" | PaymentType;
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

const PAYMENT_TYPE_OPTIONS: Array<{ value: "" | PaymentType; label: string }> = [
  { value: "", label: "Todos" },
  { value: "SEPARACION", label: "Separacion" },
  { value: "INICIAL", label: "Inicial" },
  { value: "CUOTA", label: "Cuota" },
  { value: "OTRO", label: "Otro" },
];

const emptyKpis: DashboardAdvisorKpis = {
  misVentasActivas: 0,
  misSeparaciones: 0,
  miMontoVendido: 0,
  miMontoCobrado: 0,
  saldoPendienteMiCartera: 0,
  ticketPromedioVenta: 0,
  clientesActivos: 0,
  mayorVenta: 0,
};

const defaultFilters: AdvisorDashboardFiltersState = {
  from: "",
  to: "",
  estadoLote: "",
  estadoVenta: "",
  groupBy: "month",
  tipoPago: "",
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

const IconSales = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="4" y="10" width="3.4" height="9" rx="1.2" fill="currentColor" />
    <rect x="10.3" y="5" width="3.4" height="14" rx="1.2" fill="currentColor" />
    <rect x="16.6" y="12.5" width="3.4" height="6.5" rx="1.2" fill="currentColor" />
    <path d="M3 19h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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

const IconMoney = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 9h.01M17 15h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconClients = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.5 12a2.5 2.5 0 1 0 0-5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.5 19.5a5.8 5.8 0 0 1 11 0"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 18.5a4.4 4.4 0 0 1 5.5 1"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

const compactMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0]?.charAt(0) ?? "";
  const last = (parts.length > 1 ? parts[parts.length - 1] : parts[0])?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase();
};

const operationStateLabel = (state: SaleState) => {
  switch (state) {
    case "INICIAL_PAGADA":
      return "Inicial pagada";
    case "CONTRATO_FIRMADO":
      return "Contrato firmado";
    case "COMPLETADA":
      return "Completada";
    case "PAGANDO":
      return "Pagando";
    case "CAIDA":
      return "Caida";
    case "SEPARADA":
    default:
      return "Separada";
  }
};

export default function AdvisorDashboardPage() {
  const { username } = useAuth();
  const [filters, setFilters] = useState<AdvisorDashboardFiltersState>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [kpis, setKpis] = useState<DashboardAdvisorKpis>(emptyKpis);
  const [salesSeries, setSalesSeries] = useState<DashboardSalesSeriesItem[]>([]);
  const [collectionsSeries, setCollectionsSeries] = useState<DashboardCollectionsSeriesItem[]>([]);
  const [operationsByState, setOperationsByState] = useState<DashboardAdvisorOperationsByStateItem[]>([]);
  const [clients, setClients] = useState<DashboardAdvisorClientItem[]>([]);
  const [payments, setPayments] = useState<DashboardAdvisorPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLElement | null>(null);

  const commonFilters = useMemo<DashboardCommonFilters>(
    () => ({
      from: filters.from || null,
      to: filters.to || null,
      estadoLote: filters.estadoLote || null,
      estadoVenta: filters.estadoVenta || null,
    }),
    [filters.estadoLote, filters.estadoVenta, filters.from, filters.to]
  );

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      const paymentFilters: DashboardPaymentFilters = {
        ...commonFilters,
        tipoPago: filters.tipoPago || null,
      };

      const [kpisResult, salesSeriesResult, collectionsResult, operationsResult, clientsResult, paymentsResult] =
        await Promise.allSettled([
          getAdvisorDashboardKpis(commonFilters),
          getAdvisorDashboardSalesSeries({ ...commonFilters, groupBy: filters.groupBy }),
          getAdvisorDashboardCollectionsSeries({ ...paymentFilters, groupBy: filters.groupBy }),
          getAdvisorDashboardOperationsByStage(commonFilters),
          getAdvisorDashboardClients(commonFilters),
          getAdvisorDashboardPayments(paymentFilters),
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

      setSalesSeries(salesSeriesResult.status === "fulfilled" ? salesSeriesResult.value : []);
      setCollectionsSeries(collectionsResult.status === "fulfilled" ? collectionsResult.value : []);
      setOperationsByState(operationsResult.status === "fulfilled" ? operationsResult.value : []);
      setClients(clientsResult.status === "fulfilled" ? clientsResult.value : []);
      setPayments(paymentsResult.status === "fulfilled" ? paymentsResult.value : []);
      setLoading(false);
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [commonFilters, filters.groupBy, filters.tipoPago]);

  const salesLine = useMemo(() => {
    const salesByBucket = new Map(salesSeries.map((item) => [item.bucket, item]));
    const collectionsByBucket = new Map(collectionsSeries.map((item) => [item.bucket, item]));
    const buckets = Array.from(new Set([...salesByBucket.keys(), ...collectionsByBucket.keys()])).sort((a, b) =>
      a.localeCompare(b)
    );

    return buckets.map((bucket) => ({
      label: formatBucketLabel(bucket),
      sold: salesByBucket.get(bucket)?.montoVendido ?? 0,
      collected: collectionsByBucket.get(bucket)?.montoCobrado ?? 0,
    }));
  }, [collectionsSeries, salesSeries]);

  const operationsSegments = useMemo(
    () =>
      operationsByState.map((item, index) => ({
        label: operationStateLabel(item.estadoVenta),
        value: item.cantidad,
        color: [
          "var(--admin-donut-disponible)",
          "var(--admin-donut-separado)",
          "var(--admin-donut-vendido)",
          "var(--color-primary)",
          "var(--color-success)",
          "var(--color-warning)",
        ][index % 6],
      })),
    [operationsByState]
  );

  const clientsBars = useMemo(() => {
    const topClients = [...clients]
      .sort((a, b) => b.montoAcumulado - a.montoAcumulado)
      .slice(0, 5);
    const maxValue = Math.max(...topClients.map((item) => item.montoAcumulado), 1);

    return topClients.map((item) => ({
      label: item.clienteNombre,
      helper: `${item.operacionesActivas} operaciones activas`,
      valueLabel: compactMoney(item.montoAcumulado),
      ratio: item.montoAcumulado / maxValue,
    }));
  }, [clients]);

  const paymentsRanking = useMemo(
    () =>
      payments.slice(0, 5).map((item) => {
        const name = item.clienteNombre || item.clienteDni || "Cliente";
        return {
          name,
          detail: `${item.tipoPago} | ${item.loteCodigo || "Sin lote"} | ${operationStateLabel(item.estadoVenta)}`,
          valueLabel: compactMoney(item.monto),
          helper: new Date(item.fechaPago).toLocaleDateString("es-PE"),
          initials: getInitials(name),
        };
      }),
    [payments]
  );

  const actions = (
    <div className="dashboard-topbar-actions">
      <nav className="topbar-nav dashboard-topbar-nav">
        <Link className="btn ghost topbar-action" to="/">
          <IconMap />
          Mapa
        </Link>
        <Link className="btn ghost topbar-action" to="/lotes">
          <IconTable />
          Lotes
        </Link>
        <Link className="btn ghost topbar-action" to="/ventas">
          <IconSales />
          Ventas
        </Link>
      </nav>
      <DashboardFilterToggle
        open={filtersOpen}
        controlsId="advisor-dashboard-filters"
        onToggle={() => setFiltersOpen((current) => !current)}
      />
    </div>
  );

  const mobileActions = (
    <DashboardFilterToggle
      open={filtersOpen}
      controlsId="advisor-dashboard-filters"
      onToggle={() => setFiltersOpen((current) => !current)}
      mobile
    />
  );

  const advisorBadge = <span className="dashboard-title-badge">{username || "Asesor"}</span>;

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const statCards = useMemo(
    () => [
      {
        label: "Mis ventas activas",
        value: loading ? "..." : `${kpis.misVentasActivas}`,
        helper: loading ? "..." : `${kpis.misSeparaciones} separaciones`,
        tone: "info" as const,
        icon: <IconSales />,
      },
      {
        label: "Monto vendido",
        value: loading ? "..." : compactMoney(kpis.miMontoVendido),
        helper: loading ? "..." : `Mayor venta ${compactMoney(kpis.mayorVenta)}`,
        tone: "success" as const,
        icon: <IconMoney />,
      },
      {
        label: "Total cobrado",
        value: loading ? "..." : compactMoney(kpis.miMontoCobrado),
        helper: loading ? "..." : `${payments.length} pagos`,
        tone: "info" as const,
        icon: <IconMoney />,
      },
      {
        label: "Pendiente a cobrar",
        value: loading ? "..." : compactMoney(kpis.saldoPendienteMiCartera),
        helper: loading ? "..." : `${kpis.clientesActivos} clientes activos`,
        tone: "warning" as const,
        icon: <IconClients />,
      },
      {
        label: "Ticket promedio",
        value: loading ? "..." : compactMoney(kpis.ticketPromedioVenta),
        helper: loading ? "..." : "Promedio de ventas",
        tone: "neutral" as const,
        icon: <IconTable />,
      },
      {
        label: "Separaciones",
        value: loading ? "..." : `${kpis.misSeparaciones}`,
        helper: loading ? "..." : "Estado separada",
        tone: "warning" as const,
        icon: <IconTable />,
      },
      {
        label: "Clientes activos",
        value: loading ? "..." : `${kpis.clientesActivos}`,
        helper: loading ? "..." : "Cartera vigente",
        tone: "neutral" as const,
        icon: <IconClients />,
      },
      {
        label: "Mayor venta",
        value: loading ? "..." : compactMoney(kpis.mayorVenta),
        helper: loading ? "..." : "Operacion mas alta",
        tone: "success" as const,
        icon: <IconMoney />,
      },
    ],
    [kpis, loading, payments.length]
  );

  return (
    <AppShell
      title="Dashboard de Asesor"
      titleMeta={advisorBadge}
      actions={actions}
      mobileActions={mobileActions}
      keepThemeVisibleOnMobile
      contentClassName="main--admin-dashboard"
    >
      <section className="admin-dashboard" ref={dashboardRef}>
        <DashboardFilterToolbar id="advisor-dashboard-filters" open={filtersOpen} className="admin-dashboard__filters--advisor">
          <DashboardFilterField label="Desde" icon={<IconCalendar />}>
              <input
                type="date"
                value={filters.from}
                onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
              />
          </DashboardFilterField>
          <DashboardFilterField label="Hasta" icon={<IconCalendar />}>
              <input
                type="date"
                value={filters.to}
                onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
              />
          </DashboardFilterField>
          <DashboardFilterField label="Estado lote" icon={<IconFilter />}>
              <select
                value={filters.estadoLote}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    estadoLote: event.target.value as AdvisorDashboardFiltersState["estadoLote"],
                  }))
                }
              >
                {LOT_STATE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
          </DashboardFilterField>
          <DashboardFilterField label="Estado venta" icon={<IconFilter />}>
              <select
                value={filters.estadoVenta}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    estadoVenta: event.target.value as AdvisorDashboardFiltersState["estadoVenta"],
                  }))
                }
              >
                {SALE_STATE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
          </DashboardFilterField>
          <DashboardFilterField label="Agrupar" icon={<IconFilter />}>
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
          </DashboardFilterField>
          <DashboardFilterField label="Tipo pago" icon={<IconMoney />}>
              <select
                value={filters.tipoPago}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    tipoPago: event.target.value as AdvisorDashboardFiltersState["tipoPago"],
                  }))
                }
              >
                {PAYMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
          </DashboardFilterField>
          <DashboardToolbarActions onClear={clearFilters} />
        </DashboardFilterToolbar>

        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-dashboard__stats">
          {statCards.map((card) => (
            <AdminDashboardStatCard
              key={card.label}
              label={card.label}
              value={card.value}
              helper={card.helper}
              tone={card.tone}
              icon={card.icon}
            />
          ))}
        </div>

        <div className="admin-dashboard__charts">
          <AdminDashboardLineChart
            title="Ventas y cobros"
            subtitle="Serie comparada segun el periodo seleccionado."
            legend="Vendido / Cobrado"
            data={salesLine}
            groupBy={filters.groupBy}
            onGroupByChange={(next) => setFilters((current) => ({ ...current, groupBy: next }))}
          />
          <AdminDashboardDonutChart
            title="Operaciones por estado"
            subtitle="Distribucion de tu cartera segun estado de venta."
            segments={operationsSegments}
            centerLabel="operaciones"
            centerValue={`${operationsByState.reduce((sum, item) => sum + item.cantidad, 0)}`}
          />
        </div>

        <div className="admin-dashboard__bottom">
          <AdminDashboardBarChart
            title="Clientes con mayor monto acumulado"
            subtitle="Top de clientes activos dentro del filtro actual."
            items={clientsBars}
          />
          <AdminDashboardRanking
            title="Ultimos pagos registrados"
            subtitle="Lectura rapida de movimientos recientes de cartera."
            items={paymentsRanking}
          />
        </div>

        {!loading && salesSeries.length > 0 ? (
          <div className="admin-dashboard__charts">
            <article className="admin-dashboard-panel admin-dashboard-panel--ranking">
              <div className="admin-dashboard-panel__head">
                <div>
                  <h3>Resumen rapido</h3>
                  <p>Indicadores personales consolidados para seguimiento operativo.</p>
                </div>
              </div>
              <div className="admin-ranking">
                <div className="admin-ranking__item">
                  <span className="admin-ranking__avatar">VT</span>
                  <div className="admin-ranking__body">
                    <strong>Ticket promedio</strong>
                    <span>Promedio de tus ventas activas</span>
                  </div>
                  <div className="admin-ranking__value">
                    <strong>{formatMoney(kpis.ticketPromedioVenta)}</strong>
                    <span>Actual</span>
                  </div>
                </div>
                <div className="admin-ranking__item">
                  <span className="admin-ranking__avatar">CL</span>
                  <div className="admin-ranking__body">
                    <strong>Clientes activos</strong>
                    <span>Cartera con operaciones vigentes</span>
                  </div>
                  <div className="admin-ranking__value">
                    <strong>{kpis.clientesActivos}</strong>
                    <span>Clientes</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        ) : null}

        {!loading && collectionsSeries.length === 0 && operationsByState.length === 0 && clients.length === 0 ? (
          <p className="muted">No hay datos de dashboard para los filtros seleccionados.</p>
        ) : null}
      </section>
    </AppShell>
  );
}
