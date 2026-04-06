import { hexToRgba, normalizeHexColor } from "./lotStatePalette";

export type ThemeMode = "light" | "dark";
export type ProjectThemeGroupKey =
  | "background"
  | "surface"
  | "text"
  | "border"
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "info"
  | "danger";

export type ProjectThemePaletteMode = Record<ProjectThemeGroupKey, string>;
export type ProjectThemePaletteState = Record<ThemeMode, ProjectThemePaletteMode>;

export const PROJECT_THEME_GROUPS: Array<{
  key: ProjectThemeGroupKey;
  label: string;
  description: string;
  section: "base" | "brand" | "support";
}> = [
  { key: "background", label: "Fondos", description: "Canvas y fondo global", section: "base" },
  { key: "surface", label: "Superficies", description: "Cards, paneles y contenedores", section: "base" },
  { key: "text", label: "Fuentes", description: "Texto principal y secundario", section: "base" },
  { key: "border", label: "Bordes", description: "Líneas y divisores", section: "base" },
  { key: "primary", label: "Principal", description: "Botones y CTAs principales", section: "brand" },
  { key: "secondary", label: "Secundario", description: "Soporte visual y acentos suaves", section: "brand" },
  { key: "accent", label: "Acento", description: "Destacados y chips activos", section: "brand" },
  { key: "success", label: "Éxito", description: "Confirmaciones y estados positivos", section: "support" },
  { key: "info", label: "Información", description: "Datos, info y destacados neutros", section: "support" },
  { key: "danger", label: "Peligro", description: "Errores, alertas y cierres", section: "support" },
];

export const DEFAULT_PROJECT_THEME_PALETTE: ProjectThemePaletteState = {
  light: {
    background: "#f2ede4",
    surface: "#fffdfa",
    text: "#1c1917",
    border: "#36688d",
    primary: "#f18904",
    secondary: "#36688d",
    accent: "#f3cd05",
    success: "#2d9b59",
    info: "#36688d",
    danger: "#d84532",
  },
  dark: {
    background: "#0d1723",
    surface: "#122030",
    text: "#f1f5f9",
    border: "#78a6c8",
    primary: "#f49f05",
    secondary: "#78a6c8",
    accent: "#f3cd05",
    success: "#54d67d",
    info: "#78a6c8",
    danger: "#ff7a63",
  },
};

export const PROJECT_THEME_VAR_KEYS = [
  "--color-bg",
  "--color-surface",
  "--color-surface-alt",
  "--color-panel",
  "--color-panel-alt",
  "--color-panel-contrast",
  "--color-border",
  "--color-border-strong",
  "--color-text",
  "--color-text-muted",
  "--color-primary",
  "--color-primary-strong",
  "--color-primary-soft",
  "--color-secondary",
  "--color-secondary-strong",
  "--color-accent",
  "--color-accent-contrast",
  "--color-accent-soft",
  "--color-success",
  "--color-success-strong",
  "--color-success-soft",
  "--color-success-subtle",
  "--color-warning",
  "--color-warning-soft",
  "--color-danger",
  "--color-danger-strong",
  "--color-danger-soft",
  "--color-info",
  "--color-info-border",
  "--color-info-soft",
  "--color-muted",
  "--color-muted-strong",
  "--color-overlay",
  "--shadow-elevated",
];

