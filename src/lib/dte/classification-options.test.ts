import { describe, expect, it } from "vitest";
import {
  CLASIFICACION_OPTIONS,
  SECTOR_OPTIONS,
  TIPO_COSTO_GASTO_OPTIONS,
  TIPO_OPERACION_OPTIONS,
  optionLabel,
} from "./classification-options";

describe("F-07 Q/R/S/T option catalogs", () => {
  it("Q includes 1–4 Gravada…Mixta plus 0 and 9", () => {
    const codes = TIPO_OPERACION_OPTIONS.map((o) => o.code);
    expect(codes).toEqual(["0", "1", "2", "3", "4", "9"]);
    expect(optionLabel(TIPO_OPERACION_OPTIONS, "1")).toContain("Gravada");
    expect(optionLabel(TIPO_OPERACION_OPTIONS, "4")).toContain("Mixta");
  });

  it("R includes Costo/Gasto plus 0 and 9", () => {
    expect(CLASIFICACION_OPTIONS.map((o) => o.code)).toEqual([
      "0",
      "1",
      "2",
      "9",
    ]);
    expect(optionLabel(CLASIFICACION_OPTIONS, "1")).toContain("Costo");
    expect(optionLabel(CLASIFICACION_OPTIONS, "2")).toContain("Gasto");
  });

  it("S includes Industria…Servicios plus 0 and 9", () => {
    expect(SECTOR_OPTIONS.map((o) => o.code)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "9",
    ]);
    expect(optionLabel(SECTOR_OPTIONS, "4")).toContain("Servicios");
  });

  it("T includes 1–7 from manual page 21 plus 0/8/9", () => {
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
    expect(optionLabel(TIPO_COSTO_GASTO_OPTIONS, "7")).toContain("Mano de obra");
    expect(optionLabel(TIPO_COSTO_GASTO_OPTIONS, "8")).toContain(
      "más de 1 anexo",
    );
  });
});
