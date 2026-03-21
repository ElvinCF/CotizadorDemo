import { badRequest } from "./errors.mjs";
import { resolveDbSchema, withPgClient } from "./postgres.mjs";
import { requireAdminUserAsync, requireAdvisorUserAsync } from "./authService.mjs";

const LOT_STATES = new Set(["DISPONIBLE", "SEPARADO", "VENDIDO"]);
const SALE_STATES = new Set(["SEPARADA", "INICIAL_PAGADA", "CONTRATO_FIRMADO", "PAGANDO", "COMPLETADA", "CAIDA"]);
const PAYMENT_TYPES = new Set(["SEPARACION", "INICIAL", "CUOTA", "OTRO"]);
const GROUP_BY_VALUES = new Set(["day", "week", "month"]);
const RANKING_METRICS = new Set([
  "monto_vendido",
  "monto_cobrado",
  "ticket_promedio_venta",
  "saldo_pendiente",
  "cantidad_ventas",
  "cartera_activa",
  "mayor_venta",
]);

const NUMERIC_KEYS = new Set([
  "inventarioTotal",
  "lotesDisponibles",
  "lotesSeparados",
  "lotesVendidos",
  "ventasActivas",
  "cantidad",
  "montoVendido",
  "montoCobrado",
  "saldoPendienteGlobal",
  "ticketPromedioVenta",
  "asesorTopMontoVendido",
  "cantidadVentas",
  "carteraActiva",
  "saldoPendiente",
  "mayorVenta",
  "porcentaje",
  "cantidadPagos",
  "misVentasActivas",
  "misSeparaciones",
  "miMontoVendido",
  "miMontoCobrado",
  "saldoPendienteMiCartera",
  "clientesActivos",
  "precioVenta",
  "pagadoTotal",
  "montoAcumulado",
  "operacionesActivas",
  "monto",
  "montoCuota",
  "montoInicialTotal",
  "montoFinanciado",
]);

const asTrimmed = (value) => String(value ?? "").trim();

const toCamel = (value) => value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const normalizeScalar = (key, value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (NUMERIC_KEYS.has(key)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
};

const normalizeRow = (row) =>
  Object.fromEntries(
    Object.entries(row ?? {}).map(([key, value]) => {
      const camelKey = toCamel(key);
      return [camelKey, normalizeScalar(camelKey, value)];
    })
  );

const parseOptionalDate = (value, fieldName) => {
  const raw = asTrimmed(value);
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(`${fieldName} invalida.`);
  }

  return parsed.toISOString().slice(0, 10);
};

const parseOptionalUuid = (value, fieldName) => {
  const raw = asTrimmed(value);
  if (!raw) {
    return null;
  }

  if (!/^[0-9a-fA-F-]{36}$/.test(raw)) {
    throw badRequest(`${fieldName} invalido.`);
  }

  return raw;
};

const parseOptionalEnum = (value, allowed, fieldName) => {
  const raw = asTrimmed(value);
  if (!raw) {
    return null;
  }

  const normalized = raw.toUpperCase();
  if (!allowed.has(normalized)) {
    throw badRequest(`${fieldName} invalido.`);
  }

  return normalized;
};

const parseGroupBy = (value) => {
  const raw = asTrimmed(value).toLowerCase();
  if (!raw) {
    return "month";
  }
  if (!GROUP_BY_VALUES.has(raw)) {
    throw badRequest("groupBy invalido. Usa day, week o month.");
  }
  return raw;
};

const parseRankingMetric = (value) => {
  const raw = asTrimmed(value).toLowerCase();
  if (!raw) {
    return "monto_vendido";
  }
  if (!RANKING_METRICS.has(raw)) {
    throw badRequest("metric invalido.");
  }
  return raw;
};

const parsePositiveInt = (value, fieldName, defaultValue, maxValue = 100) => {
  const raw = asTrimmed(value);
  if (!raw) {
    return defaultValue;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw badRequest(`${fieldName} invalido.`);
  }

  return Math.min(parsed, maxValue);
};

const parsePage = (value) => {
  const raw = asTrimmed(value);
  if (!raw) {
    return 1;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw badRequest("page invalido.");
  }

  return parsed;
};

const parseSaleState = (query) =>
  parseOptionalEnum(query?.estadoVenta ?? query?.etapaVenta, SALE_STATES, "estadoVenta");

const buildCommonFilters = (query, { allowAdvisorId = false } = {}) => {
  const filters = {
    from: parseOptionalDate(query?.from, "from"),
    to: parseOptionalDate(query?.to, "to"),
    estadoLote: parseOptionalEnum(query?.estadoLote, LOT_STATES, "estadoLote"),
    estadoVenta: parseSaleState(query),
  };

  if (filters.from && filters.to && filters.from > filters.to) {
    throw badRequest("El rango de fechas es invalido.");
  }

  if (allowAdvisorId) {
    filters.asesorId = parseOptionalUuid(query?.asesorId, "asesorId");
  }

  return filters;
};

