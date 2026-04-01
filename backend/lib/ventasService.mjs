import { loginAsync } from "./usuariosService.mjs";
import { toLoteId } from "./lotesService.mjs";
import { badRequest, conflict, forbidden, notFound } from "./errors.mjs";
import { resolveDbSchema, withPgClient, withPgTransaction } from "./postgres.mjs";

const VALID_SALE_STATES = new Set([
  "SEPARADA",
  "INICIAL_PAGADA",
  "CONTRATO_FIRMADO",
  "PAGANDO",
  "COMPLETADA",
  "CAIDA",
]);

const VALID_PAYMENT_TYPES = new Set(["SEPARACION", "INICIAL", "CUOTA", "OTRO"]);
const VALID_FINANCING_TYPES = new Set(["REDUCIR_CUOTA", "REDUCIR_MESES"]);
const INITIAL_PAYMENT_TYPES = new Set(["SEPARACION", "INICIAL"]);
const SALE_STATE_PRIORITY = new Map([
  ["SEPARADA", 1],
  ["INICIAL_PAGADA", 2],
  ["CONTRATO_FIRMADO", 3],
  ["PAGANDO", 4],
  ["COMPLETADA", 5],
  ["CAIDA", 6],
]);

const asTrimmed = (value) => String(value ?? "").trim();
const asUpper = (value) => asTrimmed(value).toUpperCase();
const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== "";

const asNumber = (value, fieldName) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw badRequest(`${fieldName} invalido.`);
  }
  return parsed;
};

const asPositiveNumber = (value, fieldName, allowZero = false) => {
  const parsed = asNumber(value, fieldName);
  if (parsed === null) {
    throw badRequest(`${fieldName} es obligatorio.`);
  }
  if (allowZero ? parsed < 0 : parsed <= 0) {
    throw badRequest(`${fieldName} invalido.`);
  }
  return parsed;
};

const asInteger = (value, fieldName) => {
  if (value === null || value === undefined || value === "") {
    throw badRequest(`${fieldName} invalido.`);
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    throw badRequest(`${fieldName} invalido.`);
  }
  return parsed;
};

const formatIso = (value, fieldName = "Fecha") => {
  if (!value) {
    throw badRequest(`${fieldName} invalida.`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(`${fieldName} invalida.`);
  }
  return parsed.toISOString();
};

const normalizeSaleState = (value) => {
  const normalized = asUpper(value || "SEPARADA");
  if (!VALID_SALE_STATES.has(normalized)) {
    throw badRequest("Estado de venta invalido.");
  }
  return normalized;
};

const normalizeFinancingType = (value) => {
  const normalized = asUpper(value);
  if (!VALID_FINANCING_TYPES.has(normalized)) {
    throw badRequest("Tipo de financiamiento invalido.");
  }
  return normalized;
};

const normalizePaymentType = (value) => {
  const normalized = asUpper(value);
  if (!VALID_PAYMENT_TYPES.has(normalized)) {
    throw badRequest("Tipo de pago invalido.");
  }
  return normalized;
};

const syncLoteStatusFromSaleState = (saleState) => {
  if (saleState === "SEPARADA") {
    return "SEPARADO";
  }
  if (
    saleState === "INICIAL_PAGADA" ||
    saleState === "CONTRATO_FIRMADO" ||
    saleState === "PAGANDO" ||
    saleState === "COMPLETADA"
  ) {
    return "VENDIDO";
  }
  return "DISPONIBLE";
};

const calculateFinancing = ({
  precioVenta,
  montoInicialTotal,
  tipoFinanciamiento,
  cantidadCuotas,
  montoCuota,
}) => {
  const safeInitialTotal = Math.max(0, Number(montoInicialTotal ?? 0));
  const safePrecioVenta = hasValue(precioVenta) ? asPositiveNumber(precioVenta, "Precio de venta", true) : 0;
  const montoFinanciado = Math.max(0, Number((safePrecioVenta - safeInitialTotal).toFixed(2)));
  const financingType = hasValue(tipoFinanciamiento) ? normalizeFinancingType(tipoFinanciamiento) : "REDUCIR_CUOTA";

  if (financingType === "REDUCIR_CUOTA") {
    const cuotas = hasValue(cantidadCuotas) ? asInteger(cantidadCuotas, "Cantidad de cuotas") : 12;
    if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > 36) {
      throw badRequest("Cantidad de cuotas invalida.");
    }
    return {
      montoFinanciado,
      cantidadCuotas: cuotas,
      montoCuota: cuotas > 0 ? Number((montoFinanciado / cuotas).toFixed(2)) : 0,
      tipoFinanciamiento: financingType,
    };
  }

  if (!hasValue(montoCuota)) {
    const cuotasPorDefecto = hasValue(cantidadCuotas) ? asInteger(cantidadCuotas, "Cantidad de cuotas") : 12;
    if (!Number.isInteger(cuotasPorDefecto) || cuotasPorDefecto < 1 || cuotasPorDefecto > 36) {
      throw badRequest("Cantidad de cuotas invalida.");
    }
    return {
      montoFinanciado,
      cantidadCuotas: cuotasPorDefecto,
      montoCuota: cuotasPorDefecto > 0 ? Number((montoFinanciado / cuotasPorDefecto).toFixed(2)) : 0,
      tipoFinanciamiento: financingType,
    };
  }

  const cuotaObjetivo = asPositiveNumber(montoCuota, "Monto por cuota");
  return {
    montoFinanciado,
    cantidadCuotas: Math.max(1, Math.ceil(montoFinanciado / cuotaObjetivo)),
    montoCuota: Number(cuotaObjetivo.toFixed(2)),
    tipoFinanciamiento: financingType,
  };
};

const getInitialTotalFromPayments = (payments) =>
  Number(
    (payments || [])
      .filter((payment) => payment.tipo_pago === "SEPARACION" || payment.tipo_pago === "INICIAL")
      .reduce((acc, payment) => acc + Number(payment.monto || 0), 0)
      .toFixed(2)
  );

const getPaymentsTotal = (payments) =>
  Number(
    (payments || [])
      .reduce((acc, payment) => acc + Number(payment.monto || 0), 0)
      .toFixed(2)
  );

const getStatePriority = (saleState) => SALE_STATE_PRIORITY.get(normalizeSaleState(saleState)) ?? 0;

const deriveStateFromPayments = (payments, precioVenta, currentState) => {
  const normalizedCurrentState = currentState ? normalizeSaleState(currentState) : "SEPARADA";
  const totalPaid = getPaymentsTotal(payments);
  let derivedState = "SEPARADA";

  if (totalPaid >= Number(precioVenta || 0) && Number(precioVenta || 0) > 0) {
    derivedState = "COMPLETADA";
  } else if ((payments || []).some((payment) => payment.tipo_pago === "CUOTA")) {
    derivedState = "PAGANDO";
  } else if ((payments || []).some((payment) => payment.tipo_pago === "INICIAL")) {
    derivedState = "INICIAL_PAGADA";
  }

  if (normalizedCurrentState === "CAIDA") {
    return normalizedCurrentState;
  }
  return derivedState;
};

