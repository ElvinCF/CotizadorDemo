import { loginAsync } from "./usuariosService.mjs";
import { getSupabaseAdminClient, toLoteId } from "./lotesService.mjs";

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

const asTrimmed = (value) => String(value ?? "").trim();

const asUpper = (value) => asTrimmed(value).toUpperCase();

const asNumber = (value, fieldName) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} invalido.`);
  }
  return parsed;
};

const asPositiveNumber = (value, fieldName, allowZero = false) => {
  const parsed = asNumber(value, fieldName);
  if (parsed === null) {
    throw new Error(`${fieldName} es obligatorio.`);
  }
  if (allowZero ? parsed < 0 : parsed <= 0) {
    throw new Error(`${fieldName} invalido.`);
  }
  return parsed;
};

const asInteger = (value, fieldName) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} invalido.`);
  }
  return parsed;
};

const formatIso = (value) => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha invalida.");
  }
  return parsed.toISOString();
};

const normalizeSaleState = (value) => {
  const normalized = asUpper(value || "SEPARADA");
  if (!VALID_SALE_STATES.has(normalized)) {
    throw new Error("Estado de venta invalido.");
  }
  return normalized;
};

const normalizeFinancingType = (value) => {
  const normalized = asUpper(value);
  if (!VALID_FINANCING_TYPES.has(normalized)) {
    throw new Error("Tipo de financiamiento invalido.");
  }
  return normalized;
};

const normalizePaymentType = (value) => {
  const normalized = asUpper(value);
  if (!VALID_PAYMENT_TYPES.has(normalized)) {
    throw new Error("Tipo de pago invalido.");
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
      throw new Error("Cantidad de cuotas invalida.");
    }
    const cuotaCalculada = Number((montoFinanciado / cuotas).toFixed(2));
    return {
      montoFinanciado,
      cantidadCuotas: cuotas,
      montoCuota: cuotaCalculada,
      tipoFinanciamiento: financingType,
    };
  }

  const cuotaObjetivo = asPositiveNumber(montoCuota, "Monto por cuota");
  const cuotasCalculadas = Math.max(1, Math.ceil(montoFinanciado / cuotaObjetivo));
  return {
    montoFinanciado,
    cantidadCuotas: cuotasCalculadas,
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
    throw new Error("Credenciales invalidas.");
  }
  return operator;
};

const getLoteByCodigo = async (supabase, loteCodigo) => {
  const code = asTrimmed(loteCodigo);
  if (!code) {
    throw new Error("Falta codigo de lote.");
  }

  const { data, error } = await supabase
    .from("lotes")
    .select("id,codigo,manzana,lote,area_m2,precio_referencial,estado_comercial")
    .eq("codigo", code)
    .maybeSingle();

  if (error) {
    throw new Error("Error al obtener lote.");
  }
  if (!data) {
    throw new Error("Lote no encontrado.");
  }

  return data;
};

const getClientByDni = async (supabase, dni) => {
  const cleanDni = asTrimmed(dni);
  if (!cleanDni) {
    throw new Error("Falta DNI del cliente.");
  }

  const { data, error } = await supabase
    .from("clientes")
    .select("id,nombre_completo,dni,celular,direccion,ocupacion")
    .eq("dni", cleanDni)
    .maybeSingle();

  if (error) {
    throw new Error("Error al buscar cliente por DNI.");
  }

  return data;
};

