import { badRequest, notFound } from "./errors.mjs";
import { requireAdminUserAsync, requireAuthenticatedUserAsync } from "./authService.mjs";
import { resolveDbSchema, withPgClient } from "./postgres.mjs";

const ALLOWED_STATUS = new Set(["DISPONIBLE", "SEPARADO", "VENDIDO"]);

const cleanNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatus = (value) => {
  const normalized = String(value || "DISPONIBLE").trim().toUpperCase();
  return ALLOWED_STATUS.has(normalized) ? normalized : "DISPONIBLE";
};

const isProjectAwareSchema = (schema) => schema === "dev";

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const resolvePublicProjectIdAsync = async (client, schema, requestedRef = null) => {
  if (!isProjectAwareSchema(schema)) return null;
  const requestedText = String(requestedRef || "").trim();
  const requestedSlug = normalizeSlug(requestedText);
  const result = await client.query(
    `select proyecto_id, slug
       from ${schema}.v_contexto_proyectos
      where proyecto_activo = true
      order by proyecto_nombre asc`
  );
  const rows = result.rows;
  const target =
    (requestedText
      ? rows.find((row) => row.proyecto_id === requestedText || row.slug === requestedSlug)
      : null) ?? rows[0] ?? null;
  return target?.proyecto_id ?? null;
};

const resolveVisibleProjectIdAsync = async (client, schema, actor, requestedRef = null) => {
  if (!isProjectAwareSchema(schema)) return null;
  const result = await client.query(
    `select proyecto_id, slug
       from ${schema}.fn_proyectos_visibles_app($1::uuid)
      order by nombre asc`,
    [actor.id]
  );
  const rows = result.rows;
  const requestedText = String(requestedRef || "").trim();
  const requestedSlug = normalizeSlug(requestedText);
  const canSelectRequested = actor.rawRole === "SUPERADMIN";
  const target =
    (canSelectRequested && requestedText
      ? rows.find((row) => row.proyecto_id === requestedText || row.slug === requestedSlug)
      : null) ?? rows[0] ?? null;
  return target?.proyecto_id ?? null;
};

export const toLoteId = (mz, lote) => `${String(mz).trim().toUpperCase()}-${String(lote).padStart(2, "0")}`;

const mapDbRowToLote = (row) => ({
  id: row.codigo ?? toLoteId(row.manzana, row.lote),
  dbId: row.id,
  projectId: row.proyecto_id ?? null,
  mz: row.manzana,
  lote: row.lote,
  areaM2: row.area_m2,
  price: Number(row.precio_referencial ?? 0),
  condicion: normalizeStatus(row.estado_comercial),
  esEsquina: row.es_esquina ?? null,
  esMedianero: row.es_medianero ?? null,
  frenteParque: row.frente_parque ?? null,
  frenteViaPrincipal: row.frente_via_principal ?? null,
  ventaActiva: Boolean(row.venta_activa),
  ventaActivaId: row.venta_activa_id ?? null,
});

const mapDbRowToAdminLote = (row) => ({
  ...mapDbRowToLote(row),
  precioMinimo: row.precio_minimo == null ? null : Number(row.precio_minimo),
});

export const listLotes = async (requestedProjectRef = null) => {
  const schema = resolveDbSchema();
  return withPgClient(async (client) => {
    const targetProjectId = await resolvePublicProjectIdAsync(client, schema, requestedProjectRef);
    const result = await client.query(
      `with latest_active_sale as (
         select distinct on (vl.lote_id)
           vl.lote_id,
           v.id as venta_activa_id
         from ${schema}.venta_lotes vl
         join ${schema}.ventas v on v.id = vl.venta_id
         where v.estado_venta <> 'CAIDA'
         order by vl.lote_id, v.fecha_venta desc nulls last, v.created_at desc, v.id desc
       )
       select
         l.id,
         l.manzana,
         l.lote,
         l.area_m2,
         l.precio_referencial,
         ${isProjectAwareSchema(schema) ? "l.proyecto_id," : ""}
         l.estado_comercial,
         ${isProjectAwareSchema(schema) ? "l.es_esquina,\n         l.es_medianero,\n         l.frente_parque,\n         l.frente_via_principal," : ""}
         l.codigo,
         (las.venta_activa_id is not null) as venta_activa,
         las.venta_activa_id
       from ${schema}.lotes l
       left join latest_active_sale las on las.lote_id = l.id
       ${isProjectAwareSchema(schema) ? "where l.proyecto_id = $1" : ""}
       order by l.manzana asc, l.lote asc`
      ,
      isProjectAwareSchema(schema) ? [targetProjectId] : []
    );

    return result.rows.map(mapDbRowToLote);
  });
};