const resolveCreateState = (requestedState, payments, precioVenta) => {
  const derivedState = deriveStateFromPayments(payments, precioVenta, "SEPARADA");
  const requested = requestedState ? normalizeSaleState(requestedState) : derivedState;

  if (requested === "CAIDA") {
    throw badRequest("No se puede crear una venta en estado CAIDA.");
  }
  if (requested === derivedState) {
    return requested;
  }
  if (getStatePriority(derivedState) > getStatePriority(requested)) {
    return derivedState;
  }
  if (requested === "CONTRATO_FIRMADO" && derivedState === "INICIAL_PAGADA") {
    return requested;
  }

  throw badRequest("El estado inicial no es coherente con los pagos registrados.");
};

const MANUAL_TRANSITIONS = new Map([
  ["SEPARADA", new Set(["CAIDA"])],
  ["INICIAL_PAGADA", new Set(["CONTRATO_FIRMADO", "CAIDA"])],
  ["CONTRATO_FIRMADO", new Set(["CAIDA"])],
  ["PAGANDO", new Set(["CAIDA"])],
  ["COMPLETADA", new Set([])],
  ["CAIDA", new Set([])],
]);

const assertValidSaleTransition = (currentState, nextState, context) => {
  const current = normalizeSaleState(currentState);
  const next = normalizeSaleState(nextState);

  if (current === next) {
    return next;
  }

  if (context.source === "manual") {
    if (context.actorRole === "admin") {
      return next;
    }
    const allowed = MANUAL_TRANSITIONS.get(current) ?? new Set();
    if (next === "CAIDA" && context.actorRole !== "admin") {
      throw forbidden("Solo un admin puede marcar una venta como caida.");
    }
    if (!allowed.has(next)) {
      throw conflict(`No se permite cambiar la venta de ${current} a ${next} manualmente.`);
    }
    return next;
  }

  if (current === "CAIDA") {
    return "CAIDA";
  }
  return next;
};

const mapPayment = (row) => ({
  id: row.id,
  fechaPago: row.fecha_pago,
  tipoPago: row.tipo_pago,
  monto: Number(row.monto ?? 0),
  nroCuota: row.nro_cuota,
  observacion: row.observacion ?? "",
  createdAt: row.created_at,
});

const mapHistory = (row) => ({
  id: row.id,
  estadoAnterior: row.estado_anterior,
  estadoNuevo: row.estado_nuevo,
  fechaCambio: row.fecha_cambio,
  usuario: row.usuario_id
    ? {
        id: row.usuario_id,
        username: row.usuarios?.username ?? "",
        nombre: `${row.usuarios?.nombres ?? ""} ${row.usuarios?.apellidos ?? ""}`.trim(),
      }
    : null,
});

const mapLot = (row) =>
  row?.lote_id
    ? {
        id: row.lote_id,
        codigo: row.lote_codigo ?? toLoteId(row.lote_manzana, row.lote_numero),
        mz: row.lote_manzana,
        lote: row.lote_numero,
        areaM2: row.lote_area_m2,
        precioReferencial: Number(row.lote_precio_referencial ?? 0),
        estadoComercial: row.lote_estado_comercial,
      }
    : null;

const mapSaleRow = (row) => ({
  id: row.id,
  fechaVenta: row.fecha_venta,
  fechaPagoPactada: row.fecha_pago_pactada ?? null,
  precioVenta: Number(row.precio_venta ?? 0),
  estadoVenta: row.estado_venta,
  tipoFinanciamiento: row.tipo_financiamiento,
  montoInicialTotal: Number(row.monto_inicial_total ?? 0),
  montoFinanciado: Number(row.monto_financiado ?? 0),
  cantidadCuotas: Number(row.cantidad_cuotas ?? 0),
  montoCuota: Number(row.monto_cuota ?? 0),
  observacion: row.observacion ?? "",
  lote: row.lotes
    ? {
        id: row.lotes.id,
        codigo: row.lotes.codigo ?? toLoteId(row.lotes.manzana, row.lotes.lote),
        mz: row.lotes.manzana,
        lote: row.lotes.lote,
        areaM2: row.lotes.area_m2,
        precioReferencial: Number(row.lotes.precio_referencial ?? 0),
        estadoComercial: row.lotes.estado_comercial,
      }
    : null,
  cliente: row.clientes
    ? {
        id: row.clientes.id,
        nombreCompleto: row.clientes.nombre_completo,
        dni: row.clientes.dni,
        celular: row.clientes.celular ?? "",
        direccion: row.clientes.direccion ?? "",
        ocupacion: row.clientes.ocupacion ?? "",
      }
    : null,
  asesor: row.usuarios
    ? {
        id: row.usuarios.id,
        username: row.usuarios.username,
        nombre: `${row.usuarios.nombres ?? ""} ${row.usuarios.apellidos ?? ""}`.trim(),
      }
    : null,
  pagos: Array.isArray(row.pagos) ? row.pagos.map(mapPayment) : [],
  historial: Array.isArray(row.venta_estado_historial) ? row.venta_estado_historial.map(mapHistory) : [],
});

const getSaleSelect = (includeDetails = false) => {
  const base = [
    "id",
    "fecha_venta",
    "fecha_pago_pactada",
    "precio_venta",
    "estado_venta",
    "tipo_financiamiento",
    "monto_inicial_total",
    "monto_financiado",
    "cantidad_cuotas",
    "monto_cuota",
    "observacion",
    "created_at",
    "updated_at",
    "lotes(id,codigo,manzana,lote,area_m2,precio_referencial,estado_comercial)",
    "clientes(id,nombre_completo,dni,celular,direccion,ocupacion)",
    "usuarios!ventas_asesor_id_fkey(id,username,nombres,apellidos)",
  ];

  if (!includeDetails) {
    return base.join(",");
  }

  return [
    ...base,
    "pagos(id,fecha_pago,tipo_pago,monto,nro_cuota,observacion,created_at)",
    "venta_estado_historial(id,estado_anterior,estado_nuevo,fecha_cambio,usuario_id,usuarios!venta_estado_historial_usuario_id_fkey(id,username,nombres,apellidos))",
  ].join(",");
};

const requireOperator = async (username, pin) => {
  const operator = await loginAsync(username, pin);
  if (!operator) {
    throw forbidden("Credenciales invalidas.");
  }
  return operator;
};

const canManageAnySale = (operator) => String(operator?.role || "").toLowerCase() === "admin";

