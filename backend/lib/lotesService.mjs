import { badRequest, notFound } from "./errors.mjs";
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

export const toLoteId = (mz, lote) => `${String(mz).trim().toUpperCase()}-${String(lote).padStart(2, "0")}`;

const mapDbRowToLote = (row) => ({
  id: row.codigo ?? toLoteId(row.manzana, row.lote),
  dbId: row.id,
  mz: row.manzana,
  lote: row.lote,
  areaM2: row.area_m2,
  price: Number(row.precio_referencial ?? 0),
  condicion: normalizeStatus(row.estado_comercial),
});

export const listLotes = async () => {
  const schema = resolveDbSchema();
  return withPgClient(async (client) => {
    const result = await client.query(
      `select id, manzana, lote, area_m2, precio_referencial, estado_comercial, codigo
         from ${schema}.lotes
        order by manzana asc, lote asc`
    );

    return result.rows.map(mapDbRowToLote);
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
