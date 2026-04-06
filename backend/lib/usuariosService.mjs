import { createHash } from "node:crypto";
import { badRequest, conflict, forbidden, notFound } from "./errors.mjs";
import { resolveDbSchema, withPgClient, withPgTransaction } from "./postgres.mjs";

const hashPin = (pin) => createHash("sha256").update(String(pin)).digest("hex");

const VALID_ROLES = new Set(["ADMIN", "ASESOR"]);
const VALID_STATUS = new Set(["ACTIVO", "INACTIVO"]);

const isDevSchema = (schema) => schema === "dev";

const resolveEffectiveRole = (row) => String(row?.rol_global ?? row?.rol ?? "").trim().toUpperCase();

const mapUserRow = (row) => ({
  id: row.id ?? row.usuario_id,
  username: row.username,
  rol: resolveEffectiveRole(row),
  rolLegacy: row.rol ?? null,
  rolGlobal: row.rol_global ?? resolveEffectiveRole(row),
  estado: row.estado,
  nombres: row.nombres,
  apellidos: row.apellidos,
  telefono: row.telefono,
  proyectoId: row.proyecto_id ?? null,
  created_at: row.created_at,
  canDelete: row.can_delete ?? true,
});

const getUserByUsername = async (client, schema, username, includePin = false) => {
  const userLower = String(username || "").trim().toLowerCase();
  if (!userLower) {
    return null;
  }

  if (isDevSchema(schema)) {
    const columns = [
      "id",
      "username",
      "rol",
      "rol_global",
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
      [userLower]
    );

    return result.rows[0] ?? null;
  }

  const columns = ["id", "username", "rol", "estado", "nombres", "apellidos", "telefono", "created_at"];
  if (includePin) {
    columns.splice(2, 0, "pin_hash");
  }

  const result = await client.query(
    `select ${columns.join(", ")}
       from ${schema}.usuarios
      where username = $1
      limit 1`,
    [userLower]
  );

  return result.rows[0] ?? null;
};

const verifyAdminAsync = async (username, pin) => {
  const schema = resolveDbSchema();
  return withPgClient(async (client) => {
    const admin = await getUserByUsername(client, schema, username, true);

    if (!admin) throw forbidden("Credenciales de administrador invalidas.");
    if (admin.estado !== "ACTIVO") throw forbidden("El administrador se encuentra inactivo.");
    if (admin.pin_hash !== hashPin(pin)) throw forbidden("Credenciales de administrador invalidas.");

    const effectiveRole = resolveEffectiveRole(admin);
    if (effectiveRole !== "ADMIN" && effectiveRole !== "SUPERADMIN") {
      throw forbidden("No tienes permisos de administrador.");
    }

    return admin;
  });
};

const verifySuperadminAsync = async (username, pin) => {
  const admin = await verifyAdminAsync(username, pin);
  if (resolveEffectiveRole(admin) !== "SUPERADMIN") {
    throw forbidden("Solo SUPERADMIN puede administrar equipos.");
  }
  return admin;
};

const resolveVisibleProjectIdAsync = async (client, schema, actor, requestedProjectId = null) => {
  if (!isDevSchema(schema)) return null;

  const visibleResult = await client.query(
    `select *
       from ${schema}.fn_proyectos_visibles_app($1::uuid)
      order by nombre asc`,
    [actor.id]
  );

  const visibleRows = visibleResult.rows;
  const requestedRef = String(requestedProjectId || "").trim() || null;
  const requestedSlug = requestedRef
    ? requestedRef
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : null;
  const targetRow =
    (requestedRef
      ? visibleRows.find((row) => row.proyecto_id === requestedRef || row.slug === requestedSlug)
      : null) ?? visibleRows[0] ?? null;

  if (!targetRow?.proyecto_id) {
    throw notFound("No hay proyecto visible para el usuario.");
  }
  return targetRow.proyecto_id;
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

    const effectiveRole = resolveEffectiveRole(usuario);
    let frontendRole = "asesor";

    if (effectiveRole === "SUPERADMIN" || effectiveRole === "ADMIN") {
      frontendRole = "admin";
    } else if (effectiveRole === "ASESOR" || effectiveRole === "VENDEDOR") {
      frontendRole = "asesor";
    } else {
      throw forbidden("No tienes un rol valido para acceder al sistema.");
    }

    return {
      id: usuario.id,
      username: usuario.username,
      role: frontendRole,
      rawGlobalRole: effectiveRole,
      nombre: `${usuario.nombres} ${usuario.apellidos}`.trim(),
      telefono: usuario.telefono || "",
    };
  });
};