const assertOperatorOwnsSale = (operator, saleAsesorId) => {
  if (canManageAnySale(operator)) {
    return;
  }

  if (!saleAsesorId || String(saleAsesorId) !== String(operator.id)) {
    throw forbidden("No puedes operar una venta asignada a otro asesor.");
  }
};

const resolveAsesorIdForCreate = async (client, schema, operator, saleInput) => {
  const requestedAsesorId = hasValue(saleInput?.asesorId) ? asTrimmed(saleInput.asesorId) : null;

  if (!canManageAnySale(operator)) {
    if (requestedAsesorId && requestedAsesorId !== String(operator.id)) {
      throw forbidden("No puedes crear ventas asignadas a otro asesor.");
    }
    return operator.id;
  }

  if (!requestedAsesorId) {
    return null;
  }

  const advisorResult = await client.query(
    `select id
       from ${schema}.usuarios
      where id = $1
      limit 1`,
    [requestedAsesorId]
  );

  if (!advisorResult.rows[0]) {
    throw badRequest("asesorId invalido.");
  }

  return requestedAsesorId;
};

const resolveAsesorIdForUpdate = async (client, schema, operator, existing, patchInput) => {
  const hasPatchAsesor = Object.prototype.hasOwnProperty.call(patchInput || {}, "asesorId");
  if (!hasPatchAsesor) {
    return existing.asesor_id ?? null;
  }

  const requestedAsesorId = hasValue(patchInput?.asesorId) ? asTrimmed(patchInput.asesorId) : null;
  if (!canManageAnySale(operator)) {
    if (requestedAsesorId && requestedAsesorId !== String(operator.id)) {
      throw forbidden("No puedes reasignar ventas a otro asesor.");
    }
    return operator.id;
  }

  if (!requestedAsesorId) {
    return null;
  }

  const advisorResult = await client.query(
    `select id
       from ${schema}.usuarios
      where id = $1
      limit 1`,
    [requestedAsesorId]
  );

  if (!advisorResult.rows[0]) {
    throw badRequest("asesorId invalido.");
  }

  return requestedAsesorId;
};

const getClientByDni = async (client, schema, dni) => {
  const cleanDni = asTrimmed(dni);
  if (!cleanDni) {
    throw badRequest("Falta DNI del cliente.");
  }

  const result = await client.query(
    `select id, nombre_completo, dni, celular, direccion, ocupacion
       from ${schema}.clientes
      where dni = $1
      limit 1`,
    [cleanDni]
  );

  return result.rows[0] ?? null;
};

const normalizeLotCodes = (saleInput) => {
  const codes = [];
  if (Array.isArray(saleInput?.loteCodigos)) {
    codes.push(...saleInput.loteCodigos);
  }
  if (Array.isArray(saleInput?.lotes)) {
    codes.push(
      ...saleInput.lotes.map((entry) => {
        if (typeof entry === "string") return entry;
        return entry?.codigo ?? entry?.loteCodigo ?? "";
      })
    );
  }
  if (hasValue(saleInput?.loteCodigo)) {
    codes.push(saleInput.loteCodigo);
  }

  return [...new Set(codes.map((value) => asTrimmed(value)).filter(Boolean))];
};

const ensureLoteAvailableForSale = async (client, schema, loteCodigo, excludeSaleId = null) => {
  const code = asTrimmed(loteCodigo);
  if (!code) {
    throw badRequest("Falta codigo de lote.");
  }

  const loteResult = await client.query(
    `select id, codigo, estado_comercial
       from ${schema}.lotes
      where codigo = $1
      for update`,
    [code]
  );

  const lote = loteResult.rows[0];
  if (!lote) {
    throw notFound("Lote no encontrado.");
  }

  const activeUsage = await client.query(
    `select 1
       from ${schema}.ventas v
       join ${schema}.venta_lotes vl on vl.venta_id = v.id
      where vl.lote_id = $1
        and v.estado_venta <> 'CAIDA'
        and ($2::uuid is null or v.id <> $2::uuid)
      limit 1`,
    [lote.id, excludeSaleId]
  );

  if (activeUsage.rows[0]) {
    throw conflict("Ese lote ya tiene una venta activa.");
  }

  return lote;
};

const resolveSaleLotesForMutationTx = async (client, schema, saleInput, excludeSaleId = null) => {
  const lotCodes = normalizeLotCodes(saleInput);
  if (lotCodes.length === 0) {
    return [];
  }

  const resolved = [];
  for (const lotCode of lotCodes) {
    const lote = await ensureLoteAvailableForSale(client, schema, lotCode, excludeSaleId);
    resolved.push(lote);
  }
  return resolved;
};

const upsertClientByDniTx = async (client, schema, clienteInput) => {
  const dni = asTrimmed(clienteInput?.dni);
  const nombreCompleto = asTrimmed(clienteInput?.nombreCompleto || clienteInput?.nombre);

  if (!dni) {
    throw badRequest("El DNI del cliente es obligatorio.");
  }
  if (!/^\d{8,12}$/.test(dni)) {
    throw badRequest("El DNI del cliente debe contener solo digitos y una longitud valida.");
  }
  if (!nombreCompleto) {
    throw badRequest("El nombre del cliente es obligatorio.");
  }

  const result = await client.query(
    `insert into ${schema}.clientes (nombre_completo, dni, celular, direccion, ocupacion)
     values ($1, $2, $3, $4, $5)
     on conflict (dni)
     do update set
       nombre_completo = excluded.nombre_completo,
       celular = excluded.celular,
       direccion = excluded.direccion,
       ocupacion = excluded.ocupacion
     returning id`,
    [
      nombreCompleto,
      dni,
      asTrimmed(clienteInput?.celular),
      asTrimmed(clienteInput?.direccion),
      asTrimmed(clienteInput?.ocupacion),
    ]
  );

  return result.rows[0];
};

const insertHistoryTx = async (client, schema, ventaId, previousState, nextState, usuarioId) => {
  await client.query(
    `insert into ${schema}.venta_estado_historial (venta_id, estado_anterior, estado_nuevo, usuario_id)
     values ($1, $2, $3, $4)`,
    [ventaId, previousState, nextState, usuarioId]
  );
};

const replaceSaleLotesTx = async (client, schema, ventaId, lotes = []) => {
  await client.query(`delete from ${schema}.venta_lotes where venta_id = $1`, [ventaId]);

  if (lotes.length > 0) {
    for (let index = 0; index < lotes.length; index += 1) {
      await client.query(
        `insert into ${schema}.venta_lotes (venta_id, lote_id, orden)
         values ($1, $2, $3)`,
        [ventaId, lotes[index].id, index + 1]
      );
    }
  }

};

const getSaleLotIdsTx = async (client, schema, ventaId) => {
  const result = await client.query(
    `select distinct vl.lote_id
       from ${schema}.venta_lotes vl
      where vl.venta_id = $1`,
    [ventaId]
  );

  return result.rows.map((row) => row.lote_id).filter(Boolean);
};

