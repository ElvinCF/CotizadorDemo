import { createHash } from "node:crypto";
import { badRequest, conflict, forbidden, notFound } from "./errors.mjs";
import { resolveDbSchema, withPgClient, withPgTransaction } from "./postgres.mjs";

const hashPin = (pin) => createHash("sha256").update(String(pin)).digest("hex");

const VALID_ROLES = new Set(["ADMIN", "ASESOR"]);
const VALID_STATUS = new Set(["ACTIVO", "INACTIVO"]);

const mapUserRow = (row) => ({
  id: row.id,
  username: row.username,
  rol: row.rol,
  estado: row.estado,
  nombres: row.nombres,
  apellidos: row.apellidos,
  telefono: row.telefono,
  created_at: row.created_at,
});

const getUserByUsername = async (client, schema, username, includePin = false) => {
  const columns = [
    "id",
    "username",
    "rol",
    "estado",
    "nombres",
    "apellidos",
    "telefono",
    "created_at",
  ];
  if (includePin) {
    columns.splice(2, 0, "pin_hash");
  }

  const result = await client.query(
    `select ${columns.join(", ")}
       from ${schema}.usuarios
      where username = $1
      limit 1`,
    [String(username || "").trim().toLowerCase()]
  );

  return result.rows[0] ?? null;
};

const verifyAdminAsync = async (username, pin) => {
  const schema = resolveDbSchema();
  return withPgClient(async (client) => {
    const admin = await getUserByUsername(client, schema, username, true);

    if (!admin) throw forbidden("Credenciales de administrador invalidas.");
    if (admin.estado !== "ACTIVO") throw forbidden("El administrador se encuentra inactivo.");
    if (admin.rol !== "ADMIN") throw forbidden("No tienes permisos de administrador.");
    if (admin.pin_hash !== hashPin(pin)) throw forbidden("Credenciales de administrador invalidas.");

    return admin;
  });
};

export const loginAsync = async (username, pin) => {
  const schema = resolveDbSchema();
  return withPgClient(async (client) => {
    const usuario = await getUserByUsername(client, schema, username, true);

    if (!usuario) return null;
    if (usuario.estado !== "ACTIVO") {
      throw forbidden("El usuario se encuentra inactivo.");
    }
    if (usuario.pin_hash !== hashPin(pin)) {
      return null;
    }

    let frontendRole = "asesor";
    if (usuario.rol === "ADMIN") {
      frontendRole = "admin";
    } else if (usuario.rol === "ASESOR" || usuario.rol === "VENDEDOR") {
      frontendRole = "asesor";
    } else {
      throw forbidden("No tienes un rol valido (Admin o Asesor) para acceder al sistema.");
    }

    return {
      id: usuario.id,
      username: usuario.username,
      role: frontendRole,
      nombre: `${usuario.nombres} ${usuario.apellidos}`.trim(),
      telefono: usuario.telefono || "",
    };
  });
};

export const createUserAsync = async (adminUsername, adminPin, nuevoUsuario) => {
  await verifyAdminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();

  const { username, pin, rol, nombres, apellidos, telefono } = nuevoUsuario || {};
  if (!username || !pin || !rol || !nombres) {
    throw badRequest("Faltan campos obligatorios (username, pin, rol, nombres).");
  }

  const rolUpper = String(rol).trim().toUpperCase();
  if (!VALID_ROLES.has(rolUpper)) {
    throw badRequest("Rol invalido. Use ADMIN o ASESOR.");
  }

  return withPgTransaction(async (client) => {
    const userLower = String(username).trim().toLowerCase();
    const existing = await getUserByUsername(client, schema, userLower, false);
    if (existing) {
      throw conflict(`El username '${userLower}' ya existe.`);
    }

    const result = await client.query(
      `insert into ${schema}.usuarios (
         username, pin_hash, rol, nombres, apellidos, telefono, estado
       ) values ($1, $2, $3, $4, $5, $6, 'ACTIVO')
       returning id, username, rol, estado, nombres, apellidos, telefono, created_at`,
      [
        userLower,
        hashPin(pin),
        rolUpper,
        String(nombres).trim(),
        String(apellidos || "").trim(),
        String(telefono || "").trim(),
      ]
    );

    return mapUserRow(result.rows[0]);
  });
};

