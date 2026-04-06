export type LotStatePalette = {
  disponible: string;
  separado: string;
  vendido: string;
  selected: string;
};

export type LotStateOpacityPalette = {
  disponible: number;
  separado: number;
  vendido: number;
  selected: number;
};

export const DEFAULT_LOT_FILL_OPACITY = 0.14;
export const DEFAULT_LOT_FILL_OPACITY_PALETTE: LotStateOpacityPalette = {
  disponible: DEFAULT_LOT_FILL_OPACITY,
  separado: DEFAULT_LOT_FILL_OPACITY,
  vendido: DEFAULT_LOT_FILL_OPACITY,
  selected: DEFAULT_LOT_FILL_OPACITY,
};

export const DEFAULT_LOT_STATE_PALETTE: LotStatePalette = {
  disponible: "#2d9b59",
  separado: "#d67900",
  vendido: "#d84532",
  selected: "#2f8cff",
};

export const normalizeHexColor = (value: string | null | undefined, fallback: string) => {
  const raw = String(value || "").trim();
  const candidate = raw.startsWith("#") ? raw : raw ? `#${raw}` : fallback;
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(candidate) ? candidate.toLowerCase() : fallback;
};

export const normalizeLotStatePalette = (value: Partial<LotStatePalette> | null | undefined): LotStatePalette => ({
  disponible: normalizeHexColor(value?.disponible, DEFAULT_LOT_STATE_PALETTE.disponible),
  separado: normalizeHexColor(value?.separado, DEFAULT_LOT_STATE_PALETTE.separado),
  vendido: normalizeHexColor(value?.vendido, DEFAULT_LOT_STATE_PALETTE.vendido),
  selected: normalizeHexColor(value?.selected, DEFAULT_LOT_STATE_PALETTE.selected),
});

export const normalizeLotFillOpacity = (value: unknown, fallback = DEFAULT_LOT_FILL_OPACITY) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, parsed));
};

export const normalizeLotFillOpacityPalette = (
  value: Partial<LotStateOpacityPalette> | null | undefined,
  fallback = DEFAULT_LOT_FILL_OPACITY_PALETTE,
): LotStateOpacityPalette => ({
  disponible: normalizeLotFillOpacity(value?.disponible, fallback.disponible),
  separado: normalizeLotFillOpacity(value?.separado, fallback.separado),
  vendido: normalizeLotFillOpacity(value?.vendido, fallback.vendido),
  selected: normalizeLotFillOpacity(value?.selected, fallback.selected),
});

const expandHex = (value: string) => {
  const normalized = value.replace("#", "").trim();
  if (normalized.length === 3) {
    return normalized
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }
  return normalized;
};

export const hexToRgba = (value: string, alpha: number) => {
  const hex = expandHex(normalizeHexColor(value, "#000000"));
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
