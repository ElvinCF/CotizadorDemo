import type { CompanySettings, ProjectContextBundle, ProjectContextResponse, ProjectVisualResponse } from "../domain/projectContext";

type AuthCredentials = {
  username: string | null;
  pin: string | null;
};

type StoredAuthSession = {
  loginUsername?: string | null;
  loginPin?: string | null;
};

type ContextRequestOptions = {
  slug?: string | null;
  projectId?: string | null;
  force?: boolean;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const CONTEXT_CACHE_TTL_MS = 45_000;
const ACTIVE_PROJECT_SESSION_KEY = "active_project_slug";
const publicContextCache = new Map<string, CacheEntry<ProjectContextResponse>>();
const privateContextCache = new Map<string, CacheEntry<ProjectContextResponse>>();
const publicVisualCache = new Map<string, CacheEntry<ProjectVisualResponse>>();
const privateVisualCache = new Map<string, CacheEntry<ProjectVisualResponse>>();

const readStoredCredentials = (): AuthCredentials => {
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

const normalizeSlug = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const readPreferredProjectSlug = () => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return normalizeSlug(window.sessionStorage.getItem(ACTIVE_PROJECT_SESSION_KEY));
  } catch {
    return "";
  }
};

export const writePreferredProjectSlug = (slug?: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const normalized = normalizeSlug(slug);
    if (!normalized) {
      window.sessionStorage.removeItem(ACTIVE_PROJECT_SESSION_KEY);
      return;
    }
    window.sessionStorage.setItem(ACTIVE_PROJECT_SESSION_KEY, normalized);
  } catch {
    // no-op
  }
};

export const clearPreferredProjectSlug = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(ACTIVE_PROJECT_SESSION_KEY);
  } catch {
    // no-op
  }
};