export const listUsersAsync = async (adminUsername, adminPin) => {
  await verifyAdminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();

  return withPgClient(async (client) => {
    const result = await client.query(
      `select id, username, rol, estado, nombres, apellidos, telefono, created_at
         from ${schema}.usuarios
        order by created_at asc`
    );
    return result.rows.map(mapUserRow);
  });
};

export const getUserCatalogsAsync = async (adminUsername, adminPin) => {
  await verifyAdminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();

  return withPgClient(async (client) => {
    const result = await client.query(`select rol, estado from ${schema}.usuarios`);
    const roles = Array.from(new Set([...result.rows.map((item) => item.rol).filter(Boolean), ...Array.from(VALID_ROLES)]));
    const statuses = Array.from(new Set([...result.rows.map((item) => item.estado).filter(Boolean), ...Array.from(VALID_STATUS)]));
    return { roles, statuses };
  });
};

export const updateUserAsync = async (adminUsername, adminPin, userId, patchInput) => {
  await verifyAdminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();
  const id = String(userId || "").trim();

  if (!id) {
    throw badRequest("Falta id de usuario.");
  }

  return withPgTransaction(async (client) => {
    const result = await client.query(
      `select id, username, rol, estado
         from ${schema}.usuarios
        where id = $1
        for update`,
      [id]
    );

    const existing = result.rows[0];
    if (!existing) {
      throw notFound("Usuario no encontrado.");
    }

    const patch = patchInput || {};
    const nextData = {};

    if (patch.username !== undefined) {
      const username = String(patch.username).trim().toLowerCase();
      if (!username) throw badRequest("El username es obligatorio.");

      const duplicate = await getUserByUsername(client, schema, username, false);
      if (duplicate && duplicate.id !== id) {
        throw conflict(`El username '${username}' ya existe.`);
      }
      nextData.username = username;
    }

    if (patch.rol !== undefined) {
      const role = String(patch.rol).trim().toUpperCase();
      if (!VALID_ROLES.has(role)) {
        throw badRequest("Rol invalido. Use ADMIN o ASESOR.");
      }
      nextData.rol = role;
    }

    if (patch.estado !== undefined) {
      const status = String(patch.estado).trim().toUpperCase();
      if (!VALID_STATUS.has(status)) {
        throw badRequest("Estado invalido. Use ACTIVO o INACTIVO.");
      }
      nextData.estado = status;
    }

    if (patch.nombres !== undefined) nextData.nombres = String(patch.nombres).trim();
    if (patch.apellidos !== undefined) nextData.apellidos = String(patch.apellidos).trim();
    if (patch.telefono !== undefined) nextData.telefono = String(patch.telefono).trim();
    if (patch.pin !== undefined && String(patch.pin).trim() !== "") {
      nextData.pin_hash = hashPin(String(patch.pin).trim());
    }

    const sets = [];
    const values = [id];
    for (const [key, value] of Object.entries(nextData)) {
      sets.push(`${key} = $${values.length + 1}`);
      values.push(value);
    }

    if (sets.length === 0) {
      const unchanged = await client.query(
        `select id, username, rol, estado, nombres, apellidos, telefono, created_at
           from ${schema}.usuarios
          where id = $1`,
        [id]
      );
      return mapUserRow(unchanged.rows[0]);
    }

    const updated = await client.query(
      `update ${schema}.usuarios
          set ${sets.join(", ")}
        where id = $1
        returning id, username, rol, estado, nombres, apellidos, telefono, created_at`,
      values
    );

    return mapUserRow(updated.rows[0]);
  });
};