const syncSaleLotsCommercialStateTx = async (client, schema, ventaId, saleState) => {
  const loteIds = await getSaleLotIdsTx(client, schema, ventaId);
  if (loteIds.length === 0) {
    return;
  }
  const mappedState = syncLoteStatusFromSaleState(saleState);
  await client.query(`update ${schema}.lotes set estado_comercial = $1 where id = any($2::uuid[])`, [mappedState, loteIds]);
};

const getSalePaymentsTx = async (client, schema, ventaId) => {
  const result = await client.query(
    `select id, fecha_pago, tipo_pago, monto, nro_cuota, observacion, created_at
       from ${schema}.pagos
      where venta_id = $1
      order by fecha_pago asc, created_at asc`,
    [ventaId]
  );

  return result.rows;
};

const getSaleLotsTx = async (client, schema, ventaId) => {
  const result = await client.query(
    `select
       l.id as lote_id,
       l.codigo as lote_codigo,
       l.manzana as lote_manzana,
       l.lote as lote_numero,
       l.area_m2 as lote_area_m2,
       l.precio_referencial as lote_precio_referencial,
       l.estado_comercial as lote_estado_comercial
     from ${schema}.lotes l
     join (
       select vl.lote_id, vl.orden, vl.created_at, vl.id
         from ${schema}.venta_lotes vl
        where vl.venta_id = $1
     ) x on x.lote_id = l.id
     order by x.orden asc, x.created_at asc, x.id asc nulls last`,
    [ventaId]
  );

  return result.rows.map(mapLot).filter(Boolean);
};

const getSaleLotsBySaleIdsTx = async (client, schema, saleIds = []) => {
  if (!Array.isArray(saleIds) || saleIds.length === 0) {
    return new Map();
  }

  const result = await client.query(
    `select
       v.id as venta_id,
       l.id as lote_id,
       l.codigo as lote_codigo,
       l.manzana as lote_manzana,
       l.lote as lote_numero,
       l.area_m2 as lote_area_m2,
       l.precio_referencial as lote_precio_referencial,
       l.estado_comercial as lote_estado_comercial,
       x.orden,
       x.created_at,
       x.link_id
     from ${schema}.ventas v
     join lateral (
       select vl.lote_id, vl.orden, vl.created_at, vl.id as link_id
         from ${schema}.venta_lotes vl
        where vl.venta_id = v.id
     ) x on true
     join ${schema}.lotes l on l.id = x.lote_id
    where v.id = any($1::uuid[])
    order by v.id asc, x.orden asc, x.created_at asc, x.link_id asc nulls last`,
    [saleIds]
  );

  const grouped = new Map();
  for (const row of result.rows) {
    const mapped = mapLot(row);
    if (!mapped) continue;
    if (!grouped.has(row.venta_id)) {
      grouped.set(row.venta_id, []);
    }
    grouped.get(row.venta_id).push(mapped);
  }
  return grouped;
};

const getSaleDetail = async (saleId) => {
  const schema = resolveDbSchema();
  const id = asTrimmed(saleId);
  if (!id) {
    throw badRequest("Falta id de venta.");
  }

  return withPgClient(async (client) => {
    const saleResult = await client.query(
      `select
         v.id,
         v.fecha_venta,
         v.fecha_pago_pactada,
         v.precio_venta,
         v.estado_venta,
         v.tipo_financiamiento,
         v.monto_inicial_total,
         v.monto_financiado,
         v.cantidad_cuotas,
         v.monto_cuota,
         v.observacion,
         vl_primary.lote_id as lote_id,
         l.codigo as lote_codigo,
         l.manzana as lote_manzana,
         l.lote as lote_numero,
         l.area_m2 as lote_area_m2,
         l.precio_referencial as lote_precio_referencial,
         l.estado_comercial as lote_estado_comercial,
         c.id as cliente_id,
         c.nombre_completo as cliente_nombre_completo,
         c.dni as cliente_dni,
         c.celular as cliente_celular,
         c.direccion as cliente_direccion,
         c.ocupacion as cliente_ocupacion,
         c2.id as cliente2_id,
         c2.nombre_completo as cliente2_nombre_completo,
         c2.dni as cliente2_dni,
         c2.celular as cliente2_celular,
         c2.direccion as cliente2_direccion,
         c2.ocupacion as cliente2_ocupacion,
         u.id as asesor_id,
         u.username as asesor_username,
         u.nombres as asesor_nombres,
         u.apellidos as asesor_apellidos
       from ${schema}.ventas v
       left join lateral (
         select vl.lote_id
           from ${schema}.venta_lotes vl
          where vl.venta_id = v.id
          order by vl.orden asc, vl.created_at asc, vl.id asc
          limit 1
       ) as vl_primary on true
       left join ${schema}.lotes l on l.id = vl_primary.lote_id
       left join ${schema}.clientes c on c.id = v.cliente_id
       left join ${schema}.clientes c2 on c2.id = v.cliente2_id
       left join ${schema}.usuarios u on u.id = v.asesor_id
      where v.id = $1
      limit 1`,
      [id]
    );

    const row = saleResult.rows[0];
    if (!row) {
      throw notFound("Venta no encontrada.");
    }

    const paymentsResult = await client.query(
      `select id, fecha_pago, tipo_pago, monto, nro_cuota, observacion, created_at
         from ${schema}.pagos
        where venta_id = $1
        order by fecha_pago asc, created_at asc`,
      [id]
    );

    const historyResult = await client.query(
      `select
         h.id,
         h.estado_anterior,
         h.estado_nuevo,
         h.fecha_cambio,
         h.usuario_id,
         u.username,
         u.nombres,
         u.apellidos
       from ${schema}.venta_estado_historial h
       left join ${schema}.usuarios u on u.id = h.usuario_id
      where h.venta_id = $1
      order by h.fecha_cambio asc`,
      [id]
    );
    const lotes = await getSaleLotsTx(client, schema, id);

    return {
      id: row.id,
      fechaVenta: row.fecha_venta,
      fechaPagoPactada: row.fecha_pago_pactada ?? null,
      precioVenta: Number(row.precio_venta ?? 0),
      estadoVenta: row.estado_venta,
      tipoFinanciamiento: row.tipo_financiamiento,
      montoInicialTotal: Number(row.monto_inicial_total ?? 0),
      montoFinanciado: Number(row.monto_financiado ?? 0),
      cantidadCuotas: Number(row.cantidad_cuotas ?? 0),
      montoCuota: Number(row.monto_cuota ?? 0),
      observacion: row.observacion ?? "",
      lote: lotes[0] ?? mapLot(row),
      lotes,
      cliente: row.cliente_id
        ? {
            id: row.cliente_id,
            nombreCompleto: row.cliente_nombre_completo,
            dni: row.cliente_dni,
            celular: row.cliente_celular ?? "",
            direccion: row.cliente_direccion ?? "",
            ocupacion: row.cliente_ocupacion ?? "",
          }
        : null,
      cliente2: row.cliente2_id
        ? {
            id: row.cliente2_id,
            nombreCompleto: row.cliente2_nombre_completo,
            dni: row.cliente2_dni,
            celular: row.cliente2_celular ?? "",
            direccion: row.cliente2_direccion ?? "",
            ocupacion: row.cliente2_ocupacion ?? "",
          }
        : null,
      asesor: row.asesor_id
        ? {
            id: row.asesor_id,
            username: row.asesor_username,
            nombre: `${row.asesor_nombres ?? ""} ${row.asesor_apellidos ?? ""}`.trim(),
          }
        : null,
      pagos: paymentsResult.rows.map(mapPayment),
      historial: historyResult.rows.map((historyRow) =>
        mapHistory({
          ...historyRow,
          usuarios: {
            username: historyRow.username,
            nombres: historyRow.nombres,
            apellidos: historyRow.apellidos,
          },
        })
      ),
    };
  });
};