const upsertClientByDni = async (supabase, clienteInput) => {
  const dni = asTrimmed(clienteInput?.dni);
  const nombreCompleto = asTrimmed(clienteInput?.nombreCompleto || clienteInput?.nombre);

  if (!dni) {
    throw new Error("El DNI del cliente es obligatorio.");
  }
  if (!nombreCompleto) {
    throw new Error("El nombre del cliente es obligatorio.");
  }

  const payload = {
    nombre_completo: nombreCompleto,
    dni,
    celular: asTrimmed(clienteInput?.celular),
    direccion: asTrimmed(clienteInput?.direccion),
    ocupacion: asTrimmed(clienteInput?.ocupacion),
  };

  const existing = await getClientByDni(supabase, dni);
  if (existing) {
    const { data, error } = await supabase
      .from("clientes")
      .update(payload)
      .eq("id", existing.id)
      .select("id,nombre_completo,dni,celular,direccion,ocupacion")
      .single();

    if (error) {
      throw new Error("No se pudo actualizar cliente.");
    }
    return data;
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert(payload)
    .select("id,nombre_completo,dni,celular,direccion,ocupacion")
    .single();

  if (error) {
    throw new Error("No se pudo crear cliente.");
  }

  return data;
};

const insertHistory = async (supabase, ventaId, previousState, nextState, usuarioId) => {
  const { error } = await supabase.from("venta_estado_historial").insert({
    venta_id: ventaId,
    estado_anterior: previousState,
    estado_nuevo: nextState,
    usuario_id: usuarioId,
  });

  if (error) {
    throw new Error("No se pudo registrar historial de venta.");
  }
};

const syncLoteCommercialState = async (supabase, loteId, saleState) => {
  const mappedState = syncLoteStatusFromSaleState(saleState);
  const { error } = await supabase.from("lotes").update({ estado_comercial: mappedState }).eq("id", loteId);
  if (error) {
    throw new Error("No se pudo sincronizar el estado del lote.");
  }
};

const getSalePayments = async (supabase, ventaId) => {
  const { data, error } = await supabase
    .from("pagos")
    .select("id,fecha_pago,tipo_pago,monto,nro_cuota,observacion,created_at")
    .eq("venta_id", ventaId)
    .order("fecha_pago", { ascending: true });

  if (error) {
    throw new Error("No se pudieron obtener pagos de la venta.");
  }

  return data || [];
};

const getSaleBaseById = async (supabase, saleId) => {
  const { data, error } = await supabase
    .from("ventas")
    .select("id,lote_id,cliente_id,asesor_id,precio_venta,estado_venta,tipo_financiamiento,monto_inicial_total,monto_financiado,cantidad_cuotas,monto_cuota,observacion")
    .eq("id", asTrimmed(saleId))
    .maybeSingle();

  if (error) {
    throw new Error("Error al obtener venta.");
  }
  if (!data) {
    throw new Error("Venta no encontrada.");
  }
  return data;
};

const getSaleDetail = async (supabase, saleId) => {
  const { data, error } = await supabase
    .from("ventas")
    .select(getSaleSelect(true))
    .eq("id", asTrimmed(saleId))
    .maybeSingle();

  if (error) {
    throw new Error("Error al obtener detalle de venta.");
  }
  if (!data) {
    throw new Error("Venta no encontrada.");
  }
  return mapSaleRow(data);
};

const buildInitialPaymentsPayload = (payments = []) =>
  (payments || [])
    .map((payment) => ({
      fecha_pago: formatIso(payment.fechaPago),
      tipo_pago: normalizePaymentType(payment.tipoPago),
      monto: asPositiveNumber(payment.monto, "Monto de pago"),
      nro_cuota:
        payment.nroCuota === null || payment.nroCuota === undefined || payment.nroCuota === ""
          ? null
          : asInteger(payment.nroCuota, "Numero de cuota"),
      observacion: asTrimmed(payment.observacion),
    }))
    .filter((payment) => payment.monto > 0);

export const findClientByDniAsync = async (username, pin, dni) => {
  await requireOperator(username, pin);
  const supabase = getSupabaseAdminClient();
  const client = await getClientByDni(supabase, dni);
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
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ventas")
    .select(getSaleSelect(false))
    .order("fecha_venta", { ascending: false });

  if (error) {
    throw new Error("No se pudo listar ventas.");
  }

  return (data || []).map(mapSaleRow);
};

export const getSaleByIdAsync = async (username, pin, saleId) => {
  await requireOperator(username, pin);
  const supabase = getSupabaseAdminClient();
  return getSaleDetail(supabase, saleId);
};

export const createSaleAsync = async (username, pin, saleInput) => {
  const operator = await requireOperator(username, pin);
  const supabase = getSupabaseAdminClient();

  const lote = await getLoteByCodigo(supabase, saleInput?.loteCodigo);
  const cliente = await upsertClientByDni(supabase, saleInput?.cliente ?? {});
  const initialPayments = buildInitialPaymentsPayload(saleInput?.pagosIniciales ?? []);
  const montoInicialTotal = getInitialTotalFromPayments(initialPayments);
  const saleState = normalizeSaleState(saleInput?.estadoVenta || "SEPARADA");
  const financing = calculateFinancing({
    precioVenta: saleInput?.precioVenta,
    montoInicialTotal,
    tipoFinanciamiento: saleInput?.tipoFinanciamiento,
    cantidadCuotas: saleInput?.cantidadCuotas,
    montoCuota: saleInput?.montoCuota,
  });

  const { data: created, error } = await supabase
    .from("ventas")
    .insert({
      lote_id: lote.id,
      cliente_id: cliente.id,
      asesor_id: operator.id,
      fecha_venta: formatIso(saleInput?.fechaVenta),
      precio_venta: asPositiveNumber(saleInput?.precioVenta, "Precio de venta", true),
      estado_venta: saleState,
      tipo_financiamiento: financing.tipoFinanciamiento,
      monto_inicial_total: montoInicialTotal,
      monto_financiado: financing.montoFinanciado,
      cantidad_cuotas: financing.cantidadCuotas,
      monto_cuota: financing.montoCuota,
      observacion: asTrimmed(saleInput?.observacion),
    })
    .select("id")
    .single();

  if (error) {
    if (String(error.message || "").includes("ventas_lote_activa_unique_idx")) {
      throw new Error("Ese lote ya tiene una venta activa.");
    }
    throw new Error("No se pudo crear la venta.");
  }

  if (initialPayments.length > 0) {
    const { error: paymentsError } = await supabase.from("pagos").insert(
      initialPayments.map((payment) => ({
        venta_id: created.id,
        ...payment,
      }))
    );

    if (paymentsError) {
      throw new Error("La venta se creo, pero no se pudieron registrar pagos iniciales.");
    }
  }

  await insertHistory(supabase, created.id, null, saleState, operator.id);
  await syncLoteCommercialState(supabase, lote.id, saleState);

  return getSaleDetail(supabase, created.id);
};

export const updateSaleAsync = async (username, pin, saleId, patchInput) => {
  const operator = await requireOperator(username, pin);
  const supabase = getSupabaseAdminClient();
  const existing = await getSaleBaseById(supabase, saleId);
  const payments = await getSalePayments(supabase, saleId);
  const montoInicialTotal = getInitialTotalFromPayments(payments);

  const nextState = normalizeSaleState(patchInput?.estadoVenta || existing.estado_venta);
  if (nextState === "CAIDA" && operator.role !== "admin") {
    throw new Error("Solo un admin puede marcar una venta como caida.");
  }

  let clienteId = existing.cliente_id;
  if (patchInput?.cliente?.dni) {
    const updatedClient = await upsertClientByDni(supabase, patchInput.cliente);
    clienteId = updatedClient.id;
  }

  const financing = calculateFinancing({
    precioVenta: patchInput?.precioVenta ?? existing.precio_venta,
    montoInicialTotal,
    tipoFinanciamiento: patchInput?.tipoFinanciamiento ?? existing.tipo_financiamiento,
    cantidadCuotas: patchInput?.cantidadCuotas ?? existing.cantidad_cuotas,
    montoCuota: patchInput?.montoCuota ?? existing.monto_cuota,
  });

  const { error } = await supabase
    .from("ventas")
    .update({
      cliente_id: clienteId,
      fecha_venta: patchInput?.fechaVenta ? formatIso(patchInput.fechaVenta) : undefined,
      precio_venta:
        patchInput?.precioVenta !== undefined
          ? asPositiveNumber(patchInput.precioVenta, "Precio de venta", true)
          : undefined,
      estado_venta: nextState,
      tipo_financiamiento: financing.tipoFinanciamiento,
      monto_inicial_total: montoInicialTotal,
      monto_financiado: financing.montoFinanciado,
      cantidad_cuotas: financing.cantidadCuotas,
      monto_cuota: financing.montoCuota,
      observacion: patchInput?.observacion !== undefined ? asTrimmed(patchInput.observacion) : undefined,
    })
    .eq("id", existing.id);

  if (error) {
    throw new Error("No se pudo actualizar la venta.");
  }

  if (existing.estado_venta !== nextState) {
    await insertHistory(supabase, existing.id, existing.estado_venta, nextState, operator.id);
  }

  await syncLoteCommercialState(supabase, existing.lote_id, nextState);
  return getSaleDetail(supabase, existing.id);
};

export const addSalePaymentAsync = async (username, pin, saleId, paymentInput) => {
  const operator = await requireOperator(username, pin);
  const supabase = getSupabaseAdminClient();
  const existing = await getSaleBaseById(supabase, saleId);

  const paymentType = normalizePaymentType(paymentInput?.tipoPago);
  const paymentPayload = {
    venta_id: existing.id,
    fecha_pago: formatIso(paymentInput?.fechaPago),
    tipo_pago: paymentType,
    monto: asPositiveNumber(paymentInput?.monto, "Monto de pago"),
    nro_cuota:
      paymentInput?.nroCuota === null || paymentInput?.nroCuota === undefined || paymentInput?.nroCuota === ""
        ? null
        : asInteger(paymentInput?.nroCuota, "Numero de cuota"),
    observacion: asTrimmed(paymentInput?.observacion),
  };

  if (paymentType === "CUOTA" && paymentPayload.nro_cuota === null) {
    throw new Error("El numero de cuota es obligatorio para pagos de cuota.");
  }

  const { error: insertError } = await supabase.from("pagos").insert(paymentPayload);
  if (insertError) {
    throw new Error("No se pudo registrar el pago.");
  }

  const payments = await getSalePayments(supabase, existing.id);
  const montoInicialTotal = getInitialTotalFromPayments(payments);
  const derivedState = deriveStateFromPayments(payments, existing.precio_venta, existing.estado_venta);
  const previousState = existing.estado_venta;

  if (derivedState === "CAIDA" && operator.role !== "admin") {
    throw new Error("Estado de venta invalido.");
  }

  const financing = calculateFinancing({
    precioVenta: existing.precio_venta,
    montoInicialTotal,
    tipoFinanciamiento: existing.tipo_financiamiento,
    cantidadCuotas: existing.cantidad_cuotas,
    montoCuota: existing.monto_cuota,
  });

  const { error: updateError } = await supabase
    .from("ventas")
    .update({
      monto_inicial_total: montoInicialTotal,
      monto_financiado: financing.montoFinanciado,
      cantidad_cuotas: financing.cantidadCuotas,
      monto_cuota: financing.montoCuota,
      estado_venta: derivedState,
    })
    .eq("id", existing.id);

  if (updateError) {
    throw new Error("No se pudo sincronizar la venta despues del pago.");
  }

  if (previousState !== derivedState) {
    await insertHistory(supabase, existing.id, previousState, derivedState, operator.id);
  }

  await syncLoteCommercialState(supabase, existing.lote_id, derivedState);
  return getSaleDetail(supabase, existing.id);
};