export const createUserAsync = async (adminUsername, adminPin, nuevoUsuario, requestedProjectRef = null) => {
  const admin = await verifyAdminAsync(adminUsername, adminPin);
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

    let result;
    if (isDevSchema(schema)) {
      result = await client.query(
        `insert into ${schema}.usuarios (
           username, pin_hash, rol, rol_global, nombres, apellidos, telefono, estado
         ) values ($1, $2, $3, $4, $5, $6, $7, 'ACTIVO')
         returning id, username, rol, rol_global, estado, nombres, apellidos, telefono, created_at`,
        [
          userLower,
          hashPin(pin),
          rolUpper,
          rolUpper,
          String(nombres).trim(),
          String(apellidos || "").trim(),
          String(telefono || "").trim(),
        ]
      );
    } else {
      result = await client.query(
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
    }

    const createdUser = mapUserRow(result.rows[0]);

    if (isDevSchema(schema)) {
      const targetProjectId = await resolveVisibleProjectIdAsync(
        client,
        schema,
        admin,
        requestedProjectRef ?? nuevoUsuario?.proyectoId ?? null
      );
      await client.query(
        `insert into ${schema}.proyecto_usuarios (proyecto_id, usuario_id, acceso_activo)
         values ($1, $2, true)
         on conflict (proyecto_id, usuario_id)
         do update set acceso_activo = true, updated_at = now()`,
        [targetProjectId, createdUser.id]
      );
    }

    return createdUser;
  });
};

export const listUsersAsync = async (adminUsername, adminPin, requestedProjectRef = null) => {
  const admin = await verifyAdminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();
  const actorRole = resolveEffectiveRole(admin);

  return withPgClient(async (client) => {
    if (isDevSchema(schema)) {
      const targetProjectId = await resolveVisibleProjectIdAsync(client, schema, admin, requestedProjectRef);
      const result = await client.query(
        `select *
           from ${schema}.fn_usuarios_visibles_app($1::uuid, $2::uuid)
          order by nombres asc nulls last, apellidos asc nulls last, username asc`,
        [admin.id, targetProjectId]
      );
      return result.rows.map((row) => {
        const mapped = mapUserRow(row);
        const targetRole = resolveEffectiveRole(row);
        return {
          ...mapped,
          canDelete: mapped.id !== admin.id && !(targetRole === "SUPERADMIN" && actorRole !== "SUPERADMIN"),
        };
      });
    }

    const result = await client.query(
      `select id, username, rol, estado, nombres, apellidos, telefono, created_at
         from ${schema}.usuarios
        order by created_at asc`
    );
    return result.rows.map((row) => ({ ...mapUserRow(row), canDelete: row.id !== admin.id }));
  });
};

export const getUserCatalogsAsync = async (adminUsername, adminPin, requestedProjectRef = null) => {
  const admin = await verifyAdminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();

  return withPgClient(async (client) => {
    if (isDevSchema(schema)) {
      const targetProjectId = await resolveVisibleProjectIdAsync(client, schema, admin, requestedProjectRef);
      const result = await client.query(
        `select distinct rol_global, estado
           from ${schema}.fn_usuarios_visibles_app($1::uuid, $2::uuid)`,
        [admin.id, targetProjectId]
      );

      const roles = Array.from(new Set([...result.rows.map((item) => item.rol_global).filter(Boolean), ...Array.from(VALID_ROLES)]));
      const statuses = Array.from(new Set([...result.rows.map((item) => item.estado).filter(Boolean), ...Array.from(VALID_STATUS)]));
      return { roles, statuses };
    }

    const result = await client.query(`select rol, estado from ${schema}.usuarios`);
    const roles = Array.from(new Set([...result.rows.map((item) => item.rol).filter(Boolean), ...Array.from(VALID_ROLES)]));
    const statuses = Array.from(new Set([...result.rows.map((item) => item.estado).filter(Boolean), ...Array.from(VALID_STATUS)]));
    return { roles, statuses };
  });
};

