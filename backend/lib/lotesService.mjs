import { createClient } from "@supabase/supabase-js";

const ALLOWED_STATUS = new Set(["DISPONIBLE", "SEPARADO", "VENDIDO", "BLOQUEADO", "INACTIVO"]);
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const ALLOWED_SCHEMAS = new Set(["public", "dev", "devsimple"]);

const resolveSupabaseSchema = () => {
  const configured = String(process.env.SUPABASE_DB_SCHEMA ?? "").trim().toLowerCase();
  if (!configured) {
    throw new Error("Falta SUPABASE_DB_SCHEMA (valores permitidos: public|dev|devsimple).");
  }
  if (!ALLOWED_SCHEMAS.has(configured)) {
    throw new Error(`SUPABASE_DB_SCHEMA invalido: '${configured}'. Usa public, dev o devsimple.`);
  }
  return configured;
};

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

const normalizeText = (value) => String(value ?? "").trim();

export const toLoteId = (mz, lote) => `${String(mz).trim().toUpperCase()}-${String(lote).padStart(2, "0")}`;

export const getSupabaseAdminClient = () => {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = resolveSupabaseSchema();
  if (!url || !serviceRole) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema,
    },
  });
};

const mapDbRowToLote = (row) => ({
  id: row.codigo ?? toLoteId(row.manzana, row.lote),
  dbId: row.id,
  mz: row.manzana,
  lote: row.lote,
  areaM2: row.area_m2,
  price: row.precio_referencial,
  condicion: normalizeStatus(row.estado_comercial),
  asesor: undefined,
  cliente: undefined,
  comentario: undefined,
  ultimaModificacion: undefined,
});

export const listLotes = async (supabase) => {
  const { data, error } = await supabase
    .from("lotes")
    .select("id,manzana,lote,area_m2,precio_referencial,estado_comercial,codigo")
    .order("manzana", { ascending: true })
    .order("lote", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapDbRowToLote);
};

export const updateLoteById = async (supabase, loteId, payload) => {
  const patch = {
    estado_comercial: normalizeStatus(payload.estado)
  };

  if (payload.price !== undefined) {
    patch.precio_referencial = cleanNumber(payload.price);
  }

  const { data, error } = await supabase
    .from("lotes")
    .update(patch)
    .eq("codigo", String(loteId || "").trim())
    .select("id,manzana,lote,area_m2,precio_referencial,estado_comercial,codigo")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapDbRowToLote(data);
};

export const updateAvailablePricesMassive = async (supabase, payload) => {
  const tipoAjuste = String(payload?.tipoAjuste || "").trim().toUpperCase();
  const valorAjuste = cleanNumber(payload?.valorAjuste);

  if (tipoAjuste !== "MONTO" && tipoAjuste !== "PORCENTAJE") {
    throw new Error("tipoAjuste invalido. Usa MONTO o PORCENTAJE.");
  }
  if (valorAjuste === null) {
    throw new Error("valorAjuste invalido.");
  }

  const { data, error } = await supabase.rpc("sp_actualizar_precios_disponibles", {
    p_tipo_ajuste: tipoAjuste,
    p_valor_ajuste: valorAjuste,
  });

  if (error) throw error;

  if (typeof data === "number") {
    return data;
  }
  if (Array.isArray(data) && data.length > 0 && typeof data[0]?.updated_count === "number") {
    return data[0].updated_count;
  }
  return 0;
};

