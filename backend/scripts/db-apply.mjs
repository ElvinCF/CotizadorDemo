import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "pg";

const [typeArg, schemaArg] = process.argv.slice(2);
const type = String(typeArg || "").trim().toLowerCase();
const schema = String(schemaArg || "").trim().toLowerCase();

if (!["migrations", "seeds"].includes(type)) {
  console.error("Uso: node backend/scripts/db-apply.mjs <migrations|seeds> <dev|public>");
  process.exit(1);
}

if (!["dev", "public"].includes(schema)) {
  console.error("Schema invalido. Usa 'dev' o 'public'.");
  process.exit(1);
}

const host = process.env.SUPABASE_DB_HOST;
const port = Number(process.env.SUPABASE_DB_PORT || 5432);
const database = process.env.SUPABASE_DB_NAME || "postgres";
const user = process.env.SUPABASE_DB_USER || "postgres";
const password = process.env.SUPABASE_DB_PASSWORD;
const sslEnabled = String(process.env.SUPABASE_DB_SSL || "true").toLowerCase() !== "false";

if (!host || !password) {
  console.error("Faltan SUPABASE_DB_HOST o SUPABASE_DB_PASSWORD en .env");
  process.exit(1);
}

const baseDir =
  type === "migrations"
    ? resolve("backend/supabase/migrations")
    : resolve(`backend/supabase/seeds/${schema}`);

const files = readdirSync(baseDir)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b, "es"));

if (files.length === 0) {
  console.log(`No hay archivos SQL en ${baseDir}`);
  process.exit(0);
}

const client = new Client({
  host,
  port,
  database,
  user,
  password,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
});

const replaceSchemaToken = (sql) => sql.replaceAll("{{SCHEMA}}", schema);

try {
  await client.connect();
  for (const file of files) {
    const fullPath = join(baseDir, file);
    const sql = replaceSchemaToken(readFileSync(fullPath, "utf8"));
    console.log(`Aplicando ${type}: ${file} (${schema})`);
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
  }
  console.log(`OK: ${type} aplicado en schema '${schema}'.`);
} catch (error) {
  try {
    await client.query("rollback");
  } catch {
    // ignore rollback errors
  }
  console.error("Error aplicando SQL:", error);
  process.exit(1);
} finally {
  await client.end();
}

