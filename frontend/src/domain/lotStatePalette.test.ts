import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOT_FILL_OPACITY,
  DEFAULT_LOT_FILL_OPACITY_PALETTE,
  DEFAULT_LOT_STATE_PALETTE,
  hexToRgba,
  normalizeHexColor,
  normalizeLotFillOpacity,
  normalizeLotFillOpacityPalette,
  normalizeLotStatePalette,
} from "./lotStatePalette";

describe("lot state palette domain", () => {
  it("normalizes valid and invalid hex colors", () => {
    expect(normalizeHexColor("2D9B59", "#000000")).toBe("#2d9b59");
    expect(normalizeHexColor("#ABC", "#000000")).toBe("#abc");
    expect(normalizeHexColor("not-a-color", "#000000")).toBe("#000000");
  });

  it("normalizes lot state palette with defaults", () => {
    expect(
      normalizeLotStatePalette({
        disponible: "#20B65C",
        separado: "0062ff",
      }),
    ).toEqual({
      disponible: "#20b65c",
      separado: "#0062ff",
      vendido: DEFAULT_LOT_STATE_PALETTE.vendido,
      selected: DEFAULT_LOT_STATE_PALETTE.selected,
    });
  });

  it("normalizes opacity values and clamps to 0..1", () => {
    expect(normalizeLotFillOpacity(0.45)).toBe(0.45);
    expect(normalizeLotFillOpacity(3)).toBe(1);
    expect(normalizeLotFillOpacity(-3)).toBe(0);
    expect(normalizeLotFillOpacity("bad")).toBe(DEFAULT_LOT_FILL_OPACITY);
  });

  it("normalizes opacity palette with per-state fallback", () => {
    expect(
      normalizeLotFillOpacityPalette({
        disponible: 0.25,
        vendido: 1.3,
      }),
    ).toEqual({
      disponible: 0.25,
      separado: DEFAULT_LOT_FILL_OPACITY_PALETTE.separado,
      vendido: 1,
      selected: DEFAULT_LOT_FILL_OPACITY_PALETTE.selected,
    });
  });

  it("converts hex colors to rgba strings", () => {
    expect(hexToRgba("#2d9b59", 0.14)).toBe("rgba(45, 155, 89, 0.14)");
    expect(hexToRgba("#abc", 0.5)).toBe("rgba(170, 187, 204, 0.5)");
  });
});

