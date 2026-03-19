import type {
  DashboardAdminFilters,
  DashboardGroupBy,
  DashboardAdminKpis,
  DashboardAdminPaymentFilters,
  DashboardAdminSeriesFilters,
  DashboardAdvisorClientItem,
  DashboardAdvisorKpis,
  DashboardAdvisorOperationsByStateItem,
  DashboardAdvisorPaymentItem,
  DashboardCancelledSaleItem,
  DashboardCollectionsSeriesItem,
  DashboardInventoryItem,
  DashboardPaymentFilters,
  DashboardRankingFilters,
  DashboardSaleOperationItem,
  DashboardSalesSeriesItem,
  DashboardAdvisorSummaryItem,
  DashboardCommonFilters,
} from "../domain/dashboard";

type AuthCredentials = {
  username: string | null;
  pin: string | null;
};

type StoredAuthSession = {
  loginUsername?: string | null;
  loginPin?: string | null;
};

const readStoredCredentials = (): AuthCredentials => {
  if (typeof window === "undefined") {
    return { username: null, pin: null };
  }

  try {
    const raw = window.localStorage.getItem("auth_session");
    if (!raw) {
      return { username: null, pin: null };
    }

    const session = JSON.parse(raw) as StoredAuthSession;
    return {
      username: session.loginUsername ?? null,
      pin: session.loginPin ?? null,
    };
  } catch {
    return { username: null, pin: null };
  }
};

const ensureCredentials = (): AuthCredentials => {
  const credentials = readStoredCredentials();
  if (!credentials.username || !credentials.pin) {
    throw new Error("Tu sesion no tiene credenciales vigentes. Cierra sesion e ingresa nuevamente.");
  }
  return credentials;
};

const buildHeaders = () => {
  const credentials = ensureCredentials();
  return {
    "Content-Type": "application/json",
    "x-auth-user": credentials.username ?? "",
    "x-auth-pin": credentials.pin ?? "",
  };
};

const parseJsonSafe = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const buildError = async (response: Response, fallback: string) => {
  const payload = await parseJsonSafe(response);
  return new Error(payload.error || fallback);
};

const appendValue = (params: URLSearchParams, key: string, value: string | number | null | undefined) => {
  if (value == null || value === "") {
    return;
  }
  params.set(key, String(value));
};

const buildDashboardQuery = (filters?: Record<string, string | number | null | undefined>) => {
  const params = new URLSearchParams();

  if (!filters) {
    return params.toString();
  }

  Object.entries(filters).forEach(([key, value]) => appendValue(params, key, value));
  return params.toString();
};

const buildDashboardUrl = (scope: "admin" | "asesor", resource: string, filters?: Record<string, string | number | null | undefined>) => {
  const query = buildDashboardQuery(filters);
  return query ? `/api/dashboard/${scope}/${resource}?${query}` : `/api/dashboard/${scope}/${resource}`;
};

const requestDashboardItem = async <T>(
  scope: "admin" | "asesor",
  resource: string,
  filters: Record<string, string | number | null | undefined> | undefined,
  fallback: string
) => {
  const response = await fetch(buildDashboardUrl(scope, resource, filters), {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, fallback);
  }

  const payload = (await response.json()) as { item?: T };
  if (!payload.item) {
    throw new Error("La API no devolvio el item esperado del dashboard.");
  }
  return payload.item;
};

const requestDashboardItems = async <T>(
  scope: "admin" | "asesor",
  resource: string,
  filters: Record<string, string | number | null | undefined> | undefined,
  fallback: string
) => {
  const response = await fetch(buildDashboardUrl(scope, resource, filters), {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, fallback);
  }

  const payload = (await response.json()) as { items?: T[] };
  return Array.isArray(payload.items) ? payload.items : [];
};

const toAdminFilterParams = (filters?: DashboardAdminFilters) => ({
  from: filters?.from ?? null,
  to: filters?.to ?? null,
  asesorId: filters?.asesorId ?? null,
  estadoLote: filters?.estadoLote ?? null,
  estadoVenta: filters?.estadoVenta ?? null,
  page: filters?.page ?? null,
  pageSize: filters?.pageSize ?? null,
});

const toCommonFilterParams = (filters?: DashboardCommonFilters) => ({
  from: filters?.from ?? null,
  to: filters?.to ?? null,
  estadoLote: filters?.estadoLote ?? null,
  estadoVenta: filters?.estadoVenta ?? null,
  page: filters?.page ?? null,
  pageSize: filters?.pageSize ?? null,
});

export const getAdminDashboardKpis = async (filters?: DashboardAdminFilters) =>
  requestDashboardItem<DashboardAdminKpis>(
    "admin",
    "kpis",
    toAdminFilterParams(filters),
    "No se pudo cargar los KPIs del dashboard administrativo."
  );

