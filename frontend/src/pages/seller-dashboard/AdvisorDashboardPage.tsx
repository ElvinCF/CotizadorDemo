import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../app/AppShell";
import AdminDashboardBarChart from "../../components/admin-dashboard/AdminDashboardBarChart";
import AdminDashboardDonutChart from "../../components/admin-dashboard/AdminDashboardDonutChart";
import AdminDashboardLineChart from "../../components/admin-dashboard/AdminDashboardLineChart";
import AdminDashboardRanking from "../../components/admin-dashboard/AdminDashboardRanking";
import AdminDashboardStatCard from "../../components/admin-dashboard/AdminDashboardStatCard";
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
    <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M3 19h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
    <path d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M15.5 11a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 19a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M14 18a4 4 0 0 1 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  const [filters, setFilters] = useState<AdvisorDashboardFiltersState>(defaultFilters);
  const [kpis, setKpis] = useState<DashboardAdvisorKpis>(emptyKpis);
  const [salesSeries, setSalesSeries] = useState<DashboardSalesSeriesItem[]>([]);
  const [collectionsSeries, setCollectionsSeries] = useState<DashboardCollectionsSeriesItem[]>([]);
  const [operationsByState, setOperationsByState] = useState<DashboardAdvisorOperationsByStateItem[]>([]);
  const [clients, setClients] = useState<DashboardAdvisorClientItem[]>([]);
  const [payments, setPayments] = useState<DashboardAdvisorPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const salesLine = useMemo(
    () =>
      salesSeries.map((item) => ({
        label: formatBucketLabel(item.bucket),
        value: item.montoVendido,
      })),
    [salesSeries]
  );

  const collectionsLine = useMemo(
    () =>
      collectionsSeries.map((item) => ({
        label: formatBucketLabel(item.bucket),
        value: item.montoCobrado,
      })),
    [collectionsSeries]
  );

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
    <nav className="topbar-nav">
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
  );

  return (
    <AppShell title="Dashboard de Asesor" actions={actions} contentClassName="main--admin-dashboard">
      <section className="admin-dashboard">
        <div className="admin-dashboard__hero">
          <div>
            <span className="admin-dashboard__eyebrow">Cartera personal</span>
            <h2>Seguimiento comercial del asesor</h2>
            <p>
              Vista personal conectada a analytics del backend para medir ventas, cobros, cartera activa,
              clientes y pagos registrados.
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
                <IconMoney />
                Tipo pago
              </span>
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
            </label>
          </div>
        </div>

        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-dashboard__stats">
          <AdminDashboardStatCard
            label="Mis ventas activas"
            value={loading ? "..." : `${kpis.misVentasActivas}`}
            helper={`${kpis.misSeparaciones} separaciones`}
            trend={`Mayor venta ${compactMoney(kpis.mayorVenta)}`}
            tone="info"
            icon={<IconSales />}
          />
          <AdminDashboardStatCard
            label="Monto vendido"
            value={loading ? "..." : compactMoney(kpis.miMontoVendido)}
            helper={`Cobrado ${compactMoney(kpis.miMontoCobrado)}`}
            trend={`Ticket ${compactMoney(kpis.ticketPromedioVenta)}`}
            tone="success"
            icon={<IconMoney />}
          />
          <AdminDashboardStatCard
            label="Saldo pendiente"
            value={loading ? "..." : compactMoney(kpis.saldoPendienteMiCartera)}
            helper={`${kpis.clientesActivos} clientes activos`}
            trend="Cartera vigente"
            tone="warning"
            icon={<IconClients />}
          />
          <AdminDashboardStatCard
            label="Pagos registrados"
            value={loading ? "..." : `${payments.length}`}
            helper={filters.tipoPago || "Todos los tipos"}
            trend={`Ultimos ${paymentsRanking.length} pagos`}
            tone="neutral"
            icon={<IconTable />}
          />
        </div>

        <div className="admin-dashboard__charts">
          <AdminDashboardLineChart
            title="Cobros en el tiempo"
            subtitle="Serie agrupada segun el periodo seleccionado."
            legend={filters.groupBy}
            data={collectionsLine}
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
            <AdminDashboardLineChart
              title="Ventas en el tiempo"
              subtitle="Monto vendido agrupado segun el periodo para tus operaciones."
              legend="ventas"
              data={salesLine}
            />
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
