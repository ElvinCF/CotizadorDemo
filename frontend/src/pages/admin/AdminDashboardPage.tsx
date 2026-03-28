import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import AdminDashboardBarChart from "../../components/admin-dashboard/AdminDashboardBarChart";
import AdminDashboardDonutChart from "../../components/admin-dashboard/AdminDashboardDonutChart";
import AdminDashboardLineChart from "../../components/admin-dashboard/AdminDashboardLineChart";
import AdminDashboardRanking from "../../components/admin-dashboard/AdminDashboardRanking";
import AdminDashboardStatCard from "../../components/admin-dashboard/AdminDashboardStatCard";
import DataTable from "../../components/data-table/DataTable";
import DataTableSortHeader from "../../components/data-table/DataTableSortHeader";
import DashboardFilterField from "../../components/dashboard/DashboardFilterField";
import DashboardFilterToggle from "../../components/dashboard/DashboardFilterToggle";
import DashboardFilterToolbar from "../../components/dashboard/DashboardFilterToolbar";
import DashboardToolbarActions from "../../components/dashboard/DashboardToolbarActions";
import type { SortState } from "../../components/data-table/types";
import type {
  DashboardAdminFilters,
  DashboardAdminExecutiveOverview,
  DashboardAdminKpis,
  DashboardAdvisorSummaryItem,
  DashboardGroupBy,
  DashboardInventoryItem,
  DashboardRankingMetric,
  DashboardSalesSeriesItem,
  DashboardLotState,
} from "../../domain/dashboard";
import type { AdminUser } from "../../domain/adminUsers";
import { listAdminUsers } from "../../services/adminUsers";
import {
  getAdminDashboardAdvisorRanking,
  getAdminDashboardOverview,
  getAdminDashboardSalesSeries,
} from "../../services/dashboard";

type CollectionSortKey = "cliente" | "lote" | "fecha" | "monto";

type DashboardFiltersState = {
  from: string;
  to: string;
  estadoLote: "" | DashboardLotState;
  asesorId: string;
  groupBy: DashboardGroupBy;
  metric: DashboardRankingMetric;
  topN: string;
  year: string;
  month: string;
  search: string;
};

const LOT_STATE_OPTIONS: Array<{ value: "" | DashboardLotState; label: string }> = [
  { value: "", label: "Todos" },
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "SEPARADO", label: "Separado" },
  { value: "VENDIDO", label: "Vendido" },
];

const RANKING_METRIC_OPTIONS: Array<{ value: DashboardRankingMetric; label: string }> = [
  { value: "monto_vendido", label: "Monto vendido" },
  { value: "monto_cobrado", label: "Monto cobrado" },
  { value: "ticket_promedio_venta", label: "Ticket promedio" },
  { value: "saldo_pendiente", label: "Saldo pendiente" },
  { value: "cantidad_ventas", label: "Cantidad de ventas" },
  { value: "mayor_venta", label: "Mayor venta" },
];

const MONTH_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
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
  pendienteVender: 0,
  cuotaCobrarProximoMes: 0,
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
  asesorId: "",
  groupBy: "day",
  metric: "monto_vendido",
  topN: "5",
  year: String(new Date().getFullYear()),
  month: "TODOS",
  search: "",
};

const emptyExecutive: DashboardAdminExecutiveOverview = {
  period: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    from: "",
    to: "",
  },
  projectSummary: {
    totalLotes: 0,
    totalVendidos: 0,
    totalSeparados: 0,
    totalDisponibles: 0,
    porcentajeAvanceVentas: 0,
  },
  salesMonth: {
    cantidadVendidosMes: 0,
    valorTotalVendidoMes: 0,
    precioPromedioVendidoMes: 0,
    loteMasCaroCodigo: "-",
    precioMaxVendidoMes: 0,
    loteMasBaratoCodigo: "-",
    precioMinVendidoMes: 0,
  },
  incomeMonth: {
    ingresoInicialMes: 0,
    ingresoCuotasMes: 0,
    ingresoTotalMes: 0,
    diferenciaVendidoCobradoMes: 0,
  },
  monthComparison: {
    ventasMesActual: 0,
    ventasMesAnterior: 0,
    ingresosMesActual: 0,
    ingresosMesAnterior: 0,
    variacionVentasPct: 0,
    variacionIngresosPct: 0,
  },
  advisorPerformance: [],
  manzanaSummary: [],
  priceControl: [],
  collections: {
    pendingToday: [],
    dueNext7Days: [],
    overdue: [],
  },
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

