import { describe, expect, it } from "vitest";
import {
  GRAVADA_ALLOWED_T,
  allowedTipoCostoGastoCodes,
  applyClassificationPatch,
  coerceClassification,
  isAllowedTipoCostoGasto,
  isValidClassification,
  optionsForTipoCostoGasto,
} from "./qrt-cascade";
import { DEFAULT_CLASSIFICATION } from "./types";

describe("F-07 Gravada cascade matrix (page 21)", () => {
  it("maps Costo+Industria to T 4–7 and Costo+other sectors to T 4–5", () => {
    expect(GRAVADA_ALLOWED_T["1"]["1"]).toEqual(["4", "5", "6", "7"]);
    expect(GRAVADA_ALLOWED_T["1"]["2"]).toEqual(["4", "5"]);
    expect(GRAVADA_ALLOWED_T["1"]["3"]).toEqual(["4", "5"]);
    expect(GRAVADA_ALLOWED_T["1"]["4"]).toEqual(["4", "5"]);
  });

  it("maps Gasto + any sector to T 1–3", () => {
    for (const sector of ["1", "2", "3", "4"]) {
      expect(GRAVADA_ALLOWED_T["2"][sector]).toEqual(["1", "2", "3"]);
    }
  });

  it("rejects invalid Gravada combo 1,1,4,1 and accepts 1,1,4,5", () => {
    expect(isAllowedTipoCostoGasto("1", "1", "4", "1")).toBe(false);
    expect(isAllowedTipoCostoGasto("1", "1", "4", "5")).toBe(true);
    expect(
      isValidClassification({
        tipoOperacion: "1",
        clasificacion: "1",
        sector: "4",
        tipoCostoGasto: "1",
      }),
    ).toBe(false);
    expect(
      isValidClassification({
        tipoOperacion: "1",
        clasificacion: "1",
        sector: "4",
        tipoCostoGasto: "5",
      }),
    ).toBe(true);
  });

  it("allows Industria Costo with T 6/7 and blocks them for Comercio", () => {
    expect(isAllowedTipoCostoGasto("1", "1", "1", "6")).toBe(true);
    expect(isAllowedTipoCostoGasto("1", "1", "1", "7")).toBe(true);
    expect(isAllowedTipoCostoGasto("1", "1", "2", "6")).toBe(false);
    expect(isAllowedTipoCostoGasto("1", "1", "2", "7")).toBe(false);
  });

  it("allows Gasto combo matching defaults 1,2,2,2", () => {
    expect(isValidClassification(DEFAULT_CLASSIFICATION)).toBe(true);
  });

  it("returns null (unconstrained) for special Q/R/S codes", () => {
    expect(allowedTipoCostoGastoCodes("0", "1", "1")).toBeNull();
    expect(allowedTipoCostoGastoCodes("9", "1", "1")).toBeNull();
    expect(allowedTipoCostoGastoCodes("1", "9", "1")).toBeNull();
    expect(allowedTipoCostoGastoCodes("1", "1", "9")).toBeNull();
  });

  it("filters T select options for Gravada Costo Servicios", () => {
    const opts = optionsForTipoCostoGasto("1", "1", "4");
    const codes = opts.map((o) => o.code);
    expect(codes).toContain("4");
    expect(codes).toContain("5");
    expect(codes).not.toContain("1");
    expect(codes).not.toContain("2");
    expect(codes).not.toContain("3");
    expect(codes).not.toContain("6");
    expect(codes).not.toContain("7");
    // Specials remain available
    expect(codes).toContain("0");
    expect(codes).toContain("8");
    expect(codes).toContain("9");
  });
});

describe("applyClassificationPatch / coerceClassification", () => {
  it("resets invalid T when upstream R/S change (1,1,4,1 → T=4)", () => {
    const next = applyClassificationPatch(
      {
        tipoOperacion: "1",
        clasificacion: "2",
        sector: "2",
        tipoCostoGasto: "1",
      },
      { clasificacion: "1", sector: "4" },
    );
    expect(next).toEqual({
      tipoOperacion: "1",
      clasificacion: "1",
      sector: "4",
      tipoCostoGasto: "4",
    });
  });

  it("keeps valid T when patch stays within allowed set", () => {
    const next = applyClassificationPatch(
      {
        tipoOperacion: "1",
        clasificacion: "1",
        sector: "4",
        tipoCostoGasto: "5",
      },
      { sector: "2" },
    );
    expect(next.tipoCostoGasto).toBe("5");
  });

  it("coerces an already-invalid classification", () => {
    const coerced = coerceClassification({
      tipoOperacion: "1",
      clasificacion: "1",
      sector: "4",
      tipoCostoGasto: "1",
    });
    expect(coerced.tipoCostoGasto).toBe("4");
    expect(isValidClassification(coerced)).toBe(true);
  });

  it("resets T when switching from Gasto to Costo with T=2", () => {
    const next = applyClassificationPatch(
      {
        tipoOperacion: "1",
        clasificacion: "2",
        sector: "2",
        tipoCostoGasto: "2",
      },
      { clasificacion: "1" },
    );
    expect(["4", "5"]).toContain(next.tipoCostoGasto);
  });
});
