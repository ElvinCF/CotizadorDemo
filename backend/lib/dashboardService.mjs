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
  "pendienteVender",
  "cuotaCobrarProximoMes",
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
  "totalLotes",
  "totalVendidos",
  "totalSeparados",
  "totalDisponibles",
  "porcentajeAvanceVentas",
  "cantidadVendidosMes",
  "valorTotalVendidoMes",
  "precioPromedioVendidoMes",
  "precioMaxVendidoMes",
  "precioMinVendidoMes",
  "ingresoInicialMes",
  "ingresoCuotasMes",
  "ingresoTotalMes",
  "diferenciaVendidoCobradoMes",
  "ventasMesActual",
  "ventasMesAnterior",
  "ingresosMesActual",
  "ingresosMesAnterior",
  "variacionVentasPct",
  "variacionIngresosPct",
  "ingresoInicialGenerado",
  "descuentoMonto",
  "descuentoPct",
  "montoPendiente",
  "valorTotalMz",
  "valorVendido",
  "valorCobrado",
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

const parseSaleState = (query, { allowCaidaState = false } = {}) => {
  const parsed = parseOptionalEnum(query?.estadoVenta ?? query?.etapaVenta, SALE_STATES, "estadoVenta");
  if (!allowCaidaState && parsed === "CAIDA") {
    throw badRequest("estadoVenta=CAIDA no esta permitido en este reporte.");
  }
  return parsed;
};

const buildCommonFilters = (query, { allowAdvisorId = false, allowCaidaState = false } = {}) => {
  const filters = {
    from: parseOptionalDate(query?.from, "from"),
    to: parseOptionalDate(query?.to, "to"),
    manzana: parseOptionalText(query?.manzana),
    estadoLote: parseOptionalEnum(query?.estadoLote, LOT_STATES, "estadoLote"),
    estadoVenta: parseSaleState(query, { allowCaidaState }),
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

const queryRowsSql = async (sql, params = []) => {
  const schema = resolveDbSchema();
  const resolved = sql.replaceAll("{{SCHEMA}}", schema);
  return withPgClient(async (client) => {
    const result = await client.query(resolved, params);
    return result.rows.map(normalizeRow);
  });
};

const queryOneSql = async (sql, params = []) => {
  const rows = await queryRowsSql(sql, params);
  return rows[0] ?? {};
};

const parseOptionalYear = (value) => {
  const raw = asTrimmed(value);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) {
    throw badRequest("year invalido.");
  }
  return parsed;
};

const parseOptionalMonth = (value) => {
  const raw = asTrimmed(value);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
    throw badRequest("month invalido.");
  }
  return parsed;
};

const parseOptionalText = (value) => {
  const raw = asTrimmed(value);
  return raw || null;
};

