import { describe, expect, it } from "vitest";
import {
  addDays,
  cleanNumber,
  clamp,
  formatArea,
  formatMoney,
  formatNumber,
  normalizeStatusLabel,
  statusToClass,
  toDateValue,
  toLoteId,
} from "./formatters";

describe("formatters domain", () => {
  it("maps status to class and label with defaults", () => {
    expect(statusToClass("SEPARADO")).toBe("separado");
    expect(statusToClass("VENDIDO")).toBe("vendido");
    expect(statusToClass("cualquier cosa")).toBe("disponible");

    expect(normalizeStatusLabel("SEPARADO")).toBe("SEPARADO");
    expect(normalizeStatusLabel("VENDIDO")).toBe("VENDIDO");
    expect(normalizeStatusLabel("otra")).toBe("DISPONIBLE");
  });

  it("cleans numeric strings used by filters and imports", () => {
    expect(cleanNumber("S/ 61,321.75")).toBeCloseTo(61321.75, 2);
    expect(cleanNumber("183.05")).toBe(183.05);
    expect(cleanNumber("")).toBeNull();
  });

  it("formats money, area and numbers consistently", () => {
    expect(formatMoney(61321.75)).toBe("S/\u00a061,321.75");
    expect(formatArea(183.05)).toBe("183.05 m2");
    expect(formatNumber(183.05)).toBe("183.05");
    expect(formatMoney(null)).toBe("-");
    expect(formatArea(null)).toBe("-");
    expect(formatNumber(null)).toBe("");
  });

  it("builds lote ids and clamps numeric values", () => {
    expect(toLoteId("M", 3)).toBe("M-03");
    expect(clamp(20, 1, 10)).toBe(10);
    expect(clamp(-2, 1, 10)).toBe(1);
    expect(clamp(5, 1, 10)).toBe(5);
  });

  it("normalizes dates and adds days without mutating the base date", () => {
    const base = new Date("2026-04-06T12:00:00.000Z");
    const next = addDays(base, 3);

    expect(toDateValue(base)).toBe("2026-04-06");
    expect(toDateValue(next)).toBe("2026-04-09");
    expect(base.toISOString()).toBe("2026-04-06T12:00:00.000Z");
  });
});

