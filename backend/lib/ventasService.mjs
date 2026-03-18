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

const asTrimmed = (value) => String(value ?? "").trim();
const asUpper = (value) => asTrimmed(value).toUpperCase();

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
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    throw badRequest(`${fieldName} invalido.`);
  }
  return parsed;
};

const formatIso = (value, fieldName = "Fecha") => {
  if (!value) return new Date().toISOString();
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
  const safePrecioVenta = asPositiveNumber(precioVenta, "Precio de venta", true);
  const montoFinanciado = Math.max(0, Number((safePrecioVenta - safeInitialTotal).toFixed(2)));
  const financingType = normalizeFinancingType(tipoFinanciamiento);

  if (financingType === "REDUCIR_CUOTA") {
    const cuotas = asInteger(cantidadCuotas, "Cantidad de cuotas");
    if (cuotas < 1 || cuotas > 36) {
      throw badRequest("Cantidad de cuotas invalida.");
    }
    return {
      montoFinanciado,
      cantidadCuotas: cuotas,
      montoCuota: Number((montoFinanciado / cuotas).toFixed(2)),
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

const deriveStateFromPayments = (payments, precioVenta, currentState) => {
  const totalPaid = getPaymentsTotal(payments);
  if (totalPaid >= Number(precioVenta || 0) && Number(precioVenta || 0) > 0) {
    return "COMPLETADA";
  }
  if ((payments || []).some((payment) => payment.tipo_pago === "CUOTA")) {
    return "PAGANDO";
  }
  if ((payments || []).some((payment) => payment.tipo_pago === "INICIAL")) {
    return "INICIAL_PAGADA";
  }
  if ((payments || []).some((payment) => payment.tipo_pago === "SEPARACION")) {
    return "SEPARADA";
  }
  return currentState ?? "SEPARADA";
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

const PAYMENT_TRANSITIONS = new Map([
  ["SEPARADA", new Set(["SEPARADA", "INICIAL_PAGADA", "PAGANDO", "COMPLETADA"])],
  ["INICIAL_PAGADA", new Set(["INICIAL_PAGADA", "PAGANDO", "COMPLETADA"])],
  ["CONTRATO_FIRMADO", new Set(["CONTRATO_FIRMADO", "PAGANDO", "COMPLETADA"])],
  ["PAGANDO", new Set(["PAGANDO", "COMPLETADA"])],
  ["COMPLETADA", new Set(["COMPLETADA"])],
  ["CAIDA", new Set(["CAIDA"])],
]);

const assertValidSaleTransition = (currentState, nextState, context) => {
  const current = normalizeSaleState(currentState);
  const next = normalizeSaleState(nextState);

  if (current === next) {
    return next;
  }

  if (context.source === "manual") {
    const allowed = MANUAL_TRANSITIONS.get(current) ?? new Set();
    if (next === "CAIDA" && context.actorRole !== "admin") {
      throw forbidden("Solo un admin puede marcar una venta como caida.");
    }
    if (!allowed.has(next)) {
      throw conflict(`No se permite cambiar la venta de ${current} a ${next} manualmente.`);
    }
    return next;
  }

  const allowed = PAYMENT_TRANSITIONS.get(current) ?? new Set();
  if (!allowed.has(next)) {
    throw conflict(`Los pagos no permiten mover la venta de ${current} a ${next}.`);
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

const mapSaleRow = (row) => ({
  id: row.id,
  fechaVenta: row.fecha_venta,
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

const ensureLoteAvailableForSale = async (client, schema, loteCodigo) => {
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

  if (String(lote.estado_comercial || "").toUpperCase() !== "DISPONIBLE") {
    throw conflict(`El lote ${code} no esta disponible para una nueva venta.`);
  }

  const activeSaleResult = await client.query(
    `select id
       from ${schema}.ventas
      where lote_id = $1
        and estado_venta <> 'CAIDA'
      limit 1`,
    [lote.id]
  );

  if (activeSaleResult.rows[0]) {
    throw conflict("Ese lote ya tiene una venta activa.");
  }

  return lote;
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

const syncLoteCommercialStateTx = async (client, schema, loteId, saleState) => {
  const mappedState = syncLoteStatusFromSaleState(saleState);
  await client.query(`update ${schema}.lotes set estado_comercial = $1 where id = $2`, [mappedState, loteId]);
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
         v.precio_venta,
         v.estado_venta,
         v.tipo_financiamiento,
         v.monto_inicial_total,
         v.monto_financiado,
         v.cantidad_cuotas,
         v.monto_cuota,
         v.observacion,
         l.id as lote_id,
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
       left join ${schema}.lotes l on l.id = v.lote_id
       left join ${schema}.clientes c on c.id = v.cliente_id
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

    return {
      id: row.id,
      fechaVenta: row.fecha_venta,
      precioVenta: Number(row.precio_venta ?? 0),
      estadoVenta: row.estado_venta,
      tipoFinanciamiento: row.tipo_financiamiento,
      montoInicialTotal: Number(row.monto_inicial_total ?? 0),
      montoFinanciado: Number(row.monto_financiado ?? 0),
      cantidadCuotas: Number(row.cantidad_cuotas ?? 0),
      montoCuota: Number(row.monto_cuota ?? 0),
      observacion: row.observacion ?? "",
      lote: row.lote_id
        ? {
            id: row.lote_id,
            codigo: row.lote_codigo ?? toLoteId(row.lote_manzana, row.lote_numero),
            mz: row.lote_manzana,
            lote: row.lote_numero,
            areaM2: row.lote_area_m2,
            precioReferencial: Number(row.lote_precio_referencial ?? 0),
            estadoComercial: row.lote_estado_comercial,
          }
        : null,
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
    `select id, lote_id, cliente_id, asesor_id, precio_venta, estado_venta, tipo_financiamiento,
            monto_inicial_total, monto_financiado, cantidad_cuotas, monto_cuota, observacion, fecha_venta
       from ${schema}.ventas
      where id = $1
      for update`,
    [id]
  );

  const sale = result.rows[0];
  if (!sale) {
    throw notFound("Venta no encontrada.");
  }
  return sale;
};

const buildInitialPaymentsPayload = (payments = []) =>
  (payments || []).map((payment) => {
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
  await requireOperator(username, pin);
  const schema = resolveDbSchema();

  try {
    return await withPgClient(async (client) => {
      const result = await client.query(
        `select
           v.id,
           v.fecha_venta,
           v.precio_venta,
           v.estado_venta,
           v.tipo_financiamiento,
           v.monto_inicial_total,
           v.monto_financiado,
           v.cantidad_cuotas,
           v.monto_cuota,
           v.observacion,
           l.id as lote_id,
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
         left join ${schema}.lotes l on l.id = v.lote_id
         left join ${schema}.clientes c on c.id = v.cliente_id
         left join ${schema}.usuarios u on u.id = v.asesor_id
         order by v.fecha_venta desc, v.created_at desc`
      );

      return result.rows.map((row) => ({
        id: row.id,
        fechaVenta: row.fecha_venta,
        precioVenta: Number(row.precio_venta ?? 0),
        estadoVenta: row.estado_venta,
        tipoFinanciamiento: row.tipo_financiamiento,
        montoInicialTotal: Number(row.monto_inicial_total ?? 0),
        montoFinanciado: Number(row.monto_financiado ?? 0),
        cantidadCuotas: Number(row.cantidad_cuotas ?? 0),
        montoCuota: Number(row.monto_cuota ?? 0),
        observacion: row.observacion ?? "",
        lote: row.lote_id
          ? {
              id: row.lote_id,
              codigo: row.lote_codigo ?? toLoteId(row.lote_manzana, row.lote_numero),
              mz: row.lote_manzana,
              lote: row.lote_numero,
              areaM2: row.lote_area_m2,
              precioReferencial: Number(row.lote_precio_referencial ?? 0),
              estadoComercial: row.lote_estado_comercial,
            }
          : null,
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

export const getSaleByIdAsync = async (username, pin, saleId) => {
  await requireOperator(username, pin);
  return getSaleDetail(saleId);
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
      const lote = await ensureLoteAvailableForSale(client, schema, saleInput?.loteCodigo);
      const cliente = await upsertClientByDniTx(client, schema, saleInput?.cliente ?? {});

      const saleResult = await client.query(
        `insert into ${schema}.ventas (
           lote_id,
           cliente_id,
           asesor_id,
           fecha_venta,
           precio_venta,
           estado_venta,
           tipo_financiamiento,
           monto_inicial_total,
           monto_financiado,
           cantidad_cuotas,
           monto_cuota,
           observacion
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         returning id`,
        [
          lote.id,
          cliente.id,
          operator.id,
          formatIso(saleInput?.fechaVenta, "Fecha de venta"),
          asPositiveNumber(saleInput?.precioVenta, "Precio de venta", true),
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
      await syncLoteCommercialStateTx(client, schema, lote.id, finalState);

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
      const payments = await getSalePaymentsTx(client, schema, existing.id);
      const montoInicialTotal = getInitialTotalFromPayments(payments);

      let clienteId = existing.cliente_id;
      if (patchInput?.cliente?.dni) {
        const updatedClient = await upsertClientByDniTx(client, schema, patchInput.cliente);
        clienteId = updatedClient.id;
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
            set cliente_id = $2,
                fecha_venta = $3,
                precio_venta = $4,
                estado_venta = $5,
                tipo_financiamiento = $6,
                monto_inicial_total = $7,
                monto_financiado = $8,
                cantidad_cuotas = $9,
                monto_cuota = $10,
                observacion = $11
          where id = $1`,
        [
          existing.id,
          clienteId,
          patchInput?.fechaVenta ? formatIso(patchInput.fechaVenta, "Fecha de venta") : existing.fecha_venta,
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

      if (existing.estado_venta !== nextState) {
        await insertHistoryTx(client, schema, existing.id, existing.estado_venta, nextState, operator.id);
      }

      await syncLoteCommercialStateTx(client, schema, existing.lote_id, nextState);
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

      await syncLoteCommercialStateTx(client, schema, existing.lote_id, nextState);
      return existing.id;
    });
  } catch (error) {
    rethrowMutationError(error);
  }

  return getSaleDetail(updatedSaleId);
};