const buildPaymentFilters = (query, options = {}) => ({
  ...buildCommonFilters(query, options),
  tipoPago: parseOptionalEnum(query?.tipoPago, PAYMENT_TYPES, "tipoPago"),
});

const buildPagination = (query) => {
  const page = parsePage(query?.page);
  const pageSize = parsePositiveInt(query?.pageSize, "pageSize", 20, 100);
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
};

const queryFunction = async (client, schema, functionName, args) => {
  const placeholders = args.map((_, index) => `$${index + 1}`).join(", ");
  const result = await client.query(`select * from ${schema}.${functionName}(${placeholders})`, args);
  return result.rows;
};

const queryMany = async (functionName, args) => {
  const schema = resolveDbSchema();
  return withPgClient(async (client) => {
    const rows = await queryFunction(client, schema, functionName, args);
    return rows.map(normalizeRow);
  });
};

const queryOne = async (functionName, args) => {
  const rows = await queryMany(functionName, args);
  return rows[0] ?? {};
};

const getAdminFilters = (query) => buildCommonFilters(query, { allowAdvisorId: true });

const fetchAdminKpis = (filters) =>
  queryOne("dashboard_admin_kpis", [
    filters.from,
    filters.to,
    filters.asesorId ?? null,
    filters.estadoLote,
    filters.estadoVenta,
  ]);

const fetchAdminSalesSeries = (filters, groupBy) =>
  queryMany("dashboard_admin_series_ventas", [
    filters.from,
    filters.to,
    filters.asesorId ?? null,
    filters.estadoLote,
    filters.estadoVenta,
    groupBy,
  ]);

const fetchAdminInventory = (filters) => queryMany("dashboard_admin_inventario_estado", [filters.estadoLote]);

const fetchAdminAdvisorSummary = (filters) =>
  queryMany("dashboard_admin_resumen_asesores", [
    filters.from,
    filters.to,
    filters.asesorId ?? null,
    filters.estadoLote,
    filters.estadoVenta,
  ]);

const fetchAdminAdvisorRanking = (filters, metric, topN) =>
  queryMany("dashboard_admin_ranking_asesores", [
    filters.from,
    filters.to,
    filters.asesorId ?? null,
    filters.estadoLote,
    filters.estadoVenta,
    metric,
    topN,
  ]);

export const getAdminDashboardKpisAsync = async (username, pin, query) => {
  await requireAdminUserAsync(username, pin);
  const filters = getAdminFilters(query);
  return fetchAdminKpis(filters);
};

export const getAdminDashboardSalesSeriesAsync = async (username, pin, query) => {
  await requireAdminUserAsync(username, pin);
  const filters = getAdminFilters(query);
  return fetchAdminSalesSeries(filters, parseGroupBy(query?.groupBy));
};

export const getAdminDashboardCollectionsSeriesAsync = async (username, pin, query) => {
  await requireAdminUserAsync(username, pin);
  const filters = buildPaymentFilters(query, { allowAdvisorId: true });

  return queryMany("dashboard_admin_series_cobros", [
    filters.from,
    filters.to,
    filters.asesorId ?? null,
    filters.estadoLote,
    filters.estadoVenta,
    filters.tipoPago,
    parseGroupBy(query?.groupBy),
  ]);
};

export const getAdminDashboardInventoryAsync = async (username, pin, query) => {
  await requireAdminUserAsync(username, pin);
  const filters = buildCommonFilters(query);
  return fetchAdminInventory(filters);
};

export const getAdminDashboardAdvisorSummaryAsync = async (username, pin, query) => {
  await requireAdminUserAsync(username, pin);
  const filters = getAdminFilters(query);
  return fetchAdminAdvisorSummary(filters);
};

export const getAdminDashboardAdvisorRankingAsync = async (username, pin, query) => {
  await requireAdminUserAsync(username, pin);
  const filters = getAdminFilters(query);
  return fetchAdminAdvisorRanking(
    filters,
    parseRankingMetric(query?.metric),
    parsePositiveInt(query?.topN, "topN", 10, 50)
  );
};