const LEGACY_GROUP_ALIASES: Record<string, ProjectThemeGroupKey> = {
  bg: "background",
  background: "background",
  surface: "surface",
  text: "text",
  border: "border",
  primary: "primary",
  secondary: "secondary",
  accent: "accent",
  success: "success",
  info: "info",
  danger: "danger",
  warning: "accent",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const expandHex = (value: string) => {
  const normalized = normalizeHexColor(value, "#000000").replace("#", "");
  if (normalized.length === 3) {
    return normalized
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }
  return normalized;
};

const hexToRgb = (value: string) => {
  const hex = expandHex(value);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((item) => clamp(Math.round(item), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

const mixHex = (left: string, right: string, rightWeight: number) => {
  const ratio = clamp(rightWeight, 0, 1);
  const a = hexToRgb(left);
  const b = hexToRgb(right);
  return rgbToHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio,
  );
};

const lighten = (value: string, amount: number) => mixHex(value, "#ffffff", amount);
const darken = (value: string, amount: number) => mixHex(value, "#000000", amount);

const luminance = (value: string) => {
  const { r, g, b } = hexToRgb(value);
  const toLinear = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

const contrastText = (value: string) => (luminance(value) > 0.55 ? "#16110a" : "#f8fafc");

const isModeScopedObject = (value: unknown): value is Partial<Record<ThemeMode, Record<string, unknown>>> =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      ("light" in (value as object) || "dark" in (value as object)),
  );

const getModeObject = (value: Record<string, unknown> | null | undefined, mode: ThemeMode) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  if (isModeScopedObject(value)) {
    const scoped = value[mode];
    return scoped && typeof scoped === "object" && !Array.isArray(scoped) ? scoped : {};
  }
  return value;
};

const hasOwnThemeEntries = (value: Record<string, unknown> | null | undefined) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0);

export const hasProjectThemeConfig = (
  themeSeed: Record<string, unknown> | null | undefined,
  themeOverrides: Record<string, unknown> | null | undefined,
) => hasOwnThemeEntries(themeSeed) || hasOwnThemeEntries(themeOverrides);

export const normalizeProjectThemePaletteMode = (
  value: Record<string, unknown> | null | undefined,
  mode: ThemeMode,
): ProjectThemePaletteMode => {
  const defaults = DEFAULT_PROJECT_THEME_PALETTE[mode];
  const source = getModeObject(value, mode);
  const next = { ...defaults };

  for (const [rawKey, rawValue] of Object.entries(source)) {
    if (typeof rawValue !== "string") {
      continue;
    }
    const key = LEGACY_GROUP_ALIASES[rawKey];
    if (!key) {
      continue;
    }
    next[key] = normalizeHexColor(rawValue, defaults[key]);
  }

  return next;
};

export const normalizeProjectThemePaletteState = (
  value: Record<string, unknown> | null | undefined,
): ProjectThemePaletteState => ({
  light: normalizeProjectThemePaletteMode(value, "light"),
  dark: normalizeProjectThemePaletteMode(value, "dark"),
});

export const buildProjectThemeSeedPayload = (value: ProjectThemePaletteState) => ({
  light: value.light,
  dark: value.dark,
});

export const buildProjectThemeScale = (baseColor: string, mode: ThemeMode) => {
  const color = normalizeHexColor(baseColor, "#000000");
  return mode === "light"
    ? [lighten(color, 0.84), lighten(color, 0.62), lighten(color, 0.38), lighten(color, 0.18), color]
    : [lighten(color, 0.18), lighten(color, 0.08), color, darken(color, 0.18), darken(color, 0.42)];
};

export const buildProjectThemeCssVars = (
  value: ProjectThemePaletteState,
  mode: ThemeMode,
) => {
  const palette = value[mode];
  const warning = mixHex(palette.accent, palette.primary, mode === "dark" ? 0.28 : 0.42);
  const overlay = mode === "dark" ? hexToRgba(palette.background, 0.72) : hexToRgba(palette.text, 0.52);

  return {
    "--color-bg": palette.background,
    "--color-surface": palette.surface,
    "--color-surface-alt": mode === "dark" ? lighten(palette.surface, 0.04) : darken(palette.surface, 0.03),
    "--color-panel": mixHex(palette.surface, palette.background, mode === "dark" ? 0.18 : 0.3),
    "--color-panel-alt": mixHex(palette.surface, palette.accent, mode === "dark" ? 0.06 : 0.12),
    "--color-panel-contrast": mixHex(palette.surface, palette.text, mode === "dark" ? 0.08 : 0.04),
    "--color-border": hexToRgba(palette.border, mode === "dark" ? 0.16 : 0.12),
    "--color-border-strong": hexToRgba(palette.border, mode === "dark" ? 0.28 : 0.24),
    "--color-text": palette.text,
    "--color-text-muted": hexToRgba(palette.text, mode === "dark" ? 0.68 : 0.7),
    "--color-primary": palette.primary,
    "--color-primary-strong": mode === "dark" ? lighten(palette.primary, 0.32) : darken(palette.primary, 0.24),
    "--color-primary-soft": hexToRgba(palette.primary, mode === "dark" ? 0.24 : 0.2),
    "--color-secondary": palette.secondary,
    "--color-secondary-strong": mode === "dark" ? lighten(palette.secondary, 0.26) : darken(palette.secondary, 0.18),
    "--color-accent": palette.accent,
    "--color-accent-contrast": contrastText(palette.accent),
    "--color-accent-soft": hexToRgba(palette.accent, mode === "dark" ? 0.18 : 0.16),
    "--color-success": palette.success,
    "--color-success-strong": mode === "dark" ? lighten(palette.success, 0.18) : darken(palette.success, 0.22),
    "--color-success-soft": hexToRgba(palette.success, mode === "dark" ? 0.22 : 0.18),
    "--color-success-subtle": hexToRgba(palette.success, mode === "dark" ? 0.1 : 0.08),
    "--color-warning": warning,
    "--color-warning-soft": hexToRgba(warning, mode === "dark" ? 0.22 : 0.18),
    "--color-danger": palette.danger,
    "--color-danger-strong": mode === "dark" ? lighten(palette.danger, 0.18) : darken(palette.danger, 0.26),
    "--color-danger-soft": hexToRgba(palette.danger, mode === "dark" ? 0.24 : 0.18),
    "--color-info": palette.info,
    "--color-info-border": hexToRgba(palette.info, mode === "dark" ? 0.34 : 0.3),
    "--color-info-soft": hexToRgba(palette.info, mode === "dark" ? 0.16 : 0.12),
    "--color-muted": mode === "dark" ? lighten(palette.border, 0.18) : darken(palette.border, 0.12),
    "--color-muted-strong": mode === "dark" ? lighten(palette.text, 0.1) : darken(palette.text, 0.06),
    "--color-overlay": overlay,
    "--shadow-elevated":
      mode === "dark"
        ? "0 18px 38px rgba(0, 0, 0, 0.42)"
        : "0 10px 26px rgba(30, 41, 59, 0.14)",
  };
};

export const clearProjectThemeCssVars = (style: CSSStyleDeclaration) => {
  for (const cssVar of PROJECT_THEME_VAR_KEYS) {
    style.removeProperty(cssVar);
  }
};

export const applyProjectThemeCssVars = (
  style: CSSStyleDeclaration,
  themeSeed: Record<string, unknown> | null | undefined,
  themeOverrides: Record<string, unknown> | null | undefined,
  mode: ThemeMode,
) => {
  clearProjectThemeCssVars(style);
  if (!hasProjectThemeConfig(themeSeed, themeOverrides)) {
    return;
  }

  const palette = normalizeProjectThemePaletteState(themeSeed);
  const derivedVars = buildProjectThemeCssVars(palette, mode);
  for (const [cssVar, cssValue] of Object.entries(derivedVars)) {
    style.setProperty(cssVar, cssValue);
  }
};
