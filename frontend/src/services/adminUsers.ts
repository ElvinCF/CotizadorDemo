import type {
  AdminTeamPayload,
  AdminTeamsPayload,
  AdminUser,
  AdminUserCatalogs,
  AdminUserPayload,
} from "../domain/adminUsers";

type AdminCredentials = {
  username: string | null;
  pin: string | null;
};

type ProjectScopeOptions = {
  slug?: string | null;
  projectId?: string | null;
};

type StoredAuthSession = {
  loginUsername?: string | null;
  loginPin?: string | null;
};

const readStoredCredentials = (): AdminCredentials => {
  if (typeof window === "undefined") {
    return { username: null, pin: null };
  }

  try {
    const raw = window.localStorage.getItem("auth_session");
    if (!raw) {
      return { username: null, pin: null };
    }

    const session = JSON.parse(raw) as StoredAuthSession;
    return {
      username: session.loginUsername ?? null,
      pin: session.loginPin ?? null,
    };
  } catch {
    return { username: null, pin: null };
  }
};

const resolveCredentials = (credentials?: Partial<AdminCredentials>) => {
  const stored = readStoredCredentials();
  return {
    username: credentials?.username ?? stored.username ?? null,
    pin: credentials?.pin ?? stored.pin ?? null,
  };
};

const ensureCredentials = (credentials: AdminCredentials) => {
  if (!credentials.username || !credentials.pin) {
    throw new Error("Tu sesion de administrador no tiene credenciales vigentes. Cierra sesion e ingresa de nuevo.");
  }
  return credentials;
};

const buildHeaders = (credentials: AdminCredentials) => ({
  "Content-Type": "application/json",
  "x-admin-user": credentials.username ?? "",
  "x-admin-pin": credentials.pin ?? "",
});

const appendProjectQuery = (basePath: string, options?: ProjectScopeOptions) => {
  const query = new URLSearchParams();
  const slug = String(options?.slug || "").trim();
  const projectId = String(options?.projectId || "").trim();
  if (slug) query.set("slug", slug);
  if (projectId) query.set("proyectoId", projectId);
  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
};

const parseJsonSafe = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const buildError = async (response: Response, fallback: string) => {
  const payload = await parseJsonSafe(response);
  return new Error(payload.error || fallback);
};

export const listAdminUsers = async (credentials: AdminCredentials, options?: ProjectScopeOptions) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch(appendProjectQuery("/api/usuarios", options), {
    headers: {
      "x-admin-user": resolved.username ?? "",
      "x-admin-pin": resolved.pin ?? "",
    },
  });

  if (!response.ok) {
    throw await buildError(response, `Error al cargar usuarios (${response.status})`);
  }

  const payload = (await response.json()) as {
    users?: AdminUser[];
    catalogs?: AdminUserCatalogs;
  };

  return {
    users: Array.isArray(payload.users) ? payload.users : [],
    catalogs: payload.catalogs ?? { roles: ["ADMIN", "ASESOR"], statuses: ["ACTIVO", "INACTIVO"] },
  };
};

export const createAdminUser = async (
  credentials: AdminCredentials,
  nuevoUsuario: AdminUserPayload,
  options?: ProjectScopeOptions
) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch(appendProjectQuery("/api/usuarios", options), {
    method: "POST",
    headers: buildHeaders(resolved),
    body: JSON.stringify({ nuevoUsuario }),
  });

  if (!response.ok) {
    throw await buildError(response, `Error al crear usuario (${response.status})`);
  }

  const payload = (await response.json()) as { user?: AdminUser };
  return payload.user ?? null;
};

export const updateAdminUser = async (
  credentials: AdminCredentials,
  userId: string,
  patch: AdminUserPayload,
  options?: ProjectScopeOptions
) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch(appendProjectQuery("/api/usuarios", options), {
    method: "PUT",
    headers: buildHeaders(resolved),
    body: JSON.stringify({ id: userId, patch }),
  });

  if (!response.ok) {
    throw await buildError(response, `Error al actualizar usuario (${response.status})`);
  }

  const payload = (await response.json()) as { user?: AdminUser };
  return payload.user ?? null;
};

export const deleteAdminUser = async (
  credentials: AdminCredentials,
  userId: string,
  options?: ProjectScopeOptions
) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch(appendProjectQuery(`/api/usuarios/${userId}`, options), {
    method: "DELETE",
    headers: buildHeaders(resolved),
  });

  if (!response.ok) {
    throw await buildError(response, `Error al eliminar usuario (${response.status})`);
  }

  const payload = (await response.json()) as { success?: boolean };
  return Boolean(payload.success);
};

export const listAdminTeams = async (credentials: AdminCredentials, options?: ProjectScopeOptions) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch(appendProjectQuery("/api/equipos", options), {
    headers: {
      "x-admin-user": resolved.username ?? "",
      "x-admin-pin": resolved.pin ?? "",
    },
  });

  if (!response.ok) {
    throw await buildError(response, `Error al cargar equipos (${response.status})`);
  }

  const payload = (await response.json()) as Partial<AdminTeamsPayload>;
  return {
    proyectoId: payload.proyectoId ?? "",
    users: Array.isArray(payload.users) ? payload.users : [],
    teams: Array.isArray(payload.teams) ? payload.teams : [],
  };
};

export const createAdminTeam = async (
  credentials: AdminCredentials,
  team: AdminTeamPayload,
  options?: ProjectScopeOptions
) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch(appendProjectQuery("/api/equipos", options), {
    method: "POST",
    headers: buildHeaders(resolved),
    body: JSON.stringify(team),
  });

  if (!response.ok) {
    throw await buildError(response, `Error al crear equipo (${response.status})`);
  }

  const payload = (await response.json()) as Partial<AdminTeamsPayload>;
  return {
    proyectoId: payload.proyectoId ?? "",
    users: Array.isArray(payload.users) ? payload.users : [],
    teams: Array.isArray(payload.teams) ? payload.teams : [],
  };
};

export const updateAdminTeam = async (
  credentials: AdminCredentials,
  teamId: string,
  team: AdminTeamPayload,
  options?: ProjectScopeOptions
) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch(appendProjectQuery(`/api/equipos/${teamId}`, options), {
    method: "PUT",
    headers: buildHeaders(resolved),
    body: JSON.stringify(team),
  });

  if (!response.ok) {
    throw await buildError(response, `Error al actualizar equipo (${response.status})`);
  }

  const payload = (await response.json()) as Partial<AdminTeamsPayload>;
  return {
    proyectoId: payload.proyectoId ?? "",
    users: Array.isArray(payload.users) ? payload.users : [],
    teams: Array.isArray(payload.teams) ? payload.teams : [],
  };
};

export const deleteAdminTeam = async (
  credentials: AdminCredentials,
  teamId: string,
  options?: ProjectScopeOptions
) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch(appendProjectQuery(`/api/equipos/${teamId}`, options), {
    method: "DELETE",
    headers: buildHeaders(resolved),
  });

  if (!response.ok) {
    throw await buildError(response, `Error al eliminar equipo (${response.status})`);
  }

  const payload = (await response.json()) as Partial<AdminTeamsPayload>;
  return {
    proyectoId: payload.proyectoId ?? "",
    users: Array.isArray(payload.users) ? payload.users : [],
    teams: Array.isArray(payload.teams) ? payload.teams : [],
  };
};