export const listLotesAdminAsync = async (username, pin, requestedProjectRef = null) => {
  const actor = await requireAuthenticatedUserAsync(username, pin);
  const schema = resolveDbSchema();
  return withPgClient(async (client) => {
    const targetProjectId = await resolveVisibleProjectIdAsync(client, schema, actor, requestedProjectRef);
    const result = await client.query(
      `with latest_active_sale as (
         select distinct on (vl.lote_id)
           vl.lote_id,
           v.id as venta_activa_id
         from ${schema}.venta_lotes vl
         join ${schema}.ventas v on v.id = vl.venta_id
         where v.estado_venta <> 'CAIDA'
         order by vl.lote_id, v.fecha_venta desc nulls last, v.created_at desc, v.id desc
       )
       select
         l.id,
         l.manzana,
         l.lote,
         l.area_m2,
         l.precio_referencial,
         ${isProjectAwareSchema(schema) ? "l.precio_minimo,\n         l.proyecto_id," : ""}
         l.estado_comercial,
         ${isProjectAwareSchema(schema) ? "l.es_esquina,\n         l.es_medianero,\n         l.frente_parque,\n         l.frente_via_principal," : ""}
         l.codigo,
         (las.venta_activa_id is not null) as venta_activa,
         las.venta_activa_id
       from ${schema}.lotes l
       left join latest_active_sale las on las.lote_id = l.id
       ${isProjectAwareSchema(schema) ? "where l.proyecto_id = $1" : ""}
       order by l.manzana asc, l.lote asc`
      ,
      isProjectAwareSchema(schema) ? [targetProjectId] : []
    );

    return result.rows.map(mapDbRowToAdminLote);
  });
};

export const updateLoteById = async (loteId, payload) => {
  const schema = resolveDbSchema();
  const code = String(loteId || "").trim();
  if (!code) {
    throw badRequest("Falta id de lote.");
  }

  const patchStatus = normalizeStatus(payload.estado);
  const price = payload.price !== undefined ? cleanNumber(payload.price) : undefined;

  return withPgClient(async (client) => {
    const fields = ["estado_comercial = $2"];
    const values = [code, patchStatus];

    if (price !== undefined) {
      fields.push(`precio_referencial = $${values.length + 1}`);
      values.push(price);
    }

    const result = await client.query(
      `update ${schema}.lotes
          set ${fields.join(", ")}
        where codigo = $1
        returning id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo`,
      values
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return mapDbRowToLote(row);
  });
};

export const updateLoteConfigByIdAsync = async (username, pin, loteId, payload) => {
  await requireAdminUserAsync(username, pin);
  const schema = resolveDbSchema();
  if (!isProjectAwareSchema(schema)) {
    throw badRequest("La configuracion avanzada de lotes solo esta disponible en schema dev.");
  }
  const code = String(loteId || "").trim();
  if (!code) {
    throw badRequest("Falta id de lote.");
  }

  const toNullableBoolean = (value, label) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    if (typeof value === "boolean") return value;
    if (String(value).trim().toLowerCase() === "true") return true;
    if (String(value).trim().toLowerCase() === "false") return false;
    throw badRequest(`${label} invalido.`);
  };

  const priceRef = payload.precioReferencial !== undefined ? cleanNumber(payload.precioReferencial) : undefined;
  const priceMin = payload.precioMinimo !== undefined ? cleanNumber(payload.precioMinimo) : undefined;
  if (priceMin !== undefined && priceMin !== null && priceMin < 0) {
    throw badRequest("Precio minimo invalido.");
  }
  if (priceRef !== undefined && priceRef !== null && priceRef < 0) {
    throw badRequest("Precio referencial invalido.");
  }

  return withPgClient(async (client) => {
    const fields = [];
    const values = [code];
    const pushField = (sql, value) => {
      fields.push(`${sql} = $${values.length + 1}`);
      values.push(value);
    };

    if (payload.estado !== undefined) pushField("estado_comercial", normalizeStatus(payload.estado));
    if (priceRef !== undefined) pushField("precio_referencial", priceRef);
    if (priceMin !== undefined) pushField("precio_minimo", priceMin);
    if (payload.esEsquina !== undefined) pushField("es_esquina", toNullableBoolean(payload.esEsquina, "Esquina"));
    if (payload.esMedianero !== undefined) pushField("es_medianero", toNullableBoolean(payload.esMedianero, "Medianero"));
    if (payload.frenteParque !== undefined) pushField("frente_parque", toNullableBoolean(payload.frenteParque, "Parque"));
    if (payload.frenteViaPrincipal !== undefined) {
      pushField("frente_via_principal", toNullableBoolean(payload.frenteViaPrincipal, "Via principal"));
    }

    if (fields.length === 0) {
      throw badRequest("No hay cambios validos para guardar.");
    }

    const result = await client.query(
      `update ${schema}.lotes
          set ${fields.join(", ")}
        where codigo = $1
        returning id, manzana, lote, area_m2, precio_referencial, precio_minimo, proyecto_id, estado_comercial,
                  es_esquina, es_medianero, frente_parque, frente_via_principal, codigo`,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw notFound("Lote no encontrado.");
    }

    return mapDbRowToAdminLote(row);
  });
};