const getSaleBaseByIdTx = async (client, schema, saleId) => {
  const id = asTrimmed(saleId);
  if (!id) {
    throw badRequest("Falta id de venta.");
  }

  const result = await client.query(
    `select
       v.id,
       v.cliente_id,
       v.cliente2_id,
       v.asesor_id,
       v.precio_venta,
       v.estado_venta,
       v.tipo_financiamiento,
       v.monto_inicial_total,
       v.monto_financiado,
       v.cantidad_cuotas,
       v.monto_cuota,
       v.observacion,
       v.fecha_venta,
       v.fecha_pago_pactada
     from ${schema}.ventas v
     left join lateral (
       select vl.lote_id
         from ${schema}.venta_lotes vl
        where vl.venta_id = v.id
        order by vl.orden asc, vl.created_at asc, vl.id asc
        limit 1
     ) as vl_primary on true
    where v.id = $1
    for update of v`,
    [id]
  );

  const sale = result.rows[0];
  if (!sale) {
    throw notFound("Venta no encontrada.");
  }
  return sale;
};

const buildInitialPaymentsPayload = (payments = []) =>
  (payments || [])
    .filter((payment) => hasValue(payment?.monto))
    .map((payment) => {
    const tipoPago = normalizePaymentType(payment.tipoPago);
    if (!INITIAL_PAYMENT_TYPES.has(tipoPago)) {
      throw badRequest("Solo se permiten pagos iniciales de tipo SEPARACION o INICIAL al crear la venta.");
    }

    return {
      fecha_pago: formatIso(payment.fechaPago, "Fecha de pago"),
      tipo_pago: tipoPago,
      monto: asPositiveNumber(payment.monto, "Monto de pago"),
      nro_cuota:
        payment.nroCuota === null || payment.nroCuota === undefined || payment.nroCuota === ""
          ? null
          : asInteger(payment.nroCuota, "Numero de cuota"),
      observacion: asTrimmed(payment.observacion),
    };
    });

const buildPaymentPayload = (paymentInput) => {
  const tipoPago = normalizePaymentType(paymentInput?.tipoPago);
  const payload = {
    fecha_pago: formatIso(paymentInput?.fechaPago, "Fecha de pago"),
    tipo_pago: tipoPago,
    monto: asPositiveNumber(paymentInput?.monto, "Monto de pago"),
    nro_cuota:
      paymentInput?.nroCuota === null || paymentInput?.nroCuota === undefined || paymentInput?.nroCuota === ""
        ? null
        : asInteger(paymentInput?.nroCuota, "Numero de cuota"),
    observacion: asTrimmed(paymentInput?.observacion),
  };

  if (tipoPago === "CUOTA" && payload.nro_cuota === null) {
    throw badRequest("El numero de cuota es obligatorio para pagos de cuota.");
  }

  return payload;
};

const assertSaleAcceptsPayments = (sale) => {
  if (sale.estado_venta === "CAIDA") {
    throw conflict("No se pueden registrar pagos en una venta caida.");
  }
  if (sale.estado_venta === "COMPLETADA") {
    throw conflict("No se pueden registrar pagos en una venta completada.");
  }
};

const rethrowMutationError = (error) => {
  if (error?.code === "23505" && String(error?.constraint || "").includes("ventas_lote_activa_unique_idx")) {
    throw conflict("Ese lote ya tiene una venta activa.");
  }
  if (error?.code === "23505" && String(error?.constraint || "").includes("venta_lotes_lote_activo_unique")) {
    throw conflict("Uno de los lotes seleccionados ya tiene una venta activa.");
  }
  if (error?.code === "23505" && String(error?.constraint || "").toLowerCase().includes("clientes_dni")) {
    throw conflict("Ya existe un cliente con ese DNI.");
  }
  if (error?.code === "23514") {
    throw badRequest("Los datos enviados no cumplen las reglas de integridad de la venta.");
  }
  throw error;
};

export const findClientByDniAsync = async (username, pin, dni) => {
  await requireOperator(username, pin);
  const schema = resolveDbSchema();
  const client = await withPgClient((pgClient) => getClientByDni(pgClient, schema, dni));
  if (!client) return null;
  return {
    id: client.id,
    nombreCompleto: client.nombre_completo,
    dni: client.dni,
    celular: client.celular ?? "",
    direccion: client.direccion ?? "",
    ocupacion: client.ocupacion ?? "",
  };
};

