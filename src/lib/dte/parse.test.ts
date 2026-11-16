import { describe, expect, it } from "vitest";
import { parseDteJsonText } from "./parse";
import { isInProcessingWindow, monthDifference } from "./window";
import { sumTributo } from "./tributos";
import { isExportDteType, isInformativeDteType } from "./types";

const sampleCred = {
  identificacion: {
    tipoDte: "03",
    fecEmi: "2024-05-10",
    codigoGeneracion: "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
  },
  emisor: {
    nit: "0614-123456-001-2",
    nrc: "123456-7",
    nombre: "Proveedor SA de CV",
  },
  resumen: {
    totalGravada: 100,
    tributos: [
      { codigo: "20", valor: 13 },
      { codigo: "D1", valor: 1.5 },
      { codigo: "C8", valor: 0.5 },
    ],
  },
};

describe("parseDteJson", () => {
  it("extracts CRED amounts and tributos", () => {
    const result = parseDteJsonText(JSON.stringify(sampleCred));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.tipoDte).toBe("03");
    expect(result.data.totalGravada).toBe(100);
    expect(result.data.iva).toBe(13);
    expect(result.data.fovial).toBe(1.5);
    expect(result.data.cotrans).toBe(0.5);
    expect(result.data.exento).toBe(2);
    expect(result.data.totalConIva).toBe(113);
  });

  it("accepts exportable 03/05/06, informative 01/07, and unexpected tipos", () => {
    for (const tipo of ["01", "03", "05", "06", "07", "11"]) {
      const doc = structuredClone(sampleCred);
      doc.identificacion.tipoDte = tipo;
      const result = parseDteJsonText(JSON.stringify(doc));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.tipoDte).toBe(tipo);
    }
    expect(isExportDteType("03")).toBe(true);
    expect(isExportDteType("05")).toBe(true);
    expect(isExportDteType("06")).toBe(true);
    expect(isExportDteType("01")).toBe(false);
    expect(isInformativeDteType("01")).toBe(true);
    expect(isInformativeDteType("07")).toBe(true);
    expect(isInformativeDteType("11")).toBe(true);
    expect(isInformativeDteType("05")).toBe(false);
  });

  it("rejects missing tipoDte", () => {
    const doc = structuredClone(sampleCred);
    doc.identificacion.tipoDte = "";
    const result = parseDteJsonText(JSON.stringify(doc));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("missing_tipo");
  });

  it("extracts totalPagar when present", () => {
    const doc = structuredClone(sampleCred);
    doc.identificacion.tipoDte = "01";
    (doc.resumen as Record<string, unknown>).totalPagar = 42.5;
    const result = parseDteJsonText(JSON.stringify(doc));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.totalPagar).toBe(42.5);
  });
});

describe("window (3 periods: selected + 2 prior)", () => {
  it("computes month difference across years", () => {
    expect(monthDifference("2023-12-01", 2024, 2)).toBe(2);
    expect(monthDifference("2024-02-15", 2024, 2)).toBe(0);
    expect(monthDifference("2024-03-01", 2024, 2)).toBe(-1);
  });

  it("accepts 0 <= diff <= 2", () => {
    expect(isInProcessingWindow("2024-05-01", 2024, 5)).toBe(true); // 0
    expect(isInProcessingWindow("2024-04-01", 2024, 5)).toBe(true); // 1
    expect(isInProcessingWindow("2024-03-01", 2024, 5)).toBe(true); // 2
    expect(isInProcessingWindow("2024-02-01", 2024, 5)).toBe(false); // 3
    expect(isInProcessingWindow("2024-06-01", 2024, 5)).toBe(false); // future
  });
});

describe("sumTributo", () => {
  it("ignores malformed entries", () => {
    expect(
      sumTributo(
        [
          { codigo: "20", valor: 10 },
          { codigo: "20", valor: null },
          { codigo: "C8", valor: 1 },
        ],
        "20",
      ),
    ).toBe(10);
  });
});
