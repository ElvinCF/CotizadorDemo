import type { QuoteState } from "./types";

const COTIZADOR_QUOTE_CACHE_KEY = "arenas.cotizador.quote.v1";

type CotizadorQuoteCacheEntry = QuoteState & {
  updatedAt: string;
};

type CotizadorQuoteCacheMap = Record<string, CotizadorQuoteCacheEntry>;

const normalizeLoteCodigo = (loteCodigo: string) => String(loteCodigo || "").trim().toUpperCase();

const readCacheMap = (): CotizadorQuoteCacheMap => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(COTIZADOR_QUOTE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CotizadorQuoteCacheMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeCacheMap = (next: CotizadorQuoteCacheMap) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(COTIZADOR_QUOTE_CACHE_KEY, JSON.stringify(next));
};

export const readCachedCotizadorQuote = (loteCodigo: string): QuoteState | null => {
  const normalized = normalizeLoteCodigo(loteCodigo);
  if (!normalized) return null;

  const entry = readCacheMap()[normalized];
  if (!entry) return null;

  return {
    precio: Number(entry.precio || 0),
    inicialMonto: Number(entry.inicialMonto || 0),
    cuotas: Number(entry.cuotas || 0),
    interesAnual: Number(entry.interesAnual || 0),
  };
};

export const writeCachedCotizadorQuote = (loteCodigo: string, quote: QuoteState) => {
  const normalized = normalizeLoteCodigo(loteCodigo);
  if (!normalized) return;

  const next = {
    ...readCacheMap(),
    [normalized]: {
      precio: Number(quote.precio || 0),
      inicialMonto: Number(quote.inicialMonto || 0),
      cuotas: Number(quote.cuotas || 0),
      interesAnual: Number(quote.interesAnual || 0),
      updatedAt: new Date().toISOString(),
    },
  };

  writeCacheMap(next);
};

export const buildCotizadorPath = (loteCodigo?: string | null) => {
  const normalized = normalizeLoteCodigo(loteCodigo ?? "");
  return normalized ? `/cotizador/${encodeURIComponent(normalized)}` : "/cotizador";
};