const buildAuthHeaders = (credentials?: Partial<AuthCredentials>) => {
  const stored = readStoredCredentials();
  const username = credentials?.username ?? stored.username ?? "";
  const pin = credentials?.pin ?? stored.pin ?? "";
  return {
    "Content-Type": "application/json",
    "x-auth-user": username,
    "x-auth-pin": pin,
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

const getCached = <T>(store: Map<string, CacheEntry<T>>, key: string) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = <T>(store: Map<string, CacheEntry<T>>, key: string, value: T) => {
  store.set(key, { value, expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS });
  return value;
};

const buildPublicCacheKey = (slug?: string | null) => `public:${normalizeSlug(slug) || "__default__"}`;
const buildPrivateCacheKey = (slug?: string | null, projectId?: string | null) => {
  const auth = readStoredCredentials();
  return `private:${auth.username || "anon"}:${normalizeSlug(slug) || "__default__"}:${String(projectId || "")}`;
};

const appendContextQuery = (basePath: string, options?: ContextRequestOptions) => {
  const query = new URLSearchParams();
  const slug = normalizeSlug(options?.slug);
  const projectId = String(options?.projectId || "").trim();
  if (slug) query.set("slug", slug);
  if (projectId) query.set("proyectoId", projectId);
  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
};

export const invalidateProjectContextCache = () => {
  publicContextCache.clear();
  privateContextCache.clear();
  publicVisualCache.clear();
  privateVisualCache.clear();
};

export const getPublicProjectVisual = async (options?: ContextRequestOptions) => {
  const cacheKey = buildPublicCacheKey(options?.slug);
  if (!options?.force) {
    const cached = getCached(publicVisualCache, cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(appendContextQuery("/api/contexto/visual/publico", options), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo cargar bootstrap visual publico (${response.status})`);
  }

  const payload = (await response.json()) as { item?: ProjectVisualResponse };
  return setCached(publicVisualCache, cacheKey, payload.item ?? { visual: null });
};

export const getProjectVisual = async (options?: ContextRequestOptions) => {
  const cacheKey = buildPrivateCacheKey(options?.slug, options?.projectId);
  if (!options?.force) {
    const cached = getCached(privateVisualCache, cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(appendContextQuery("/api/contexto/visual/proyecto", options), {
    headers: buildAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo cargar bootstrap visual del proyecto (${response.status})`);
  }

  const payload = (await response.json()) as { item?: ProjectVisualResponse };
  return setCached(privateVisualCache, cacheKey, payload.item ?? { visual: null });
};

export const getPublicProjectContext = async (options?: ContextRequestOptions) => {
  const cacheKey = buildPublicCacheKey(options?.slug);
  if (!options?.force) {
    const cached = getCached(publicContextCache, cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(appendContextQuery("/api/contexto/publico", options), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo cargar contexto publico (${response.status})`);
  }

  const payload = (await response.json()) as { item?: ProjectContextResponse };
  return setCached(publicContextCache, cacheKey, payload.item ?? { proyectos: [], contexto: null });
};

export const getProjectContext = async (options?: ContextRequestOptions) => {
  const cacheKey = buildPrivateCacheKey(options?.slug, options?.projectId);
  if (!options?.force) {
    const cached = getCached(privateContextCache, cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(appendContextQuery("/api/contexto/proyecto", options), {
    headers: buildAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo cargar contexto del proyecto (${response.status})`);
  }

  const payload = (await response.json()) as { item?: ProjectContextResponse };
  return setCached(privateContextCache, cacheKey, payload.item ?? { proyectos: [], contexto: null });
};

export const getProjectSettings = async (options?: ContextRequestOptions) => {
  const response = await fetch(appendContextQuery("/api/proyecto", options), {
    headers: buildAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo cargar proyecto (${response.status})`);
  }

  const payload = (await response.json()) as { item?: ProjectContextResponse };
  return payload.item ?? { proyectos: [], contexto: null };
};

export const createProject = async (values: Record<string, unknown>) => {
  const response = await fetch("/api/proyectos", {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo crear proyecto (${response.status})`);
  }

  const payload = (await response.json()) as { item?: ProjectContextResponse };
  invalidateProjectContextCache();
  return payload.item ?? { proyectos: [], contexto: null };
};

export const updateProjectBase = async (values: Record<string, unknown>, options?: ContextRequestOptions) => {
  const response = await fetch(appendContextQuery("/api/proyecto", options), {
    method: "PUT",
    headers: buildAuthHeaders(),
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo actualizar proyecto (${response.status})`);
  }

  const payload = (await response.json()) as { item?: ProjectContextResponse };
  invalidateProjectContextCache();
  return payload.item ?? { proyectos: [], contexto: null };
};

export const updateProjectUi = async (values: Record<string, unknown>, options?: ContextRequestOptions) => {
  const response = await fetch(appendContextQuery("/api/proyecto/config-ui", options), {
    method: "PUT",
    headers: buildAuthHeaders(),
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo actualizar configuracion UI (${response.status})`);
  }

  const payload = (await response.json()) as { item?: ProjectContextResponse };
  invalidateProjectContextCache();
  return payload.item ?? { proyectos: [], contexto: null };
};

export const getProjectUiCopySource = async (
  section: "assets" | "branding" | "socials" | "highlights",
  sourceSlug: string,
) => {
  const query = new URLSearchParams();
  query.set("section", section);
  query.set("sourceSlug", normalizeSlug(sourceSlug));

  const response = await fetch(`/api/proyecto/config-ui/copy-source?${query.toString()}`, {
    headers: buildAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo cargar origen de UI (${response.status})`);
  }

  const payload = (await response.json()) as {
    item?: {
      sourceProject?: { id?: string; slug?: string; nombre?: string; etapa?: string };
      section?: string;
      values?: Record<string, unknown>;
    };
  };

  if (!payload.item) {
    throw new Error("La API no devolvio origen de UI.");
  }

  return payload.item;
};

export const updateProjectCommercial = async (values: Record<string, unknown>, options?: ContextRequestOptions) => {
  const response = await fetch(appendContextQuery("/api/proyecto/config-comercial", options), {
    method: "PUT",
    headers: buildAuthHeaders(),
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo actualizar configuracion comercial (${response.status})`);
  }

  const payload = (await response.json()) as { item?: ProjectContextResponse };
  invalidateProjectContextCache();
  return payload.item ?? { proyectos: [], contexto: null };
};

export const getCompanySettings = async () => {
  const response = await fetch("/api/empresa", {
    headers: buildAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo cargar empresa (${response.status})`);
  }

  const payload = (await response.json()) as { item?: CompanySettings };
  if (!payload.item) {
    throw new Error("La API no devolvio empresa.");
  }
  return payload.item;
};

export const updateCompanySettings = async (values: Record<string, unknown>) => {
  const response = await fetch("/api/empresa", {
    method: "PUT",
    headers: buildAuthHeaders(),
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo actualizar empresa (${response.status})`);
  }

  const payload = (await response.json()) as { item?: CompanySettings };
  if (!payload.item) {
    throw new Error("La API no devolvio empresa actualizada.");
  }
  invalidateProjectContextCache();
  return payload.item;
};

export const extractProjectContext = (bundle: ProjectContextResponse | null | undefined): ProjectContextBundle | null =>
  bundle?.contexto ?? null;