export const updateLoteStatusMassiveAsync = async (username, pin, payload = {}, requestedProjectRef = null) => {
  const actor = await requireAdminUserAsync(username, pin);
  const schema = resolveDbSchema();
  if (!isProjectAwareSchema(schema)) {
    throw badRequest("La actualizacion masiva de estado solo esta disponible en schema dev.");
  }

  const loteIds = Array.isArray(payload.loteIds)
    ? payload.loteIds
        .map((value) => String(value || "").trim().toUpperCase())
        .filter(Boolean)
    : [];
  if (loteIds.length === 0) {
    throw badRequest("Selecciona al menos un lote para actualizar.");
  }

  const estado = normalizeStatus(payload.estado);

  return withPgClient(async (client) => {
    const targetProjectId = await resolveVisibleProjectIdAsync(client, schema, actor, requestedProjectRef);
    if (!targetProjectId) {
      throw notFound("Proyecto no visible para el usuario.");
    }

    const result = await client.query(
      `update ${schema}.lotes
          set estado_comercial = $3
        where proyecto_id = $1
          and codigo = any($2::text[])
        returning id, manzana, lote, area_m2, precio_referencial, precio_minimo, proyecto_id, estado_comercial,
                  es_esquina, es_medianero, frente_parque, frente_via_principal, codigo`,
      [targetProjectId, loteIds, estado]
    );

    if (result.rows.length === 0) {
      throw notFound("No se encontraron lotes para actualizar en el proyecto activo.");
    }

    return result.rows.map(mapDbRowToAdminLote);
  });
};

export const updateAvailablePricesMassive = async (payload) => {
  const schema = resolveDbSchema();
  const tipoAjuste = String(payload?.tipoAjuste || "").trim().toUpperCase();
  const valorAjuste = cleanNumber(payload?.valorAjuste);

  if (tipoAjuste !== "MONTO" && tipoAjuste !== "PORCENTAJE") {
    throw badRequest("tipoAjuste invalido. Usa MONTO o PORCENTAJE.");
  }
  if (valorAjuste === null) {
    throw badRequest("valorAjuste invalido.");
  }

  return withPgClient(async (client) => {
    const result = await client.query(
      `select ${schema}.sp_actualizar_precios_disponibles($1, $2) as updated_count`,
      [tipoAjuste, valorAjuste]
    );

    return Number(result.rows[0]?.updated_count ?? 0);
  });
};
