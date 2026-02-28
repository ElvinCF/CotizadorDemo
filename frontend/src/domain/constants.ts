import type { FiltersState, OverlayTransform, QuoteState } from "./types";

export const PROFORMA_VENDOR_KEY = "arenas.proforma.vendor.v1";
export const PROYECTO_FIJO = "Arenas Malabrigo";
export const EMPRESA_DIRECCION =
  "CALLE BALTAZAR GAVILAN mz: F Lote: 7 URB. SANTO DOMINGUITO TRUJILLO LA LIBERTAD";

export const MAP_WIDTH = 1122;
export const MAP_HEIGHT = 1588;

export const mapVars = {
  "--map-width": `${MAP_WIDTH}px`,
  "--map-height": `${MAP_HEIGHT}px`,
} as const;

export const defaultOverlay: OverlayTransform = {
  x: 131,
  y: 137,
  scale: 0.715,
};

export const defaultQuote: QuoteState = {
  precio: 0,
  inicialMonto: 6000,
  cuotas: 24,
  interesAnual: 0,
};

export const defaultFilters: FiltersState = {
  mz: "",
  status: "TODOS",
  priceMin: "",
  priceMax: "",
  areaMin: "",
  areaMax: "",
};