export const updateUserAsync = async (adminUsername, adminPin, userId, patchInput, requestedProjectRef = null) => {
  const admin = await verifyAdminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();
  const id = String(userId || "").trim();

  if (!id) {
    throw badRequest("Falta id de usuario.");
  }

  return withPgTransaction(async (client) => {
    let targetProjectId = null;
    if (isDevSchema(schema)) {
      targetProjectId = await resolveVisibleProjectIdAsync(client, schema, admin, requestedProjectRef);
    }

    let existingResult;
    if (isDevSchema(schema)) {
      existingResult = await client.query(
        `select id, username, rol, rol_global, estado
           from ${schema}.usuarios
          where id = $1
          for update`,
        [id]
      );
    } else {
      existingResult = await client.query(
        `select id, username, rol, estado
           from ${schema}.usuarios
          where id = $1
          for update`,
        [id]
      );
    }

    const existing = existingResult.rows[0];
    if (!existing) {
      throw notFound("Usuario no encontrado.");
    }

    if (isDevSchema(schema)) {
      const visibleUserResult = await client.query(
        `select 1
           from ${schema}.fn_usuarios_visibles_app($1::uuid, $2::uuid)
          where id = $3
          limit 1`,
        [admin.id, targetProjectId, id]
      );
      if (visibleUserResult.rowCount === 0) {
        throw forbidden("El usuario no pertenece al proyecto visible.");
      }
    }

    if (isDevSchema(schema) && resolveEffectiveRole(existing) === "SUPERADMIN" && resolveEffectiveRole(admin) !== "SUPERADMIN") {
      throw forbidden("No tienes permisos para modificar un superadmin.");
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
      if (isDevSchema(schema)) {
        nextData.rol_global = role;
      }
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
        `select id, username, rol${isDevSchema(schema) ? ", rol_global" : ""}, estado, nombres, apellidos, telefono, created_at
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
        returning id, username, rol${isDevSchema(schema) ? ", rol_global" : ""}, estado, nombres, apellidos, telefono, created_at`,
      values
    );

    return mapUserRow(updated.rows[0]);
  });
};

export const deleteUserAsync = async (adminUsername, adminPin, userId, requestedProjectRef = null) => {
  const admin = await verifyAdminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();
  const id = String(userId || "").trim();

  if (!id) {
    throw badRequest("Falta id de usuario.");
  }

  return withPgTransaction(async (client) => {
    let targetProjectId = null;
    if (isDevSchema(schema)) {
      targetProjectId = await resolveVisibleProjectIdAsync(client, schema, admin, requestedProjectRef);
      const visibleUserResult = await client.query(
        `select 1
           from ${schema}.fn_usuarios_visibles_app($1::uuid, $2::uuid)
          where id = $3
          limit 1`,
        [admin.id, targetProjectId, id]
      );
      if (visibleUserResult.rowCount === 0) {
        throw forbidden("El usuario no pertenece al proyecto visible.");
      }
    }

    const existingResult = await client.query(
      `select id, username, rol, ${isDevSchema(schema) ? "rol_global," : ""} estado
         from ${schema}.usuarios
        where id = $1
        for update`,
      [id]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      throw notFound("Usuario no encontrado.");
    }

    if (existing.id === admin.id) {
      throw forbidden("No puedes eliminar tu propio usuario.");
    }

    const targetRole = resolveEffectiveRole(existing);
    const actorRole = resolveEffectiveRole(admin);
    if (targetRole === "SUPERADMIN" && actorRole !== "SUPERADMIN") {
      throw forbidden("No tienes permisos para eliminar un superadmin.");
    }

    const hasSales = await client.query(
      `select exists(select 1 from ${schema}.ventas where asesor_id = $1) as yes`,
      [id]
    );
    if (hasSales.rows[0]?.yes) {
      throw conflict("No se puede eliminar el usuario porque tiene ventas asociadas. Inactivalo en su lugar.");
    }

    const hasHistory = await client.query(
      `select exists(select 1 from ${schema}.venta_estado_historial where usuario_id = $1) as yes`,
      [id]
    );
    if (hasHistory.rows[0]?.yes) {
      throw conflict("No se puede eliminar el usuario porque tiene historial operativo. Inactivalo en su lugar.");
    }

    if (isDevSchema(schema)) {
      await client.query(`update ${schema}.equipos set admin_id = null where admin_id = $1`, [id]);
    }

    await client.query(`delete from ${schema}.usuarios where id = $1`, [id]);
    return { success: true };
  });
};

const mapTeamMemberRow = (row) => ({
  userId: row.usuario_id,
  username: row.username,
  nombre: `${row.nombres ?? ""} ${row.apellidos ?? ""}`.trim() || row.username,
  rol: resolveEffectiveRole(row),
  estado: row.estado,
});

const mapTeamRow = (row, members) => ({
  id: row.id,
  proyectoId: row.proyecto_id,
  nombre: row.nombre,
  adminId: row.admin_id ?? null,
  adminNombre: row.admin_nombre ?? null,
  estado: Boolean(row.estado),
  createdAt: row.created_at,
  members,
});