const formatPercent = (value: number) => `${Number(value || 0).toFixed(2)}%`;

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

const monthRangeFromSelectors = (yearText: string, monthText: string) => {
  const year = Number.parseInt(yearText, 10);
  if (!Number.isInteger(year)) {
    return { from: null, to: null };
  }
  if (monthText === "TODOS") {
    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    };
  }
  const month = Number.parseInt(monthText, 10);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { from: null, to: null };
  }
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const to = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { from, to };
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUsername, loginPin, username } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filters, setFilters] = useState<DashboardFiltersState>(defaultFilters);
  const [lineGroupBy, setLineGroupBy] = useState<DashboardGroupBy>("day");
  const [rankingMetric, setRankingMetric] = useState<DashboardRankingMetric>("monto_vendido");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [kpis, setKpis] = useState<DashboardAdminKpis>(emptyKpis);
  const [salesSeries, setSalesSeries] = useState<DashboardSalesSeriesItem[]>([]);
  const [inventory, setInventory] = useState<DashboardInventoryItem[]>([]);
  const [advisorSummary, setAdvisorSummary] = useState<DashboardAdvisorSummaryItem[]>([]);
  const [advisorRanking, setAdvisorRanking] = useState<DashboardAdvisorSummaryItem[]>([]);
  const [executive, setExecutive] = useState<DashboardAdminExecutiveOverview>(emptyExecutive);
  const [todaySort, setTodaySort] = useState<SortState<CollectionSortKey>>({ key: "fecha", direction: "asc" });
  const [nextSort, setNextSort] = useState<SortState<CollectionSortKey>>({ key: "fecha", direction: "asc" });
  const [overdueSort, setOverdueSort] = useState<SortState<CollectionSortKey>>({ key: "fecha", direction: "asc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLElement | null>(null);
  const lineSeriesCacheRef = useRef(new Map<string, DashboardSalesSeriesItem[]>());

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
    () => {
      const monthRange = monthRangeFromSelectors(filters.year, filters.month);
      return {
      from: monthRange.from ?? (filters.from || null),
      to: monthRange.to ?? (filters.to || null),
      estadoLote: filters.estadoLote || null,
      estadoVenta: null,
      asesorId: filters.asesorId || null,
      };
    },
    [filters.asesorId, filters.estadoLote, filters.from, filters.month, filters.to, filters.year]
  );

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const overview = await getAdminDashboardOverview({
          ...requestFilters,
          groupBy: "month",
          metric: "monto_vendido",
          topN: Number.parseInt(filters.topN, 10) || 5,
          year: Number.parseInt(filters.year, 10) || null,
          month: filters.month === "TODOS" ? null : Number.parseInt(filters.month, 10) || null,
          search: null,
        });
        if (cancelled) {
          return;
        }
        // Pinta KPIs primero para mejorar percepcion de carga.
        setKpis(overview.kpis);
        setInventory(overview.inventory);
        setAdvisorSummary(overview.advisorSummary);
        setAdvisorRanking(overview.advisorRanking);
        setExecutive(overview.executive ?? emptyExecutive);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setKpis(emptyKpis);
        setInventory([]);
        setAdvisorSummary([]);
        setAdvisorRanking([]);
        setExecutive(emptyExecutive);
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar KPIs.");
      }

      setLoading(false);
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [filters.month, filters.year, requestFilters]);

  useEffect(() => {
    let cancelled = false;

    const loadRanking = async () => {
      try {
        const ranking = await getAdminDashboardAdvisorRanking({
          ...requestFilters,
          metric: rankingMetric,
          topN: Number.parseInt(filters.topN, 10) || 5,
        });
        if (!cancelled) {
          setAdvisorRanking(ranking);
        }
      } catch {
        if (!cancelled) {
          setAdvisorRanking([]);
        }
      }
    };

    void loadRanking();

    return () => {
      cancelled = true;
    };
  }, [filters.topN, rankingMetric, requestFilters]);

  useEffect(() => {
    let cancelled = false;

    const loadLineSeries = async () => {
      const cacheKey = JSON.stringify({ ...requestFilters, groupBy: lineGroupBy });
      const cached = lineSeriesCacheRef.current.get(cacheKey);
      if (cached) {
        setSalesSeries(cached);
        return;
      }

      try {
        const sales = await getAdminDashboardSalesSeries({ ...requestFilters, groupBy: lineGroupBy });
        if (cancelled) {
          return;
        }
        setSalesSeries(sales);
        lineSeriesCacheRef.current.set(cacheKey, sales);
      } catch {
        if (!cancelled) {
          setSalesSeries([]);
        }
      }
    };

    void loadLineSeries();

    return () => {
      cancelled = true;
    };
  }, [lineGroupBy, requestFilters]);

  const advisors = useMemo(
    () => users.filter((user) => (user.rol === "ASESOR" || user.rol === "ADMIN") && user.estado === "ACTIVO"),
    [users]
  );

  const lineSeries = useMemo(
    () =>
      salesSeries.map((item) => ({
      label: formatBucketLabel(item.bucket),
      sold: item.montoVendido,
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

  const statCards = useMemo(
    () => [
      {
        label: "Total lotes",
        value: loading ? "..." : `${kpis.inventarioTotal}`,
        tone: "info" as const,
        icon: <IconLots />,
      },
      {
        label: "Total vendidos",
        value: loading ? "..." : `${kpis.lotesVendidos}`,
        tone: "success" as const,
        icon: <IconSold />,
      },
      {
        label: "Total separados",
        value: loading ? "..." : `${kpis.lotesSeparados}`,
        tone: "warning" as const,
        icon: <IconMoney />,
      },
      {
        label: "Total disponibles",
        value: loading ? "..." : `${kpis.lotesDisponibles}`,
        tone: "info" as const,
        icon: <IconLots />,
      },
      {
        label: "Avance de ventas",
        value: loading ? "..." : formatPercent(executive.projectSummary.porcentajeAvanceVentas),
        tone: "neutral" as const,
        icon: <IconRate />,
      },
      {
        label: "Total vendido",
        value: loading ? "..." : compactMoney(kpis.montoVendido),
        tone: "success" as const,
        icon: <IconMoney />,
      },
      {
        label: "Total cobrado",
        value: loading ? "..." : compactMoney(kpis.montoCobrado),
        tone: "info" as const,
        icon: <IconMoney />,
      },
      {
        label: "Pendiente a cobrar",
        value: loading ? "..." : compactMoney(kpis.saldoPendienteGlobal),
        tone: "warning" as const,
        icon: <IconRate />,
      },
      {
        label: "Cuota a cobrar",
        value: loading ? "..." : compactMoney(kpis.cuotaCobrarProximoMes),
        helper: "Proximo mes",
        tone: "warning" as const,
        icon: <IconCalendar />,
      },
      {
        label: "Pendiente a vender",
        value: loading ? "..." : compactMoney(kpis.pendienteVender),
        helper: loading ? "..." : `${kpis.lotesDisponibles} lotes`,
        tone: "info" as const,
        icon: <IconLots />,
      },
    ],
    [executive.projectSummary.porcentajeAvanceVentas, kpis, loading]
  );

  const summaryBars = useMemo(() => {
    const sortedItems = advisorSummary
      .filter((item) => item.cantidadVentas > 0)
      .sort((a, b) => b.montoVendido - a.montoVendido);
    const maxValue = Math.max(
      ...sortedItems.map((item) => Math.max(item.montoVendido, item.montoCobrado)),
      1
    );

    return sortedItems.map((item) => ({
      label: item.asesorNombre || item.asesorUsername || "Asesor",
      helper: `${item.cantidadVentas} ventas | cartera ${item.carteraActiva}`,
      valueLabel: compactMoney(item.montoVendido),
      primaryLabel: "Vendido",
      ratio: item.montoVendido / maxValue,
      primaryAmount: item.montoVendido,
      secondaryLabel: "Cobrado",
      secondaryValueLabel: compactMoney(item.montoCobrado),
      secondaryRatio: item.montoCobrado / maxValue,
      secondaryAmount: item.montoCobrado,
    }));
  }, [advisorSummary]);

  const rankingItems = useMemo(
    () =>
      advisorRanking.map((item) => {
        const name = item.asesorNombre || item.asesorUsername || "Asesor";
        const value = metricToValue(item, rankingMetric);
        return {
          name,
          detail: `Cobrado ${compactMoney(item.montoCobrado)}`,
          valueLabel: rankingMetric === "cantidad_ventas" || rankingMetric === "cartera_activa" ? String(value) : compactMoney(value),
          helper: metricToLabel(rankingMetric),
          initials: getInitials(name),
          salesCount: item.cantidadVentas,
        };
      }),
    [advisorRanking, rankingMetric]
  );

  const sortDirectionForCollection = (sort: SortState<CollectionSortKey>, key: CollectionSortKey) =>
    sort.key === key ? sort.direction : null;

  const toggleCollectionSort = (
    setSort: Dispatch<SetStateAction<SortState<CollectionSortKey>>>,
    key: CollectionSortKey
  ) => {
    setSort((current) => {
      if (current.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return { key: null, direction: null };
    });
  };

  const sortCollections = (
    items: DashboardAdminExecutiveOverview["collections"]["pendingToday"],
    sort: SortState<CollectionSortKey>
  ) => {
    if (!sort.key || !sort.direction) {
      return items;
    }
    const multiplier = sort.direction === "asc" ? 1 : -1;
    const copy = [...items];
    copy.sort((a, b) => {
      if (sort.key === "cliente") {
        return a.clienteNombre.localeCompare(b.clienteNombre, "es") * multiplier;
      }
      if (sort.key === "lote") {
        return a.loteCodigo.localeCompare(b.loteCodigo, "es") * multiplier;
      }
      if (sort.key === "fecha") {
        return a.fechaVencimiento.localeCompare(b.fechaVencimiento) * multiplier;
      }
      return (a.montoPagar - b.montoPagar) * multiplier;
    });
    return copy;
  };

  const pendingTodayRows = useMemo(
    () => sortCollections(executive.collections.pendingToday, todaySort),
    [executive.collections.pendingToday, todaySort]
  );
  const dueNextRows = useMemo(
    () => sortCollections(executive.collections.dueNext7Days, nextSort),
    [executive.collections.dueNext7Days, nextSort]
  );
  const overdueRows = useMemo(
    () => sortCollections(executive.collections.overdue, overdueSort),
    [executive.collections.overdue, overdueSort]
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
        <Link className="btn ghost topbar-action" to="/usuarios">
          <IconUsers />
          Usuarios
        </Link>
      </nav>
      <DashboardFilterToggle
        open={filtersOpen}
        controlsId="admin-dashboard-filters"
        onToggle={() => setFiltersOpen((current) => !current)}
      />
    </div>
  );

  const mobileActions = (
    <DashboardFilterToggle
      open={filtersOpen}
      controlsId="admin-dashboard-filters"
      onToggle={() => setFiltersOpen((current) => !current)}
      mobile
    />
  );

  const adminBadge = <span className="dashboard-title-badge">{username || "Admin"}</span>;

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <AppShell
      title="Dashboard Administrativo"
      titleMeta={adminBadge}
      actions={actions}
      mobileActions={mobileActions}
      keepThemeVisibleOnMobile
      contentClassName="main--admin-dashboard"
    >
      <section className="admin-dashboard" ref={dashboardRef}>
        <DashboardFilterToolbar id="admin-dashboard-filters" open={filtersOpen} className="admin-dashboard__filters--admin">
          <DashboardFilterField label="Año" icon={<IconCalendar />}>
            <input
              type="number"
              min={2000}
              max={2100}
              value={filters.year}
              onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
            />
          </DashboardFilterField>
          <DashboardFilterField label="Mes" icon={<IconCalendar />}>
            <select
              value={filters.month}
              onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </DashboardFilterField>
          <DashboardFilterField label="Estado lote" icon={<IconFilter />}>
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
          </DashboardFilterField>
          <DashboardFilterField label="Asesor" icon={<IconUsers />}>
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
            title="Serie de ventas"
            subtitle="Monto vendido por fecha en el periodo seleccionado."
            legend="Ventas"
            data={lineSeries}
            groupBy={lineGroupBy}
            onGroupByChange={setLineGroupBy}
          />
          <AdminDashboardDonutChart
            title="Distribucion de inventario"
            subtitle="Estados comerciales devueltos por analytics."
            segments={donutSegments}
            centerLabel="lotes"
            centerValue={`${kpis.inventarioTotal}`}
          />
        </div>

        <div className="admin-dashboard__bottom admin-dashboard__bottom--swapped">
          <AdminDashboardRanking
            title="Ranking de asesores"
            subtitle={`Ordenado por ${metricToLabel(rankingMetric).toLowerCase()}.`}
            items={rankingItems}
            metric={rankingMetric}
            metricOptions={RANKING_METRIC_OPTIONS}
            onMetricChange={(metric) => setRankingMetric(metric as DashboardRankingMetric)}
          />
          <AdminDashboardBarChart
            title="Resumen por asesor"
            subtitle="Resumen completo por monto vendido en el rango y filtros actuales."
            items={summaryBars}
          />
        </div>

        <div className="admin-dashboard__bottom admin-dashboard__bottom--collections">
          <article className="admin-dashboard-panel admin-dashboard-panel--ranking">
            <div className="admin-dashboard-panel__head">
              <div>
                <h3>Cobranza y vencimientos</h3>
                <p>Seguimiento operativo para gestión de llamadas y cobranza.</p>
              </div>
            </div>
            <div className="admin-ranking admin-collections">
              <div className="admin-collections__group">
                <strong>Hoy ({executive.collections.pendingToday.length})</strong>
                <DataTable className="admin-collections-table-view">
                  <table className="sales-table admin-collections-table">
                    <thead>
                      <tr>
                        <th>
                          <DataTableSortHeader
                            label="Cliente"
                            direction={sortDirectionForCollection(todaySort, "cliente")}
                            onToggle={() => toggleCollectionSort(setTodaySort, "cliente")}
                          />
                        </th>
                        <th>
                          <DataTableSortHeader
                            label="Lote"
                            direction={sortDirectionForCollection(todaySort, "lote")}
                            onToggle={() => toggleCollectionSort(setTodaySort, "lote")}
                          />
                        </th>
                        <th>
                          <DataTableSortHeader
                            label="Vence"
                            direction={sortDirectionForCollection(todaySort, "fecha")}
                            onToggle={() => toggleCollectionSort(setTodaySort, "fecha")}
                          />
                        </th>
                        <th>
                          <DataTableSortHeader
                            label="Monto"
                            direction={sortDirectionForCollection(todaySort, "monto")}
                            onToggle={() => toggleCollectionSort(setTodaySort, "monto")}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTodayRows.slice(0, 5).map((item) => (
                        <tr key={`today-${item.ventaId}`}>
                          <td>{item.clienteNombre}</td>
                          <td>{item.loteCodigo}</td>
                          <td>{item.fechaVencimiento}</td>
                          <td>{compactMoney(item.montoPagar)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DataTable>
              </div>
              <div className="admin-collections__group">
                <strong>Próximos 7 días ({executive.collections.dueNext7Days.length})</strong>
                <DataTable className="admin-collections-table-view">
                  <table className="sales-table admin-collections-table">
                    <thead>
                      <tr>
                        <th>
                          <DataTableSortHeader
                            label="Cliente"
                            direction={sortDirectionForCollection(nextSort, "cliente")}
                            onToggle={() => toggleCollectionSort(setNextSort, "cliente")}
                          />
                        </th>
                        <th>
                          <DataTableSortHeader
                            label="Lote"
                            direction={sortDirectionForCollection(nextSort, "lote")}
                            onToggle={() => toggleCollectionSort(setNextSort, "lote")}
                          />
                        </th>
                        <th>
                          <DataTableSortHeader
                            label="Vence"
                            direction={sortDirectionForCollection(nextSort, "fecha")}
                            onToggle={() => toggleCollectionSort(setNextSort, "fecha")}
                          />
                        </th>
                        <th>
                          <DataTableSortHeader
                            label="Monto"
                            direction={sortDirectionForCollection(nextSort, "monto")}
                            onToggle={() => toggleCollectionSort(setNextSort, "monto")}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dueNextRows.slice(0, 5).map((item) => (
                        <tr key={`next-${item.ventaId}`}>
                          <td>{item.clienteNombre}</td>
                          <td>{item.loteCodigo}</td>
                          <td>{item.fechaVencimiento}</td>
                          <td>{compactMoney(item.montoPagar)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DataTable>
              </div>
              <div className="admin-collections__group">
                <strong>Vencidos ({executive.collections.overdue.length})</strong>
                <DataTable className="admin-collections-table-view">
                  <table className="sales-table admin-collections-table">
                    <thead>
                      <tr>
                        <th>
                          <DataTableSortHeader
                            label="Cliente"
                            direction={sortDirectionForCollection(overdueSort, "cliente")}
                            onToggle={() => toggleCollectionSort(setOverdueSort, "cliente")}
                          />
                        </th>
                        <th>
                          <DataTableSortHeader
                            label="Lote"
                            direction={sortDirectionForCollection(overdueSort, "lote")}
                            onToggle={() => toggleCollectionSort(setOverdueSort, "lote")}
                          />
                        </th>
                        <th>
                          <DataTableSortHeader
                            label="Vence"
                            direction={sortDirectionForCollection(overdueSort, "fecha")}
                            onToggle={() => toggleCollectionSort(setOverdueSort, "fecha")}
                          />
                        </th>
                        <th>
                          <DataTableSortHeader
                            label="Monto"
                            direction={sortDirectionForCollection(overdueSort, "monto")}
                            onToggle={() => toggleCollectionSort(setOverdueSort, "monto")}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueRows.slice(0, 5).map((item) => (
                        <tr key={`overdue-${item.ventaId}`}>
                          <td>{item.clienteNombre}</td>
                          <td>{item.loteCodigo}</td>
                          <td>{item.fechaVencimiento}</td>
                          <td>{compactMoney(item.montoPagar)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DataTable>
              </div>
            </div>
          </article>
        </div>

        {!loading && salesSeries.length === 0 && inventory.length === 0 && advisorSummary.length === 0 ? (
          <p className="muted">No hay datos de dashboard para los filtros seleccionados.</p>
        ) : null}
      </section>
    </AppShell>
  );
}



