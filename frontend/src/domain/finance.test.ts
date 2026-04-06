import { describe, expect, it } from "vitest";
import { buildIdSet, overlayStyle, quoteMonthly } from "./finance";

describe("finance domain", () => {
  it("calculates monthly quote without interest as simple division", () => {
    expect(quoteMonthly(12000, 12, 0)).toBe(1000);
  });

  it("calculates monthly quote with annual interest", () => {
    const result = quoteMonthly(10000, 12, 12);
    expect(result).toBeCloseTo(888.49, 2);
  });

  it("returns zero when cuotas is zero or lower", () => {
    expect(quoteMonthly(10000, 0, 12)).toBe(0);
    expect(quoteMonthly(10000, -4, 12)).toBe(0);
  });

  it("builds a set of ids from items", () => {
    const result = buildIdSet([
      { id: "A-01" },
      { id: "A-02" },
      { id: "A-01" },
    ]);

    expect(Array.from(result)).toEqual(["A-01", "A-02"]);
  });

  it("returns overlay style with top-left transform origin", () => {
    expect(overlayStyle({ x: 44.3, y: 134.5, scale: 0.869 })).toEqual({
      transform: "translate(44.3px, 134.5px) scale(0.869)",
      transformOrigin: "top left",
    });
  });
});