export const listTeamsAsync = async (adminUsername, adminPin, requestedProjectRef = null) => {
  const admin = await verifySuperadminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();

  return withPgClient(async (client) => {
    const targetProjectId = await resolveVisibleProjectIdAsync(client, schema, admin, requestedProjectRef);

    const usersResult = await client.query(
      `select *
         from ${schema}.fn_usuarios_visibles_app($1::uuid, $2::uuid)
        where coalesce(rol_global::text, '') <> 'SUPERADMIN'
        order by nombres asc nulls last, apellidos asc nulls last, username asc`,
      [admin.id, targetProjectId]
    );

    const teamsResult = await client.query(
      `select
         e.id,
         e.proyecto_id,
         e.nombre,
         e.admin_id,
         e.estado,
         e.created_at,
         trim(concat_ws(' ', ua.nombres, ua.apellidos)) as admin_nombre
       from ${schema}.equipos e
       left join ${schema}.usuarios ua on ua.id = e.admin_id
      where e.proyecto_id = $1
      order by e.nombre asc`,
      [targetProjectId]
    );

    const teamIds = teamsResult.rows.map((row) => row.id);
    const membersByTeam = new Map();

    if (teamIds.length > 0) {
      const membersResult = await client.query(
        `select
           eu.equipo_id,
           u.id as usuario_id,
           u.username,
           u.nombres,
           u.apellidos,
           u.rol,
           u.rol_global,
           u.estado
         from ${schema}.equipo_usuarios eu
         join ${schema}.usuarios u on u.id = eu.usuario_id
        where eu.equipo_id = any($1::uuid[])
          and eu.activo = true
        order by u.nombres asc nulls last, u.apellidos asc nulls last, u.username asc`,
        [teamIds]
      );

      for (const row of membersResult.rows) {
        const current = membersByTeam.get(row.equipo_id) ?? [];
        current.push(mapTeamMemberRow(row));
        membersByTeam.set(row.equipo_id, current);
      }
    }

    return {
      proyectoId: targetProjectId,
      users: usersResult.rows.map(mapUserRow),
      teams: teamsResult.rows.map((row) => mapTeamRow(row, membersByTeam.get(row.id) ?? [])),
    };
  });
};

const sanitizeTeamPayload = (payload) => ({
  nombre: String(payload?.nombre || "").trim(),
  adminId: payload?.adminId ? String(payload.adminId).trim() : null,
  memberIds: Array.isArray(payload?.memberIds)
    ? [...new Set(payload.memberIds.map((item) => String(item || "").trim()).filter(Boolean))]
    : [],
  estado: payload?.estado === undefined ? true : Boolean(payload.estado),
  proyectoId: payload?.proyectoId ? String(payload.proyectoId).trim() : null,
});

const ensureAssignableUsers = async (client, schema, actor, projectId, adminId, memberIds) => {
  const visibleUsers = await client.query(
    `select *
       from ${schema}.fn_usuarios_visibles_app($1::uuid, $2::uuid)
      where coalesce(rol_global::text, '') <> 'SUPERADMIN'`,
    [actor.id, projectId]
  );

  const validUserIds = new Set(visibleUsers.rows.map((row) => row.id ?? row.usuario_id));
  if (adminId && !validUserIds.has(adminId)) {
    throw forbidden("El responsable del equipo no es visible para el proyecto.");
  }
  for (const memberId of memberIds) {
    if (!validUserIds.has(memberId)) {
      throw forbidden("Uno o mas miembros del equipo no son visibles para el proyecto.");
    }
  }
};

export const createTeamAsync = async (adminUsername, adminPin, payload, requestedProjectRef = null) => {
  const admin = await verifySuperadminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();

  return withPgTransaction(async (client) => {
    const data = sanitizeTeamPayload(payload);
    if (!data.nombre) {
      throw badRequest("El nombre del equipo es obligatorio.");
    }
    const targetProjectId = await resolveVisibleProjectIdAsync(
      client,
      schema,
      admin,
      requestedProjectRef ?? data.proyectoId
    );
    await ensureAssignableUsers(client, schema, admin, targetProjectId, data.adminId, data.memberIds);

    const inserted = await client.query(
      `insert into ${schema}.equipos (proyecto_id, nombre, admin_id, estado)
       values ($1, $2, $3, $4)
       returning id`,
      [targetProjectId, data.nombre, data.adminId, data.estado]
    );
    const teamId = inserted.rows[0]?.id;

    if (data.memberIds.length > 0) {
      await client.query(
        `insert into ${schema}.equipo_usuarios (equipo_id, usuario_id, activo, fecha_inicio, fecha_fin)
         select $1, item::uuid, true, current_date, null
           from unnest($2::uuid[]) as item
         on conflict (equipo_id, usuario_id)
         do update set activo = true, fecha_fin = null, updated_at = now()`,
        [teamId, data.memberIds]
      );
    }

    const result = await listTeamsAsync(adminUsername, adminPin, targetProjectId);
    return result;
  });
};

