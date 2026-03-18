import { createHash } from "node:crypto";
import { forbidden, unauthorized } from "./errors.mjs";
import { resolveDbSchema, withPgClient } from "./postgres.mjs";

const hashPin = (pin) => createHash("sha256").update(String(pin ?? "")).digest("hex");

const mapAuthenticatedUser = (row) => {
  const rawRole = String(row.rol || "").toUpperCase();
  const frontendRole = rawRole === "ADMIN" ? "admin" : "asesor";

  return {
    id: row.id,
    username: row.username,
    role: frontendRole,
    rawRole,
    nombre: `${row.nombres ?? ""} ${row.apellidos ?? ""}`.trim(),
    telefono: row.celular ?? "",
    personaId: row.persona_id,
  };
};

const getUserByUsernameTx = async (client, schema, username) => {
  const normalized = String(username ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const result = await client.query(
    `select
       u.id,
       u.persona_id,
       u.username,
       u.pin_hash,
       u.rol,
       u.estado,
       p.nombres,
       p.apellidos,
       p.celular
     from ${schema}.usuarios u
     join ${schema}.personas p on p.id = u.persona_id
     where lower(u.username) = $1
     limit 1`,
    [normalized]
  );

  return result.rows[0] ?? null;
};

export const authenticateUserAsync = async (username, pin) => {
  const schema = resolveDbSchema();

  return withPgClient(async (client) => {
    const user = await getUserByUsernameTx(client, schema, username);
    if (!user) {
      return null;
    }

    if (String(user.estado || "").toUpperCase() !== "ACTIVO") {
      throw forbidden("El usuario se encuentra inactivo.");
    }

    if (user.pin_hash !== hashPin(pin)) {
      return null;
    }

    if (!["ADMIN", "ASESOR"].includes(String(user.rol || "").toUpperCase())) {
      throw forbidden("No tienes un rol valido para acceder al sistema.");
    }

    return mapAuthenticatedUser(user);
  });
};

export const requireAuthenticatedUserAsync = async (username, pin) => {
  const user = await authenticateUserAsync(username, pin);
  if (!user) {
    throw unauthorized("Credenciales invalidas.");
  }
  return user;
};

export const requireAdminUserAsync = async (username, pin) => {
  const user = await requireAuthenticatedUserAsync(username, pin);
  if (user.rawRole !== "ADMIN") {
    throw forbidden("No tienes permisos de administrador.");
  }
  return user;
};

export const requireAdvisorUserAsync = async (username, pin) => {
  const user = await requireAuthenticatedUserAsync(username, pin);
  if (user.rawRole !== "ASESOR") {
    throw forbidden("No tienes permisos de asesor.");
  }
  return user;
};