export const listSalesAsync = async (username, pin) => {
  const operator = await requireOperator(username, pin);
  const schema = resolveDbSchema();

  try {
    return await withPgClient(async (client) => {
      const scopedByAsesor = !canManageAnySale(operator);
      const result = await client.query(
        `select
           v.id,
           v.fecha_venta,
           v.fecha_pago_pactada,
           v.precio_venta,
           v.estado_venta,
           v.tipo_financiamiento,
           v.monto_inicial_total,
         v.monto_financiado,
         v.cantidad_cuotas,
         v.monto_cuota,
         v.observacion,
           vl_primary.lote_id as lote_id,
           l.codigo as lote_codigo,
           l.manzana as lote_manzana,
           l.lote as lote_numero,
           l.area_m2 as lote_area_m2,
           l.precio_referencial as lote_precio_referencial,
           l.estado_comercial as lote_estado_comercial,
           c.id as cliente_id,
           c.nombre_completo as cliente_nombre_completo,
           c.dni as cliente_dni,
           c.celular as cliente_celular,
           c.direccion as cliente_direccion,
           c.ocupacion as cliente_ocupacion,
           u.id as asesor_id,
           u.username as asesor_username,
           u.nombres as asesor_nombres,
           u.apellidos as asesor_apellidos
         from ${schema}.ventas v
         left join lateral (
           select vl.lote_id
             from ${schema}.venta_lotes vl
            where vl.venta_id = v.id
            order by vl.orden asc, vl.created_at asc, vl.id asc
            limit 1
         ) as vl_primary on true
         left join ${schema}.lotes l on l.id = vl_primary.lote_id
         left join ${schema}.clientes c on c.id = v.cliente_id
         left join ${schema}.usuarios u on u.id = v.asesor_id
        ${scopedByAsesor ? "where v.asesor_id = $1 and v.estado_venta <> 'CAIDA'" : ""}
         order by v.fecha_venta desc, v.created_at desc`
        ,
        scopedByAsesor ? [operator.id] : []
      );
      const saleIds = result.rows.map((row) => row.id).filter(Boolean);
      const lotsBySaleId = await getSaleLotsBySaleIdsTx(client, schema, saleIds);

      return result.rows.map((row) => ({
        id: row.id,
        fechaVenta: row.fecha_venta,
        fechaPagoPactada: row.fecha_pago_pactada ?? null,
        precioVenta: Number(row.precio_venta ?? 0),
        estadoVenta: row.estado_venta,
        tipoFinanciamiento: row.tipo_financiamiento,
        montoInicialTotal: Number(row.monto_inicial_total ?? 0),
        montoFinanciado: Number(row.monto_financiado ?? 0),
        cantidadCuotas: Number(row.cantidad_cuotas ?? 0),
        montoCuota: Number(row.monto_cuota ?? 0),
        observacion: row.observacion ?? "",
        lote: (lotsBySaleId.get(row.id) ?? [])[0] ?? mapLot(row),
        lotes: lotsBySaleId.get(row.id) ?? (mapLot(row) ? [mapLot(row)] : []),
        cliente: row.cliente_id
          ? {
              id: row.cliente_id,
              nombreCompleto: row.cliente_nombre_completo,
              dni: row.cliente_dni,
              celular: row.cliente_celular ?? "",
              direccion: row.cliente_direccion ?? "",
              ocupacion: row.cliente_ocupacion ?? "",
            }
          : null,
        cliente2: null,
        asesor: row.asesor_id
          ? {
              id: row.asesor_id,
              username: row.asesor_username,
              nombre: `${row.asesor_nombres ?? ""} ${row.asesor_apellidos ?? ""}`.trim(),
            }
          : null,
        pagos: [],
        historial: [],
      }));
    });
  } catch (error) {
    console.error("SQL listSalesAsync error:", error);
    if (error?.message) {
      throw badRequest(error.message);
    }
    throw badRequest("No se pudo listar ventas.");
  }
};

export const listSaleAccessByLotAsync = async (username, pin) => {
  await requireOperator(username, pin);
  const schema = resolveDbSchema();

  try {
    return await withPgClient(async (client) => {
      const result = await client.query(
        `select v.id,
                l.codigo as lote_codigo,
                u.username as asesor_username,
                vl.orden as lote_orden,
                vl.created_at as lote_link_created_at
           from ${schema}.ventas v
           join ${schema}.venta_lotes vl on vl.venta_id = v.id
           join ${schema}.lotes l on l.id = vl.lote_id
      left join ${schema}.usuarios u on u.id = v.asesor_id
          where v.estado_venta <> 'CAIDA'
          order by v.created_at desc, v.fecha_venta desc, vl.orden asc, vl.created_at asc`
      );

      return result.rows.reduce((acc, row) => {
        const loteCode = row.lote_codigo;
        if (!loteCode || acc.some((item) => item.loteCodigo === loteCode)) {
          return acc;
        }
        acc.push({
          loteCodigo: loteCode,
          saleId: row.id,
          ownerUsername: row.asesor_username?.trim().toLowerCase() ?? null,
        });
        return acc;
      }, []);
    });
  } catch (error) {
    console.error("SQL listSaleAccessByLotAsync error:", error);
    if (error?.message) {
      throw badRequest(error.message);
    }
    throw badRequest("No se pudo listar accesos de ventas por lote.");
  }
};

export const getSaleByIdAsync = async (username, pin, saleId) => {
  const operator = await requireOperator(username, pin);
  const sale = await getSaleDetail(saleId);
  if (sale.estadoVenta === "CAIDA" && !canManageAnySale(operator)) {
    throw forbidden("No puedes abrir el detalle de una venta caida.");
  }
  assertOperatorOwnsSale(operator, sale.asesor?.id ?? null);
  return sale;
};

export const createSaleAsync = async (username, pin, saleInput) => {
  const operator = await requireOperator(username, pin);
  const schema = resolveDbSchema();

  const initialPayments = buildInitialPaymentsPayload(saleInput?.pagosIniciales ?? []);
  const montoInicialTotal = getInitialTotalFromPayments(initialPayments);
  const finalState = resolveCreateState(saleInput?.estadoVenta, initialPayments, saleInput?.precioVenta);
  const financing = calculateFinancing({
    precioVenta: saleInput?.precioVenta,
    montoInicialTotal,
    tipoFinanciamiento: saleInput?.tipoFinanciamiento,
    cantidadCuotas: saleInput?.cantidadCuotas,
    montoCuota: saleInput?.montoCuota,
  });

  let saleId;
  try {
    saleId = await withPgTransaction(async (client) => {
      const lotes = await resolveSaleLotesForMutationTx(client, schema, saleInput);
      const lotePrincipal = lotes[0] ?? null;
      const cliente =
        hasValue(saleInput?.cliente?.dni) && hasValue(saleInput?.cliente?.nombreCompleto)
          ? await upsertClientByDniTx(client, schema, saleInput?.cliente ?? {})
          : null;
      const cliente2 =
        hasValue(saleInput?.cliente2?.dni) && hasValue(saleInput?.cliente2?.nombreCompleto)
          ? await upsertClientByDniTx(client, schema, saleInput.cliente2)
          : null;

      if (cliente2?.id && cliente?.id && cliente2.id === cliente.id) {
        throw badRequest("El segundo titular debe ser distinto al titular principal.");
      }

      const saleResult = await client.query(
        `insert into ${schema}.ventas (
           cliente_id,
           cliente2_id,
           asesor_id,
           fecha_venta,
           fecha_pago_pactada,
           precio_venta,
           estado_venta,
           tipo_financiamiento,
           monto_inicial_total,
           monto_financiado,
           cantidad_cuotas,
           monto_cuota,
           observacion
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          returning id`,
        [
          cliente?.id ?? null,
          cliente2?.id ?? null,
          await resolveAsesorIdForCreate(client, schema, operator, saleInput),
          formatIso(saleInput?.fechaVenta, "Fecha de venta"),
          hasValue(saleInput?.fechaPagoPactada) ? formatIso(saleInput?.fechaPagoPactada, "Fecha de pago pactada") : null,
          hasValue(saleInput?.precioVenta) ? asPositiveNumber(saleInput?.precioVenta, "Precio de venta", true) : 0,
          finalState,
          financing.tipoFinanciamiento,
          montoInicialTotal,
          financing.montoFinanciado,
          financing.cantidadCuotas,
          financing.montoCuota,
          asTrimmed(saleInput?.observacion),
        ]
      );

      const createdSale = saleResult.rows[0];
      await replaceSaleLotesTx(client, schema, createdSale.id, lotes);

      if (initialPayments.length > 0) {
        for (const payment of initialPayments) {
          await client.query(
            `insert into ${schema}.pagos (venta_id, fecha_pago, tipo_pago, monto, nro_cuota, observacion)
             values ($1, $2, $3, $4, $5, $6)`,
            [createdSale.id, payment.fecha_pago, payment.tipo_pago, payment.monto, payment.nro_cuota, payment.observacion]
          );
        }
      }

      await insertHistoryTx(client, schema, createdSale.id, null, finalState, operator.id);
      await syncSaleLotsCommercialStateTx(client, schema, createdSale.id, finalState);

      return createdSale.id;
    });
  } catch (error) {
    rethrowMutationError(error);
  }

  return getSaleDetail(saleId);
};