export const getAdminDashboardOverviewAsync = async (username, pin, query) => {
  await requireAdminUserAsync(username, pin);
  const filters = getAdminFilters(query);
  const groupBy = parseGroupBy(query?.groupBy);
  const metric = parseRankingMetric(query?.metric);
  const topN = parsePositiveInt(query?.topN, "topN", 10, 50);

  const [kpis, salesSeries, inventory, advisorSummary, advisorRanking] = await Promise.all([
    fetchAdminKpis(filters),
    fetchAdminSalesSeries(filters, groupBy),
    fetchAdminInventory(filters),
    fetchAdminAdvisorSummary(filters),
    fetchAdminAdvisorRanking(filters, metric, topN),
  ]);

  return { kpis, salesSeries, inventory, advisorSummary, advisorRanking };
};

export const getAdminDashboardActiveSalesAsync = async (username, pin, query) => {
  await requireAdminUserAsync(username, pin);
  const filters = buildCommonFilters(query, { allowAdvisorId: true });
  const pagination = buildPagination(query);

  return queryMany("dashboard_admin_ventas_activas", [
    filters.from,
    filters.to,
    filters.asesorId ?? null,
    filters.estadoLote,
    filters.estadoVenta,
    pagination.pageSize,
    pagination.offset,
  ]);
};

export const getAdminDashboardCancelledSalesAsync = async (username, pin, query) => {
  await requireAdminUserAsync(username, pin);
  const filters = buildCommonFilters(query, { allowAdvisorId: true });
  const pagination = buildPagination(query);

  return queryMany("dashboard_admin_operaciones_caidas", [
    filters.from,
    filters.to,
    filters.asesorId ?? null,
    filters.estadoLote,
    pagination.pageSize,
    pagination.offset,
  ]);
};

const resolveAdvisorUser = async (username, pin) => requireAdvisorUserAsync(username, pin);

export const getAdvisorDashboardKpisAsync = async (username, pin, query) => {
  const advisor = await resolveAdvisorUser(username, pin);
  const filters = buildCommonFilters(query);

  return queryOne("dashboard_asesor_kpis", [
    advisor.id,
    filters.from,
    filters.to,
    filters.estadoLote,
    filters.estadoVenta,
  ]);
};

export const getAdvisorDashboardSalesSeriesAsync = async (username, pin, query) => {
  const advisor = await resolveAdvisorUser(username, pin);
  const filters = buildCommonFilters(query);

  return queryMany("dashboard_asesor_series_ventas", [
    advisor.id,
    filters.from,
    filters.to,
    filters.estadoLote,
    filters.estadoVenta,
    parseGroupBy(query?.groupBy),
  ]);
};

export const getAdvisorDashboardCollectionsSeriesAsync = async (username, pin, query) => {
  const advisor = await resolveAdvisorUser(username, pin);
  const filters = buildPaymentFilters(query);

  return queryMany("dashboard_asesor_series_cobros", [
    advisor.id,
    filters.from,
    filters.to,
    filters.estadoLote,
    filters.estadoVenta,
    filters.tipoPago,
    parseGroupBy(query?.groupBy),
  ]);
};

export const getAdvisorDashboardOperationsByStageAsync = async (username, pin, query) => {
  const advisor = await resolveAdvisorUser(username, pin);
  const filters = buildCommonFilters(query);

  return queryMany("dashboard_asesor_operaciones_por_estado", [
    advisor.id,
    filters.from,
    filters.to,
    filters.estadoLote,
    filters.estadoVenta,
  ]);
};

export const getAdvisorDashboardOperationsAsync = async (username, pin, query) => {
  const advisor = await resolveAdvisorUser(username, pin);
  const filters = buildCommonFilters(query);
  const pagination = buildPagination(query);

  return queryMany("dashboard_asesor_resumen_operaciones", [
    advisor.id,
    filters.from,
    filters.to,
    filters.estadoLote,
    filters.estadoVenta,
    pagination.pageSize,
    pagination.offset,
  ]);
};

export const getAdvisorDashboardClientsAsync = async (username, pin, query) => {
  const advisor = await resolveAdvisorUser(username, pin);
  const filters = buildCommonFilters(query);
  const pagination = buildPagination(query);

  return queryMany("dashboard_asesor_clientes_activos", [
    advisor.id,
    filters.from,
    filters.to,
    filters.estadoLote,
    filters.estadoVenta,
    pagination.pageSize,
    pagination.offset,
  ]);
};

export const getAdvisorDashboardPaymentsAsync = async (username, pin, query) => {
  const advisor = await resolveAdvisorUser(username, pin);
  const filters = buildPaymentFilters(query);
  const pagination = buildPagination(query);

  return queryMany("dashboard_asesor_pagos_registrados", [
    advisor.id,
    filters.from,
    filters.to,
    filters.estadoLote,
    filters.estadoVenta,
    filters.tipoPago,
    pagination.pageSize,
    pagination.offset,
  ]);
};
