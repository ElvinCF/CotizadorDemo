import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCotizadorPath, readCachedCotizadorQuote, writeCachedCotizadorQuote } from "./cotizador";

describe("cotizador domain", () => {
  const storage = (() => {
    let data = new Map<string, string>();
    return {
      clear: () => {
        data = new Map<string, string>();
      },
      getItem: (key: string) => data.get(key) ?? null,
      key: (index: number) => Array.from(data.keys())[index] ?? null,
      removeItem: (key: string) => {
        data.delete(key);
      },
      setItem: (key: string, value: string) => {
        data.set(key, String(value));
      },
      get length() {
        return data.size;
      },
    };
  })();

  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: storage });
    storage.clear();
  });

  it("builds public cotizador paths with normalized slug and lote code", () => {
    expect(buildCotizadorPath("Arenas Malabrigo 3", "m-3")).toBe("/arenas-malabrigo-3/cotizador/M-3");
    expect(buildCotizadorPath(null, "a-01")).toBe("/cotizador/A-01");
    expect(buildCotizadorPath("Arenas Malabrigo 3", null)).toBe("/arenas-malabrigo-3/cotizador");
  });

  it("writes and reads cached quote by normalized lote code", () => {
    writeCachedCotizadorQuote("m-33", {
      precio: 44536.6,
      inicialMonto: 8000,
      cuotas: 24,
      interesAnual: 0,
    });

    expect(readCachedCotizadorQuote("M-33")).toEqual({
      precio: 44536.6,
      inicialMonto: 8000,
      cuotas: 24,
      interesAnual: 0,
    });
  });

  it("returns null when there is no cached quote", () => {
    expect(readCachedCotizadorQuote("M-99")).toBeNull();
  });

  it("ignores empty lote codes when writing", () => {
    writeCachedCotizadorQuote("", {
      precio: 1,
      inicialMonto: 1,
      cuotas: 1,
      interesAnual: 1,
    });

    expect(window.localStorage.length).toBe(0);
  });
});
