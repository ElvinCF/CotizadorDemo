import type { AdminUser, AdminUserCatalogs, AdminUserPayload } from "../domain/adminUsers";

type AdminCredentials = {
  username: string | null;
  pin: string | null;
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

export const listAdminUsers = async (credentials: AdminCredentials) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch("/api/usuarios", {
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

export const createAdminUser = async (credentials: AdminCredentials, nuevoUsuario: AdminUserPayload) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch("/api/usuarios", {
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
  patch: AdminUserPayload
) => {
  const resolved = ensureCredentials(resolveCredentials(credentials));
  const response = await fetch("/api/usuarios", {
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
