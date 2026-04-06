import type { Lote } from "../domain/types";

const appendProjectQuery = (basePath: string, slug?: string | null, projectId?: string | null) => {
  const query = new URLSearchParams();
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const normalizedProjectId = String(projectId || "").trim();
  if (normalizedSlug) query.set("slug", normalizedSlug);
  if (normalizedProjectId) query.set("proyectoId", normalizedProjectId);
  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
};

export const loadLotesFromApi = async (options?: { slug?: string | null; projectId?: string | null }): Promise<Lote[]> => {
  const response = await fetch(appendProjectQuery("/api/lotes", options?.slug, options?.projectId), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar lotes: ${response.status}`);
  }
  const payload = (await response.json()) as { items?: Lote[] };
  return Array.isArray(payload.items) ? payload.items : [];
};

type StoredAuthSession = {
  loginUsername?: string | null;
  loginPin?: string | null;
};

const readStoredCredentials = () => {
  if (typeof window === "undefined") {
    return { username: null, pin: null };
  }

  try {
    const raw = window.localStorage.getItem("auth_session");
    if (!raw) return { username: null, pin: null };
    const session = JSON.parse(raw) as StoredAuthSession;
    return {
      username: session.loginUsername ?? null,
      pin: session.loginPin ?? null,
    };
  } catch {
    return { username: null, pin: null };
  }
};

const buildAuthHeaders = () => {
  const credentials = readStoredCredentials();
  if (!credentials.username || !credentials.pin) {
    throw new Error("Tu sesion no tiene credenciales vigentes. Cierra sesion e ingresa nuevamente.");
  }
  return {
    "Content-Type": "application/json",
    "x-auth-user": credentials.username,
    "x-auth-pin": credentials.pin,
  };
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

export const loadAdminLotesFromApi = async (options?: { slug?: string | null; projectId?: string | null }): Promise<Lote[]> => {
  const response = await fetch(appendProjectQuery("/api/lotes/admin", options?.slug, options?.projectId), {
    headers: buildAuthHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw await buildError(response, `No se pudo cargar lotes internos: ${response.status}`);
  }
  const payload = (await response.json()) as { items?: Lote[] };
  return Array.isArray(payload.items) ? payload.items : [];
};

export const updateLoteConfig = async (
  loteId: string,
  payload: {
    precioReferencial?: number | null;
    precioMinimo?: number | null;
    estado?: string;
    esEsquina?: boolean | null;
    esMedianero?: boolean | null;
    frenteParque?: boolean | null;
    frenteViaPrincipal?: boolean | null;
  }
) => {
  const response = await fetch(`/api/lotes/${encodeURIComponent(loteId)}/config`, {
    method: "PUT",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo actualizar la configuracion del lote: ${response.status}`);
  }

  const result = (await response.json()) as { item?: Lote };
  if (!result.item) {
    throw new Error("La API no devolvio el lote actualizado.");
  }
  return result.item;
};

export const updateLoteStatusMassive = async (
  loteIds: string[],
  estado: string,
  options?: { slug?: string | null; projectId?: string | null }
) => {
  const response = await fetch(appendProjectQuery("/api/lotes/estado-masivo", options?.slug, options?.projectId), {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ loteIds, estado }),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo actualizar el estado de los lotes: ${response.status}`);
  }

  const result = (await response.json()) as { items?: Lote[] };
  return Array.isArray(result.items) ? result.items : [];
};