export const updateSaleAsync = async (username, pin, saleId, patchInput) => {
  const operator = await requireOperator(username, pin);
  const schema = resolveDbSchema();

  let updatedSaleId;
  try {
    updatedSaleId = await withPgTransaction(async (client) => {
      const existing = await getSaleBaseByIdTx(client, schema, saleId);
      if (existing.estado_venta === "CAIDA" && !canManageAnySale(operator)) {
        throw forbidden("Solo admin puede editar una venta caida.");
      }
      assertOperatorOwnsSale(operator, existing.asesor_id);
      const payments = await getSalePaymentsTx(client, schema, existing.id);
      const montoInicialTotal = getInitialTotalFromPayments(payments);
      const asesorId = await resolveAsesorIdForUpdate(client, schema, operator, existing, patchInput);
      const hasLotesPatch =
        Object.prototype.hasOwnProperty.call(patchInput || {}, "loteCodigo") ||
        Object.prototype.hasOwnProperty.call(patchInput || {}, "loteCodigos") ||
        Object.prototype.hasOwnProperty.call(patchInput || {}, "lotes");
      const lotes = hasLotesPatch
        ? await resolveSaleLotesForMutationTx(client, schema, patchInput, existing.id)
        : [];

      let clienteId = existing.cliente_id;
      if (patchInput?.cliente?.dni) {
        const updatedClient = await upsertClientByDniTx(client, schema, patchInput.cliente);
        clienteId = updatedClient.id;
      }

      let cliente2Id = existing.cliente2_id ?? null;
      if (patchInput?.cliente2 === null) {
        cliente2Id = null;
      } else if (patchInput?.cliente2?.dni && patchInput?.cliente2?.nombreCompleto) {
        const updatedClient2 = await upsertClientByDniTx(client, schema, patchInput.cliente2);
        cliente2Id = updatedClient2.id;
      }

      if (cliente2Id && cliente2Id === clienteId) {
        throw badRequest("El segundo titular debe ser distinto al titular principal.");
      }

      const requestedState =
        patchInput?.estadoVenta !== undefined
          ? normalizeSaleState(patchInput.estadoVenta)
          : existing.estado_venta;
      const nextState = assertValidSaleTransition(existing.estado_venta, requestedState, {
        actorRole: operator.role,
        source: "manual",
      });

      const financing = calculateFinancing({
        precioVenta: patchInput?.precioVenta ?? existing.precio_venta,
        montoInicialTotal,
        tipoFinanciamiento: patchInput?.tipoFinanciamiento ?? existing.tipo_financiamiento,
        cantidadCuotas: patchInput?.cantidadCuotas ?? existing.cantidad_cuotas,
        montoCuota: patchInput?.montoCuota ?? existing.monto_cuota,
      });

      await client.query(
        `update ${schema}.ventas
            set asesor_id = $2,
                cliente_id = $3,
                cliente2_id = $4,
                fecha_venta = $5,
                fecha_pago_pactada = $6,
                precio_venta = $7,
                estado_venta = $8,
                tipo_financiamiento = $9,
                monto_inicial_total = $10,
                monto_financiado = $11,
                cantidad_cuotas = $12,
                monto_cuota = $13,
                observacion = $14
          where id = $1`,
        [
          existing.id,
          asesorId,
          clienteId,
          cliente2Id,
          patchInput?.fechaVenta ? formatIso(patchInput.fechaVenta, "Fecha de venta") : existing.fecha_venta,
          Object.prototype.hasOwnProperty.call(patchInput || {}, "fechaPagoPactada")
            ? hasValue(patchInput?.fechaPagoPactada)
              ? formatIso(patchInput?.fechaPagoPactada, "Fecha de pago pactada")
              : null
            : existing.fecha_pago_pactada,
          patchInput?.precioVenta !== undefined
            ? asPositiveNumber(patchInput.precioVenta, "Precio de venta", true)
            : Number(existing.precio_venta),
          nextState,
          financing.tipoFinanciamiento,
          montoInicialTotal,
          financing.montoFinanciado,
          financing.cantidadCuotas,
          financing.montoCuota,
          patchInput?.observacion !== undefined ? asTrimmed(patchInput.observacion) : existing.observacion ?? "",
        ]
      );

      if (hasLotesPatch) {
        await replaceSaleLotesTx(client, schema, existing.id, lotes);
      }

      if (existing.estado_venta !== nextState) {
        await insertHistoryTx(client, schema, existing.id, existing.estado_venta, nextState, operator.id);
      }

      await syncSaleLotsCommercialStateTx(client, schema, existing.id, nextState);
      return existing.id;
    });
  } catch (error) {
    rethrowMutationError(error);
  }

  return getSaleDetail(updatedSaleId);
};