const buildExecutiveFilters = (query) => {
  const base = buildCommonFilters(query, { allowAdvisorId: true });
  const now = new Date();
  const year = parseOptionalYear(query?.year) ?? now.getFullYear();
  const month = parseOptionalMonth(query?.month) ?? now.getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndDate = new Date(year, month, 0);
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth() + 1;
  const prevStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const prevEndDate = new Date(prevYear, prevMonth, 0);
  const prevEnd = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prevEndDate.getDate()).padStart(2, "0")}`;

  return {
    ...base,
    year,
    month,
    monthStart,
    monthEnd,
    prevStart,
    prevEnd,
    manzana: base.manzana,
    search: parseOptionalText(query?.search),
  };
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

const fetchAdminCollectionsSeries = (filters, groupBy, tipoPago = null) =>
  queryMany("dashboard_admin_series_cobros", [
    filters.from,
    filters.to,
    filters.asesorId ?? null,
    filters.estadoLote,
    filters.estadoVenta,
    tipoPago,
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
  const executive = buildExecutiveFilters(query);
  const groupBy = parseGroupBy(query?.groupBy);
  const metric = parseRankingMetric(query?.metric);
  const topN = parsePositiveInt(query?.topN, "topN", 10, 50);

  const kpis = await fetchAdminKpis(filters);
  const salesSeries = await fetchAdminSalesSeries(filters, groupBy);
  const collectionsSeries = await fetchAdminCollectionsSeries(filters, groupBy, null);
  const inventory = await fetchAdminInventory(filters);
  const advisorSummary = await fetchAdminAdvisorSummary(filters);
  const advisorRanking = await fetchAdminAdvisorRanking(filters, metric, topN);
  const executiveSummary = await buildAdminDashboardExecutiveDataAsync(executive);

  return { kpis, salesSeries, collectionsSeries, inventory, advisorSummary, advisorRanking, executive: executiveSummary };
};

const buildAdminDashboardExecutiveDataAsync = async (query) => {
  const filters = query?.monthStart ? query : buildExecutiveFilters(query);
  const soldStates = ["INICIAL_PAGADA", "CONTRATO_FIRMADO", "PAGANDO", "COMPLETADA"];
  const activeStates = ["SEPARADA", "INICIAL_PAGADA", "CONTRATO_FIRMADO", "PAGANDO", "COMPLETADA"];

  const shared = [
    filters.asesorId,
    filters.manzana,
    filters.search,
    filters.estadoLote,
  ];

  const projectSummarySql = `
    select
      count(*)::int as total_lotes,
      coalesce(sum((l.estado_comercial = 'VENDIDO')::int), 0)::int as total_vendidos,
      coalesce(sum((l.estado_comercial = 'SEPARADO')::int), 0)::int as total_separados,
      coalesce(sum((l.estado_comercial = 'DISPONIBLE')::int), 0)::int as total_disponibles,
      case when count(*) = 0 then 0
        else round((sum((l.estado_comercial = 'VENDIDO')::int)::numeric * 100) / count(*), 2)
      end as porcentaje_avance_ventas
    from {{SCHEMA}}.lotes l
    where ($1::uuid is null or exists (
      select 1
      from {{SCHEMA}}.ventas v
      join {{SCHEMA}}.venta_lotes vl on vl.venta_id = v.id
      where vl.lote_id = l.id and v.asesor_id = $1::uuid and v.estado_venta::text <> 'CAIDA'
    ))
      and ($2::text is null or upper(l.manzana) = upper($2::text))
      and (
        $3::text is null
        or l.codigo ilike '%' || $3::text || '%'
        or l.manzana ilike '%' || $3::text || '%'
      )
      and ($4::text is null or l.estado_comercial::text = $4::text)
  `;

  const salesMonthSql = `
    with ventas_mes as (
      select
        v.id,
        v.precio_venta,
        l.codigo as lote_codigo
      from {{SCHEMA}}.ventas v
      join lateral (
        select vl.lote_id
        from {{SCHEMA}}.venta_lotes vl
        where vl.venta_id = v.id
        order by vl.orden asc, vl.created_at asc, vl.id asc
        limit 1
      ) vl_primary on true
      join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
      join {{SCHEMA}}.clientes c on c.id = v.cliente_id
      left join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
      where (v.fecha_venta at time zone 'America/Lima')::date between $1::date and $2::date
        and v.estado_venta::text = any($3::text[])
        and ($4::uuid is null or v.asesor_id = $4::uuid)
        and ($5::text is null or upper(l.manzana) = upper($5::text))
        and (
          $6::text is null
          or c.nombre_completo ilike '%' || $6::text || '%'
          or l.codigo ilike '%' || $6::text || '%'
          or coalesce(u.nombres, '') || ' ' || coalesce(u.apellidos, '') ilike '%' || $6::text || '%'
        )
        and ($7::text is null or l.estado_comercial::text = $7::text)
    ),
    max_row as (
      select lote_codigo, precio_venta
      from ventas_mes
      order by precio_venta desc, lote_codigo asc
      limit 1
    ),
    min_row as (
      select lote_codigo, precio_venta
      from ventas_mes
      order by precio_venta asc, lote_codigo asc
      limit 1
    )
    select
      count(*)::int as cantidad_vendidos_mes,
      coalesce(sum(precio_venta), 0)::numeric as valor_total_vendido_mes,
      coalesce(avg(precio_venta), 0)::numeric as precio_promedio_vendido_mes,
      coalesce((select lote_codigo from max_row), '-') as lote_mas_caro_codigo,
      coalesce((select precio_venta from max_row), 0)::numeric as precio_max_vendido_mes,
      coalesce((select lote_codigo from min_row), '-') as lote_mas_barato_codigo,
      coalesce((select precio_venta from min_row), 0)::numeric as precio_min_vendido_mes
    from ventas_mes
  `;

  const incomeMonthSql = `
    select
      coalesce(sum(case when p.tipo_pago = 'INICIAL' then p.monto else 0 end), 0)::numeric as ingreso_inicial_mes,
      coalesce(sum(case when p.tipo_pago = 'CUOTA' then p.monto else 0 end), 0)::numeric as ingreso_cuotas_mes,
      coalesce(sum(p.monto), 0)::numeric as ingreso_total_mes
    from {{SCHEMA}}.pagos p
    join {{SCHEMA}}.ventas v on v.id = p.venta_id
    join lateral (
      select vl.lote_id
      from {{SCHEMA}}.venta_lotes vl
      where vl.venta_id = v.id
      order by vl.orden asc, vl.created_at asc, vl.id asc
      limit 1
    ) vl_primary on true
    join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
    join {{SCHEMA}}.clientes c on c.id = v.cliente_id
    left join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
    where (p.fecha_pago at time zone 'America/Lima')::date between $1::date and $2::date
      and v.estado_venta::text <> 'CAIDA'
      and ($3::uuid is null or v.asesor_id = $3::uuid)
      and ($4::text is null or upper(l.manzana) = upper($4::text))
      and (
        $5::text is null
        or c.nombre_completo ilike '%' || $5::text || '%'
        or l.codigo ilike '%' || $5::text || '%'
        or coalesce(u.nombres, '') || ' ' || coalesce(u.apellidos, '') ilike '%' || $5::text || '%'
      )
      and ($6::text is null or l.estado_comercial::text = $6::text)
  `;

  const compareSql = `
    with ventas_actual as (
      select count(*)::int as cantidad, coalesce(sum(v.precio_venta),0)::numeric as monto
      from {{SCHEMA}}.ventas v
      join lateral (
        select vl.lote_id
        from {{SCHEMA}}.venta_lotes vl
        where vl.venta_id = v.id
        order by vl.orden asc, vl.created_at asc, vl.id asc
        limit 1
      ) vl_primary on true
      join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
      join {{SCHEMA}}.clientes c on c.id = v.cliente_id
      left join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
      where (v.fecha_venta at time zone 'America/Lima')::date between $1::date and $2::date
        and v.estado_venta::text = any($3::text[])
        and ($4::uuid is null or v.asesor_id = $4::uuid)
        and ($5::text is null or upper(l.manzana) = upper($5::text))
        and ($6::text is null or c.nombre_completo ilike '%' || $6::text || '%' or l.codigo ilike '%' || $6::text || '%' or coalesce(u.nombres,'') || ' ' || coalesce(u.apellidos,'') ilike '%' || $6::text || '%')
        and ($7::text is null or l.estado_comercial::text = $7::text)
    ),
    ventas_prev as (
      select count(*)::int as cantidad, coalesce(sum(v.precio_venta),0)::numeric as monto
      from {{SCHEMA}}.ventas v
      join lateral (
        select vl.lote_id
        from {{SCHEMA}}.venta_lotes vl
        where vl.venta_id = v.id
        order by vl.orden asc, vl.created_at asc, vl.id asc
        limit 1
      ) vl_primary on true
      join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
      join {{SCHEMA}}.clientes c on c.id = v.cliente_id
      left join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
      where (v.fecha_venta at time zone 'America/Lima')::date between $8::date and $9::date
        and v.estado_venta::text = any($3::text[])
        and ($4::uuid is null or v.asesor_id = $4::uuid)
        and ($5::text is null or upper(l.manzana) = upper($5::text))
        and ($6::text is null or c.nombre_completo ilike '%' || $6::text || '%' or l.codigo ilike '%' || $6::text || '%' or coalesce(u.nombres,'') || ' ' || coalesce(u.apellidos,'') ilike '%' || $6::text || '%')
        and ($7::text is null or l.estado_comercial::text = $7::text)
    ),
    ingresos_actual as (
      select coalesce(sum(p.monto), 0)::numeric as monto
      from {{SCHEMA}}.pagos p
      join {{SCHEMA}}.ventas v on v.id = p.venta_id
      join lateral (
        select vl.lote_id
        from {{SCHEMA}}.venta_lotes vl
        where vl.venta_id = v.id
        order by vl.orden asc, vl.created_at asc, vl.id asc
        limit 1
      ) vl_primary on true
      join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
      join {{SCHEMA}}.clientes c on c.id = v.cliente_id
      left join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
      where (p.fecha_pago at time zone 'America/Lima')::date between $1::date and $2::date
        and v.estado_venta::text <> 'CAIDA'
        and ($4::uuid is null or v.asesor_id = $4::uuid)
        and ($5::text is null or upper(l.manzana) = upper($5::text))
        and ($6::text is null or c.nombre_completo ilike '%' || $6::text || '%' or l.codigo ilike '%' || $6::text || '%' or coalesce(u.nombres,'') || ' ' || coalesce(u.apellidos,'') ilike '%' || $6::text || '%')
        and ($7::text is null or l.estado_comercial::text = $7::text)
    ),
    ingresos_prev as (
      select coalesce(sum(p.monto), 0)::numeric as monto
      from {{SCHEMA}}.pagos p
      join {{SCHEMA}}.ventas v on v.id = p.venta_id
      join lateral (
        select vl.lote_id
        from {{SCHEMA}}.venta_lotes vl
        where vl.venta_id = v.id
        order by vl.orden asc, vl.created_at asc, vl.id asc
        limit 1
      ) vl_primary on true
      join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
      join {{SCHEMA}}.clientes c on c.id = v.cliente_id
      left join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
      where (p.fecha_pago at time zone 'America/Lima')::date between $8::date and $9::date
        and v.estado_venta::text <> 'CAIDA'
        and ($4::uuid is null or v.asesor_id = $4::uuid)
        and ($5::text is null or upper(l.manzana) = upper($5::text))
        and ($6::text is null or c.nombre_completo ilike '%' || $6::text || '%' or l.codigo ilike '%' || $6::text || '%' or coalesce(u.nombres,'') || ' ' || coalesce(u.apellidos,'') ilike '%' || $6::text || '%')
        and ($7::text is null or l.estado_comercial::text = $7::text)
    )
    select
      (select cantidad from ventas_actual)::int as ventas_mes_actual,
      (select cantidad from ventas_prev)::int as ventas_mes_anterior,
      (select monto from ingresos_actual)::numeric as ingresos_mes_actual,
      (select monto from ingresos_prev)::numeric as ingresos_mes_anterior
  `;

  const advisorSql = `
    with pagos_iniciales as (
      select p.venta_id, coalesce(sum(p.monto), 0)::numeric as total_inicial
      from {{SCHEMA}}.pagos p
      where p.tipo_pago = 'INICIAL'
      group by p.venta_id
    )
    select
      u.id as asesor_id,
      u.username as asesor_username,
      trim(coalesce(u.nombres,'') || ' ' || coalesce(u.apellidos,'')) as asesor_nombre,
      count(*)::int as cantidad_ventas,
      coalesce(sum(v.precio_venta), 0)::numeric as monto_vendido,
      coalesce(sum(pi.total_inicial), 0)::numeric as ingreso_inicial_generado,
      coalesce(avg(v.precio_venta), 0)::numeric as precio_promedio_venta
    from {{SCHEMA}}.ventas v
    join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
    join lateral (
      select vl.lote_id
      from {{SCHEMA}}.venta_lotes vl
      where vl.venta_id = v.id
      order by vl.orden asc, vl.created_at asc, vl.id asc
      limit 1
    ) vl_primary on true
    join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
    join {{SCHEMA}}.clientes c on c.id = v.cliente_id
    left join pagos_iniciales pi on pi.venta_id = v.id
      where (v.fecha_venta at time zone 'America/Lima')::date between $1::date and $2::date
      and v.estado_venta::text = any($3::text[])
      and ($4::uuid is null or v.asesor_id = $4::uuid)
      and ($5::text is null or upper(l.manzana) = upper($5::text))
      and ($6::text is null or c.nombre_completo ilike '%' || $6::text || '%' or l.codigo ilike '%' || $6::text || '%' or coalesce(u.nombres,'') || ' ' || coalesce(u.apellidos,'') ilike '%' || $6::text || '%')
      and ($7::text is null or l.estado_comercial::text = $7::text)
    group by u.id, u.username, u.nombres, u.apellidos
    order by cantidad_ventas desc, monto_vendido desc
  `;

  const manzanaSql = `
    with manzanas_base as (
      select
        l.manzana,
        coalesce(sum(l.precio_referencial), 0)::numeric as valor_total_mz
      from {{SCHEMA}}.lotes l
      where l.manzana is not null
        and ($5::text is null or upper(l.manzana) = upper($5::text))
        and ($6::text is null or l.estado_comercial::text = $6::text)
      group by l.manzana
    ),
    ventas_filtradas as (
      select
        v.id as venta_id,
        l.manzana,
        v.precio_venta::numeric as precio_venta
      from {{SCHEMA}}.ventas v
      join lateral (
        select vl.lote_id
        from {{SCHEMA}}.venta_lotes vl
        where vl.venta_id = v.id
        order by vl.orden asc, vl.created_at asc, vl.id asc
        limit 1
      ) vl_primary on true
      join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
      join {{SCHEMA}}.clientes c on c.id = v.cliente_id
      left join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
      where (v.fecha_venta at time zone 'America/Lima')::date between $1::date and $2::date
        and v.estado_venta::text = any($3::text[])
        and ($4::uuid is null or v.asesor_id = $4::uuid)
        and ($5::text is null or upper(l.manzana) = upper($5::text))
        and ($6::text is null or l.estado_comercial::text = $6::text)
    ),
    ventas_agg as (
      select
        vf.manzana,
        count(*)::int as cantidad_ventas,
        coalesce(avg(vf.precio_venta), 0)::numeric as precio_promedio_venta,
        coalesce(sum(vf.precio_venta), 0)::numeric as valor_vendido
      from ventas_filtradas vf
      group by vf.manzana
    ),
    cobros_agg as (
      select
        vf.manzana,
        coalesce(sum(p.monto), 0)::numeric as valor_cobrado
      from ventas_filtradas vf
      left join {{SCHEMA}}.pagos p on p.venta_id = vf.venta_id
      group by vf.manzana
    )
    select
      mb.manzana,
      coalesce(va.cantidad_ventas, 0)::int as cantidad_ventas,
      coalesce(va.precio_promedio_venta, 0)::numeric as precio_promedio_venta,
      coalesce(mb.valor_total_mz, 0)::numeric as valor_total_mz,
      coalesce(va.valor_vendido, 0)::numeric as valor_vendido,
      coalesce(ca.valor_cobrado, 0)::numeric as valor_cobrado
    from manzanas_base mb
    left join ventas_agg va on va.manzana = mb.manzana
    left join cobros_agg ca on ca.manzana = mb.manzana
    order by mb.manzana asc
  `;

  const priceControlSql = `
    select
      v.id as venta_id,
      l.codigo as lote_codigo,
      trim(coalesce(u.nombres,'') || ' ' || coalesce(u.apellidos,'')) as asesor_nombre,
      coalesce(l.precio_referencial, 0)::numeric as precio_lista,
      v.precio_venta::numeric as precio_cierre,
      greatest(coalesce(l.precio_referencial, 0) - v.precio_venta, 0)::numeric as descuento_monto,
      case
        when coalesce(l.precio_referencial, 0) <= 0 then 0
        else round(greatest(coalesce(l.precio_referencial, 0) - v.precio_venta, 0) * 100 / l.precio_referencial, 2)
      end::numeric as descuento_pct
    from {{SCHEMA}}.ventas v
    join lateral (
      select vl.lote_id
      from {{SCHEMA}}.venta_lotes vl
      where vl.venta_id = v.id
      order by vl.orden asc, vl.created_at asc, vl.id asc
      limit 1
    ) vl_primary on true
    join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
    join {{SCHEMA}}.clientes c on c.id = v.cliente_id
    left join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
    where (v.fecha_venta at time zone 'America/Lima')::date between $1::date and $2::date
      and v.estado_venta::text = any($3::text[])
      and ($4::uuid is null or v.asesor_id = $4::uuid)
      and ($5::text is null or upper(l.manzana) = upper($5::text))
      and ($6::text is null or c.nombre_completo ilike '%' || $6::text || '%' or l.codigo ilike '%' || $6::text || '%' or coalesce(u.nombres,'') || ' ' || coalesce(u.apellidos,'') ilike '%' || $6::text || '%')
      and ($7::text is null or l.estado_comercial::text = $7::text)
    order by v.fecha_venta desc
    limit 30
  `;

  const dueSql = `
    with cuotas_pagadas as (
      select p.venta_id, coalesce(sum(p.monto),0)::numeric as monto_cuotas_pagadas
      from {{SCHEMA}}.pagos p
      where p.tipo_pago = 'CUOTA'
      group by p.venta_id
    ),
    base as (
      select
        v.id as venta_id,
        coalesce(nullif(trim(coalesce(u.nombres,'') || ' ' || coalesce(u.apellidos,'')), ''), u.username, '-') as asesor_nombre,
        c.nombre_completo as cliente_nombre,
        coalesce(c.celular, '') as cliente_telefono,
        l.codigo as lote_codigo,
        v.fecha_pago_pactada as fecha_vencimiento,
        coalesce(v.monto_cuota, 0)::numeric as monto_pagar,
        greatest(coalesce(v.monto_financiado,0) - coalesce(cp.monto_cuotas_pagadas,0), 0)::numeric as monto_pendiente
      from {{SCHEMA}}.ventas v
      join {{SCHEMA}}.clientes c on c.id = v.cliente_id
      join lateral (
        select vl.lote_id
        from {{SCHEMA}}.venta_lotes vl
        where vl.venta_id = v.id
        order by vl.orden asc, vl.created_at asc, vl.id asc
        limit 1
      ) vl_primary on true
      join {{SCHEMA}}.lotes l on l.id = vl_primary.lote_id
      left join {{SCHEMA}}.usuarios u on u.id = v.asesor_id
      left join cuotas_pagadas cp on cp.venta_id = v.id
      where v.estado_venta::text = any($1::text[])
        and v.fecha_pago_pactada is not null
        and ($2::uuid is null or v.asesor_id = $2::uuid)
        and ($3::text is null or upper(l.manzana) = upper($3::text))
        and ($4::text is null or c.nombre_completo ilike '%' || $4::text || '%' or l.codigo ilike '%' || $4::text || '%' or coalesce(u.nombres,'') || ' ' || coalesce(u.apellidos,'') ilike '%' || $4::text || '%')
        and ($5::text is null or l.estado_comercial::text = $5::text)
    )
    select
      venta_id,
      asesor_nombre,
      cliente_nombre,
      cliente_telefono,
      lote_codigo,
      fecha_vencimiento,
      monto_pagar,
      monto_pendiente,
      case
        when fecha_vencimiento = (timezone('America/Lima', now())::date) then 'HOY'
        when fecha_vencimiento < (timezone('America/Lima', now())::date) then 'VENCIDO'
        when fecha_vencimiento <= (timezone('America/Lima', now())::date + interval '7 day') then 'POR_VENCER'
        else 'AL_DIA'
      end as estado
    from base
    where monto_pendiente > 0
    order by fecha_vencimiento asc
    limit 100
  `;

  const projectSummary = await queryOneSql(projectSummarySql, shared);
  const salesMonth = await queryOneSql(salesMonthSql, [filters.monthStart, filters.monthEnd, soldStates, ...shared]);
  const incomeMonth = await queryOneSql(incomeMonthSql, [filters.monthStart, filters.monthEnd, ...shared]);
  const compareRows = await queryOneSql(compareSql, [
    filters.monthStart,
    filters.monthEnd,
    soldStates,
    ...shared,
    filters.prevStart,
    filters.prevEnd,
  ]);
  const advisorPerformance = await queryRowsSql(advisorSql, [filters.monthStart, filters.monthEnd, soldStates, ...shared]);
  const manzanaSummary = await queryRowsSql(manzanaSql, [filters.monthStart, filters.monthEnd, soldStates, filters.asesorId, filters.manzana, filters.estadoLote]);
  const priceControl = await queryRowsSql(priceControlSql, [filters.monthStart, filters.monthEnd, soldStates, ...shared]);
  const dueRows = await queryRowsSql(dueSql, [activeStates, ...shared]);

  const ingresoTotalMes = Number(incomeMonth.ingresoTotalMes ?? 0);
  const valorTotalVendidoMes = Number(salesMonth.valorTotalVendidoMes ?? 0);
  const diferenciaVendidoCobradoMes = valorTotalVendidoMes - ingresoTotalMes;
  const ventasMesActual = Number(compareRows.ventasMesActual ?? 0);
  const ventasMesAnterior = Number(compareRows.ventasMesAnterior ?? 0);
  const ingresosMesActual = Number(compareRows.ingresosMesActual ?? 0);
  const ingresosMesAnterior = Number(compareRows.ingresosMesAnterior ?? 0);
  const variacionVentasPct = ventasMesAnterior > 0 ? ((ventasMesActual - ventasMesAnterior) * 100) / ventasMesAnterior : (ventasMesActual > 0 ? 100 : 0);
  const variacionIngresosPct =
    ingresosMesAnterior > 0 ? ((ingresosMesActual - ingresosMesAnterior) * 100) / ingresosMesAnterior : (ingresosMesActual > 0 ? 100 : 0);

  return {
    period: {
      year: filters.year,
      month: filters.month,
      from: filters.monthStart,
      to: filters.monthEnd,
    },
    projectSummary,
    salesMonth,
    incomeMonth: {
      ...incomeMonth,
      diferenciaVendidoCobradoMes,
    },
    monthComparison: {
      ventasMesActual,
      ventasMesAnterior,
      ingresosMesActual,
      ingresosMesAnterior,
      variacionVentasPct,
      variacionIngresosPct,
    },
    advisorPerformance,
    manzanaSummary,
    priceControl,
    collections: {
      pendingToday: dueRows.filter((row) => row.estado === "HOY"),
      dueNext7Days: dueRows.filter((row) => row.estado === "POR_VENCER"),
      overdue: dueRows.filter((row) => row.estado === "VENCIDO"),
    },
  };
};

export const getAdminDashboardExecutiveAsync = async (username, pin, query) => {
  await requireAdminUserAsync(username, pin);
  return buildAdminDashboardExecutiveDataAsync(query);
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
  const filters = buildCommonFilters(query, { allowAdvisorId: true, allowCaidaState: true });
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
