import { describe, expect, it } from "vitest";
import {
  CLASIFICACION_OPTIONS,
  SECTOR_OPTIONS,
  TIPO_COSTO_GASTO_OPTIONS,
  TIPO_OPERACION_OPTIONS,
  optionLabel,
} from "./classification-options";

describe("F-07 Q/R/S/T option catalogs", () => {
  it("Q includes 1–4 Gravada…Mixta plus 0 and 9 with name-only labels", () => {
    const codes = TIPO_OPERACION_OPTIONS.map((o) => o.code);
    expect(codes).toEqual(["0", "1", "2", "3", "4", "9"]);
    expect(optionLabel(TIPO_OPERACION_OPTIONS, "1")).toBe("Gravada");
    expect(optionLabel(TIPO_OPERACION_OPTIONS, "4")).toBe("Mixta");
    expect(optionLabel(TIPO_OPERACION_OPTIONS, "1")).not.toMatch(/^\d/);
  });

  it("R includes Costo/Gasto plus 0 and 9 without leading codes", () => {
    expect(CLASIFICACION_OPTIONS.map((o) => o.code)).toEqual([
      "0",
      "1",
      "2",
      "9",
    ]);
    expect(optionLabel(CLASIFICACION_OPTIONS, "1")).toBe("Costo");
    expect(optionLabel(CLASIFICACION_OPTIONS, "2")).toBe("Gasto");
  });

  it("S includes Industria…Servicios plus 0 and 9 without leading codes", () => {
    expect(SECTOR_OPTIONS.map((o) => o.code)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "9",
    ]);
    expect(optionLabel(SECTOR_OPTIONS, "4")).toContain("Servicios");
    expect(optionLabel(SECTOR_OPTIONS, "1")).toBe("Industria");
  });

  it("T includes 1–7 from manual page 21 plus 0/8/9 with name-only labels", () => {
    expect(TIPO_COSTO_GASTO_OPTIONS.map((o) => o.code)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);
    expect(optionLabel(TIPO_COSTO_GASTO_OPTIONS, "1")).toContain("Venta");
    expect(optionLabel(TIPO_COSTO_GASTO_OPTIONS, "2")).toContain(
      "Administración",
    );
    expect(optionLabel(TIPO_COSTO_GASTO_OPTIONS, "7")).toBe("Mano de obra");
    expect(optionLabel(TIPO_COSTO_GASTO_OPTIONS, "8")).toContain(
      "más de 1 anexo",
    );
    for (const opt of TIPO_COSTO_GASTO_OPTIONS) {
      expect(opt.label).not.toMatch(/^\d[\s—-]/);
    }
  });
});