export const addSalePaymentAsync = async (username, pin, saleId, paymentInput) => {
  const operator = await requireOperator(username, pin);
  const schema = resolveDbSchema();
  const paymentPayload = buildPaymentPayload(paymentInput);

  let updatedSaleId;
  try {
    updatedSaleId = await withPgTransaction(async (client) => {
      const existing = await getSaleBaseByIdTx(client, schema, saleId);
      assertOperatorOwnsSale(operator, existing.asesor_id);
      assertSaleAcceptsPayments(existing);

      await client.query(
        `insert into ${schema}.pagos (venta_id, fecha_pago, tipo_pago, monto, nro_cuota, observacion)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          existing.id,
          paymentPayload.fecha_pago,
          paymentPayload.tipo_pago,
          paymentPayload.monto,
          paymentPayload.nro_cuota,
          paymentPayload.observacion,
        ]
      );

      const payments = await getSalePaymentsTx(client, schema, existing.id);
      const montoInicialTotal = getInitialTotalFromPayments(payments);
      const derivedState = deriveStateFromPayments(payments, existing.precio_venta, existing.estado_venta);
      const nextState = assertValidSaleTransition(existing.estado_venta, derivedState, {
        actorRole: operator.role,
        source: "payment",
      });

      const financing = calculateFinancing({
        precioVenta: existing.precio_venta,
        montoInicialTotal,
        tipoFinanciamiento: existing.tipo_financiamiento,
        cantidadCuotas: existing.cantidad_cuotas,
        montoCuota: existing.monto_cuota,
      });

      await client.query(
        `update ${schema}.ventas
            set monto_inicial_total = $2,
                monto_financiado = $3,
                cantidad_cuotas = $4,
                monto_cuota = $5,
                estado_venta = $6
          where id = $1`,
        [
          existing.id,
          montoInicialTotal,
          financing.montoFinanciado,
          financing.cantidadCuotas,
          financing.montoCuota,
          nextState,
        ]
      );

      if (existing.estado_venta !== nextState) {
        await insertHistoryTx(client, schema, existing.id, existing.estado_venta, nextState, operator.id);
      }

      await syncSaleLotsCommercialStateTx(client, schema, existing.id, nextState);
      return existing.id;
    });
  } catch (error) {
    rethrowMutationError(error);
  }

  return getSaleDetail(updatedSaleId);
};

export const updateSalePaymentAsync = async (username, pin, saleId, paymentId, paymentInput) => {
  const operator = await requireOperator(username, pin);
  const schema = resolveDbSchema();
  const paymentPayload = buildPaymentPayload(paymentInput);
  const paymentRowId = asTrimmed(paymentId);
  if (!paymentRowId) {
    throw badRequest("Falta id del pago.");
  }

  let updatedSaleId;
  try {
    updatedSaleId = await withPgTransaction(async (client) => {
      const existing = await getSaleBaseByIdTx(client, schema, saleId);
      assertOperatorOwnsSale(operator, existing.asesor_id);
      assertSaleAcceptsPayments(existing);

      const paymentExists = await client.query(
        `select id
           from ${schema}.pagos
          where id = $1
            and venta_id = $2
          for update`,
        [paymentRowId, existing.id]
      );

      if (!paymentExists.rows[0]) {
        throw notFound("Pago no encontrado para la venta.");
      }

      await client.query(
        `update ${schema}.pagos
            set fecha_pago = $3,
                tipo_pago = $4,
                monto = $5,
                nro_cuota = $6,
                observacion = $7
          where id = $1
            and venta_id = $2`,
        [
          paymentRowId,
          existing.id,
          paymentPayload.fecha_pago,
          paymentPayload.tipo_pago,
          paymentPayload.monto,
          paymentPayload.nro_cuota,
          paymentPayload.observacion,
        ]
      );

      const payments = await getSalePaymentsTx(client, schema, existing.id);
      const montoInicialTotal = getInitialTotalFromPayments(payments);
      const derivedState = deriveStateFromPayments(payments, existing.precio_venta, existing.estado_venta);
      const nextState = assertValidSaleTransition(existing.estado_venta, derivedState, {
        actorRole: operator.role,
        source: "payment",
      });

      const financing = calculateFinancing({
        precioVenta: existing.precio_venta,
        montoInicialTotal,
        tipoFinanciamiento: existing.tipo_financiamiento,
        cantidadCuotas: existing.cantidad_cuotas,
        montoCuota: existing.monto_cuota,
      });

      await client.query(
        `update ${schema}.ventas
            set monto_inicial_total = $2,
                monto_financiado = $3,
                cantidad_cuotas = $4,
                monto_cuota = $5,
                estado_venta = $6
          where id = $1`,
        [
          existing.id,
          montoInicialTotal,
          financing.montoFinanciado,
          financing.cantidadCuotas,
          financing.montoCuota,
          nextState,
        ]
      );

      if (existing.estado_venta !== nextState) {
        await insertHistoryTx(client, schema, existing.id, existing.estado_venta, nextState, operator.id);
      }

      await syncSaleLotsCommercialStateTx(client, schema, existing.id, nextState);
      return existing.id;
    });
  } catch (error) {
    rethrowMutationError(error);
  }

  return getSaleDetail(updatedSaleId);
};

export const deleteSalePaymentAsync = async (username, pin, saleId, paymentId) => {
  const operator = await requireOperator(username, pin);
  const schema = resolveDbSchema();
  const paymentRowId = asTrimmed(paymentId);
  if (!paymentRowId) {
    throw badRequest("Falta id del pago.");
  }
  if (!canManageAnySale(operator)) {
    throw forbidden("Solo admin puede eliminar pagos.");
  }

  let updatedSaleId;
  try {
    updatedSaleId = await withPgTransaction(async (client) => {
      const existing = await getSaleBaseByIdTx(client, schema, saleId);

      const paymentExists = await client.query(
        `select id
           from ${schema}.pagos
          where id = $1
            and venta_id = $2
          for update`,
        [paymentRowId, existing.id]
      );
      if (!paymentExists.rows[0]) {
        throw notFound("Pago no encontrado para la venta.");
      }

      await client.query(
        `delete from ${schema}.pagos
          where id = $1
            and venta_id = $2`,
        [paymentRowId, existing.id]
      );

      const payments = await getSalePaymentsTx(client, schema, existing.id);
      const montoInicialTotal = getInitialTotalFromPayments(payments);
      const derivedState = deriveStateFromPayments(payments, existing.precio_venta, existing.estado_venta);
      const nextState = assertValidSaleTransition(existing.estado_venta, derivedState, {
        actorRole: operator.role,
        source: "payment",
      });

      const financing = calculateFinancing({
        precioVenta: existing.precio_venta,
        montoInicialTotal,
        tipoFinanciamiento: existing.tipo_financiamiento,
        cantidadCuotas: existing.cantidad_cuotas,
        montoCuota: existing.monto_cuota,
      });

      await client.query(
        `update ${schema}.ventas
            set monto_inicial_total = $2,
                monto_financiado = $3,
                cantidad_cuotas = $4,
                monto_cuota = $5,
                estado_venta = $6
          where id = $1`,
        [
          existing.id,
          montoInicialTotal,
          financing.montoFinanciado,
          financing.cantidadCuotas,
          financing.montoCuota,
          nextState,
        ]
      );

      if (existing.estado_venta !== nextState) {
        await insertHistoryTx(client, schema, existing.id, existing.estado_venta, nextState, operator.id);
      }

      await syncSaleLotsCommercialStateTx(client, schema, existing.id, nextState);
      return existing.id;
    });
  } catch (error) {
    rethrowMutationError(error);
  }

  return getSaleDetail(updatedSaleId);
};