export const getAdminDashboardSalesSeries = async (filters?: DashboardAdminSeriesFilters) =>
  requestDashboardItems<DashboardSalesSeriesItem>(
    "admin",
    "series-ventas",
    {
      ...toAdminFilterParams(filters),
      groupBy: filters?.groupBy ?? null,
    },
    "No se pudo cargar la serie de ventas del dashboard administrativo."
  );

export const getAdminDashboardCollectionsSeries = async (
  filters?: DashboardAdminPaymentFilters & { groupBy?: DashboardGroupBy | null }
) =>
  requestDashboardItems<DashboardCollectionsSeriesItem>(
    "admin",
    "series-cobros",
    {
      ...toAdminFilterParams(filters),
      tipoPago: filters?.tipoPago ?? null,
      groupBy: filters?.groupBy ?? null,
    },
    "No se pudo cargar la serie de cobros del dashboard administrativo."
  );

export const getAdminDashboardInventory = async (filters?: DashboardCommonFilters) =>
  requestDashboardItems<DashboardInventoryItem>(
    "admin",
    "inventario",
    toCommonFilterParams(filters),
    "No se pudo cargar el inventario del dashboard administrativo."
  );

export const getAdminDashboardAdvisorSummary = async (filters?: DashboardAdminFilters) =>
  requestDashboardItems<DashboardAdvisorSummaryItem>(
    "admin",
    "resumen-asesores",
    toAdminFilterParams(filters),
    "No se pudo cargar el resumen de asesores."
  );

export const getAdminDashboardAdvisorRanking = async (filters?: DashboardRankingFilters) =>
  requestDashboardItems<DashboardAdvisorSummaryItem>(
    "admin",
    "ranking-asesores",
    {
      ...toAdminFilterParams(filters),
      metric: filters?.metric ?? null,
      topN: filters?.topN ?? null,
    },
    "No se pudo cargar el ranking de asesores."
  );

export const getAdminDashboardActiveSales = async (filters?: DashboardAdminFilters) =>
  requestDashboardItems<DashboardSaleOperationItem>(
    "admin",
    "ventas-activas",
    toAdminFilterParams(filters),
    "No se pudo cargar las ventas activas del dashboard administrativo."
  );

export const getAdminDashboardCancelledSales = async (filters?: DashboardAdminFilters) =>
  requestDashboardItems<DashboardCancelledSaleItem>(
    "admin",
    "operaciones-anuladas",
    toAdminFilterParams(filters),
    "No se pudo cargar las operaciones anuladas del dashboard administrativo."
  );

export const getAdvisorDashboardKpis = async (filters?: DashboardCommonFilters) =>
  requestDashboardItem<DashboardAdvisorKpis>(
    "asesor",
    "kpis",
    toCommonFilterParams(filters),
    "No se pudo cargar los KPIs del dashboard de asesor."
  );

export const getAdvisorDashboardSalesSeries = async (
  filters?: DashboardCommonFilters & { groupBy?: DashboardGroupBy | null }
) =>
  requestDashboardItems<DashboardSalesSeriesItem>(
    "asesor",
    "series-ventas",
    {
      ...toCommonFilterParams(filters),
      groupBy: filters?.groupBy ?? null,
    },
    "No se pudo cargar la serie de ventas del dashboard de asesor."
  );

export const getAdvisorDashboardCollectionsSeries = async (
  filters?: DashboardPaymentFilters & { groupBy?: DashboardGroupBy | null }
) =>
  requestDashboardItems<DashboardCollectionsSeriesItem>(
    "asesor",
    "series-cobros",
    {
      ...toCommonFilterParams(filters),
      tipoPago: filters?.tipoPago ?? null,
      groupBy: filters?.groupBy ?? null,
    },
    "No se pudo cargar la serie de cobros del dashboard de asesor."
  );

export const getAdvisorDashboardOperationsByStage = async (filters?: DashboardCommonFilters) =>
  requestDashboardItems<DashboardAdvisorOperationsByStateItem>(
    "asesor",
    "operaciones-por-etapa",
    toCommonFilterParams(filters),
    "No se pudo cargar las operaciones por estado del dashboard de asesor."
  );

export const getAdvisorDashboardOperations = async (filters?: DashboardCommonFilters) =>
  requestDashboardItems<DashboardSaleOperationItem>(
    "asesor",
    "operaciones",
    toCommonFilterParams(filters),
    "No se pudo cargar las operaciones del dashboard de asesor."
  );

export const getAdvisorDashboardClients = async (filters?: DashboardCommonFilters) =>
  requestDashboardItems<DashboardAdvisorClientItem>(
    "asesor",
    "clientes",
    toCommonFilterParams(filters),
    "No se pudo cargar los clientes del dashboard de asesor."
  );

export const getAdvisorDashboardPayments = async (filters?: DashboardPaymentFilters) =>
  requestDashboardItems<DashboardAdvisorPaymentItem>(
    "asesor",
    "pagos",
    {
      ...toCommonFilterParams(filters),
      tipoPago: filters?.tipoPago ?? null,
    },
    "No se pudo cargar los pagos del dashboard de asesor."
  );
