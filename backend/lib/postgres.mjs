import { Client } from "pg";
import { badRequest } from "./errors.mjs";

const ALLOWED_SCHEMAS = new Set(["public", "dev", "devsimple"]);

export const resolveDbSchema = () => {
  const configured = String(process.env.SUPABASE_DB_SCHEMA ?? "").trim().toLowerCase();
  if (!configured) {
    throw badRequest("Falta SUPABASE_DB_SCHEMA (valores permitidos: public|dev|devsimple).");
  }
  if (!ALLOWED_SCHEMAS.has(configured)) {
    throw badRequest(`SUPABASE_DB_SCHEMA invalido: '${configured}'. Usa public, dev o devsimple.`);
  }
  return configured;
};

const buildPgClient = () => {
  const host = process.env.SUPABASE_DB_HOST;
  const port = Number(process.env.SUPABASE_DB_PORT || 5432);
  const database = process.env.SUPABASE_DB_NAME || "postgres";
  const user = process.env.SUPABASE_DB_USER || "postgres";
  const password = process.env.SUPABASE_DB_PASSWORD;
  const sslEnabled = String(process.env.SUPABASE_DB_SSL || "true").toLowerCase() !== "false";

  if (!host || !password || password === "YOUR_DB_PASSWORD") {
    throw badRequest("Faltan SUPABASE_DB_HOST o SUPABASE_DB_PASSWORD para usar transacciones directas.");
  }

  return new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  });
};

export const withPgTransaction = async (callback) => {
  const client = buildPgClient();

  try {
    await client.connect();
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    await client.end();
  }
};

export const withPgClient = async (callback) => {
  const client = buildPgClient();

  try {
    await client.connect();
    return await callback(client);
  } finally {
    await client.end();
  }
};