export const updateTeamAsync = async (adminUsername, adminPin, teamId, payload, requestedProjectRef = null) => {
  const admin = await verifySuperadminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();
  const targetTeamId = String(teamId || "").trim();
  if (!targetTeamId) {
    throw badRequest("Falta id del equipo.");
  }

  return withPgTransaction(async (client) => {
    const existingResult = await client.query(
      `select *
         from ${schema}.equipos
        where id = $1
        for update`,
      [targetTeamId]
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      throw notFound("Equipo no encontrado.");
    }

    const visibleProjectId = await resolveVisibleProjectIdAsync(
      client,
      schema,
      admin,
      requestedProjectRef ?? existing.proyecto_id
    );
    const data = sanitizeTeamPayload(payload);
    const nextName = data.nombre || existing.nombre;
    const nextAdminId = data.adminId === null ? null : data.adminId ?? existing.admin_id ?? null;
    const nextEstado = payload?.estado === undefined ? Boolean(existing.estado) : data.estado;
    const nextMemberIds = Array.isArray(payload?.memberIds)
      ? data.memberIds
      : (
          await client.query(
            `select usuario_id
               from ${schema}.equipo_usuarios
              where equipo_id = $1
                and activo = true`,
            [targetTeamId]
          )
        ).rows.map((row) => row.usuario_id);

    await ensureAssignableUsers(client, schema, admin, visibleProjectId, nextAdminId, nextMemberIds);

    await client.query(
      `update ${schema}.equipos
          set nombre = $2,
              admin_id = $3,
              estado = $4
        where id = $1`,
      [targetTeamId, nextName, nextAdminId, nextEstado]
    );

    if (Array.isArray(payload?.memberIds)) {
      if (nextMemberIds.length > 0) {
        await client.query(
          `update ${schema}.equipo_usuarios
              set activo = false,
                  fecha_fin = current_date,
                  updated_at = now()
            where equipo_id = $1
              and activo = true
              and usuario_id <> all($2::uuid[])`,
          [targetTeamId, nextMemberIds]
        );

        await client.query(
          `insert into ${schema}.equipo_usuarios (equipo_id, usuario_id, activo, fecha_inicio, fecha_fin)
           select $1, item::uuid, true, current_date, null
             from unnest($2::uuid[]) as item
           on conflict (equipo_id, usuario_id)
           do update set activo = true, fecha_fin = null, updated_at = now()`,
          [targetTeamId, nextMemberIds]
        );
      } else {
        await client.query(
          `update ${schema}.equipo_usuarios
              set activo = false,
                  fecha_fin = current_date,
                  updated_at = now()
            where equipo_id = $1
              and activo = true`,
          [targetTeamId]
        );
      }
    }

    const result = await listTeamsAsync(adminUsername, adminPin, visibleProjectId);
    return result;
  });
};

export const deleteTeamAsync = async (adminUsername, adminPin, teamId, requestedProjectRef = null) => {
  const admin = await verifySuperadminAsync(adminUsername, adminPin);
  const schema = resolveDbSchema();
  const targetTeamId = String(teamId || "").trim();
  if (!targetTeamId) {
    throw badRequest("Falta id del equipo.");
  }

  return withPgTransaction(async (client) => {
    const existingResult = await client.query(
      `select id, proyecto_id, nombre
         from ${schema}.equipos
        where id = $1
        for update`,
      [targetTeamId]
    );
    const existing = existingResult.rows[0];
    if (!existing) {
      throw notFound("Equipo no encontrado.");
    }

    const visibleProjectId = await resolveVisibleProjectIdAsync(
      client,
      schema,
      admin,
      requestedProjectRef ?? existing.proyecto_id
    );

    if (existing.proyecto_id !== visibleProjectId) {
      throw forbidden("El equipo no pertenece al proyecto visible.");
    }

    await client.query(`delete from ${schema}.equipos where id = $1`, [targetTeamId]);
    return listTeamsAsync(adminUsername, adminPin, visibleProjectId);
  });
};
