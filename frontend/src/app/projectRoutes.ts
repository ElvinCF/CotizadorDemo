const RESERVED_ROOT_SEGMENTS = new Set([
  "login",
  "dashboard",
  "lotes",
  "ventas",
  "usuarios",
  "proyecto",
  "empresa",
  "admin",
  "asesor",
  "editor",
  "cotizador",
  "api",
  "assets",
]);

const trimSlashes = (value: string) => String(value || "").replace(/^\/+|\/+$/g, "");

export const normalizeProjectSlug = (value: string | null | undefined) =>
  trimSlashes(String(value || ""))
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const isReservedProjectSlug = (value: string | null | undefined) => {
  const normalized = normalizeProjectSlug(value);
  return !normalized || RESERVED_ROOT_SEGMENTS.has(normalized);
};

export const extractProjectSlugFromPath = (pathname: string) => {
  const [firstSegment] = String(pathname || "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  if (!firstSegment || isReservedProjectSlug(firstSegment)) {
    return null;
  }
  return normalizeProjectSlug(firstSegment);
};

export const buildPublicProjectPath = (slug: string, suffix = "") => {
  const normalizedSlug = normalizeProjectSlug(slug);
  const normalizedSuffix = trimSlashes(suffix);
  return normalizedSuffix ? `/${normalizedSlug}/${normalizedSuffix}` : `/${normalizedSlug}`;
};

export const buildPrivateProjectPath = (slug: string, section: string, suffix = "") => {
  const normalizedSlug = normalizeProjectSlug(slug);
  const normalizedSection = trimSlashes(section);
  const normalizedSuffix = trimSlashes(suffix);
  const base = `/${normalizedSlug}/${normalizedSection}`;
  return normalizedSuffix ? `${base}/${normalizedSuffix}` : base;
};

export const replaceLeadingProjectSlug = (pathname: string, nextSlug: string) => {
  const normalizedNextSlug = normalizeProjectSlug(nextSlug);
  const parts = String(pathname || "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);

  if (parts.length === 0) {
    return `/${normalizedNextSlug}`;
  }

  if (isReservedProjectSlug(parts[0])) {
    return `/${normalizedNextSlug}`;
  }

  parts[0] = normalizedNextSlug;
  return `/${parts.join("/")}`;
};
