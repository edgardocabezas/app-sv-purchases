import { describe, expect, it } from "vitest";
import {
  aggregateComprasReport,
  formatMoneyEs,
  sortTipoDteCodes,
  tipoDteLabel,
  yearOptionsForDocs,
} from "./compras-report";

describe("aggregateComprasReport", () => {
  it("buckets by tipo and emission month for the selected year", () => {
    const matrix = aggregateComprasReport(
      [
        {
          tipo_dte: "03",
          fec_emi: "2025-01-15",
          total_gravada: 100,
          iva: 13,
          total_con_iva: 113,
        },
        {
          tipo_dte: "03",
          fec_emi: "2025-03-01",
          total_gravada: 50,
          iva: 6.5,
          total_con_iva: 56.5,
        },
        {
          tipo_dte: "01",
          fec_emi: "2024-12-31",
          total_gravada: 999,
          iva: 0,
          total_con_iva: 999,
        },
      ],
      2025,
    );

    expect(matrix.documentCount).toBe(2);
    expect(matrix.tipos).toEqual(["03"]);
    expect(matrix.cells["03"]![0]!.total).toBe(113);
    expect(matrix.cells["03"]![2]!.total).toBe(56.5);
    expect(matrix.byMonth[0]!.count).toBe(1);
    expect(matrix.byMonth[2]!.count).toBe(1);
    expect(matrix.grand.total).toBe(169.5);
    expect(matrix.grand.gravada).toBe(150);
  });

  it("applies F-07 sign so NC (05) resta and ND (06) suma", () => {
    const matrix = aggregateComprasReport(
      [
        {
          tipo_dte: "03",
          fec_emi: "2026-06-10",
          total_gravada: 200,
          iva: 26,
          total_con_iva: 226,
        },
        {
          tipo_dte: "05",
          fec_emi: "2026-06-12",
          total_gravada: 40,
          iva: 5.2,
          total_con_iva: 45.2,
        },
        {
          tipo_dte: "06",
          fec_emi: "2026-06-20",
          total_gravada: 10,
          iva: 1.3,
          total_con_iva: 11.3,
        },
      ],
      2026,
    );

    expect(matrix.byTipo["05"]!.total).toBe(-45.2);
    expect(matrix.byTipo["06"]!.total).toBe(11.3);
    expect(matrix.byMonth[5]!.total).toBeCloseTo(226 - 45.2 + 11.3, 5);
    expect(matrix.grand.total).toBeCloseTo(192.1, 5);
  });

  it("returns empty matrix when no docs match the year", () => {
    const matrix = aggregateComprasReport(
      [
        {
          tipo_dte: "03",
          fec_emi: "2024-01-01",
          total_gravada: 1,
          iva: 0,
          total_con_iva: 1,
        },
      ],
      2026,
    );
    expect(matrix.documentCount).toBe(0);
    expect(matrix.tipos).toEqual([]);
    expect(matrix.grand.total).toBe(0);
  });
});

describe("sortTipoDteCodes / labels / years", () => {
  it("orders known tipos first", () => {
    expect(sortTipoDteCodes(["06", "11", "01", "03"])).toEqual([
      "01",
      "03",
      "06",
      "11",
    ]);
  });

  it("labels known tipos in Spanish", () => {
    expect(tipoDteLabel("03")).toBe("Crédito fiscal");
    expect(tipoDteLabel("99")).toBe("Tipo 99");
  });

  it("builds year options from docs and recent window", () => {
    const years = yearOptionsForDocs(
      [{ fec_emi: "2020-05-01" }, { fec_emi: "2026-01-01" }],
      2026,
      new Date("2026-11-17T00:00:00Z"),
    );
    expect(years[0]).toBe(2026);
    expect(years).toContain(2020);
    expect(years).toContain(2021);
  });

  it("formats money with minus sign for negatives", () => {
    expect(formatMoneyEs(12.5)).toMatch(/12[.,]50/);
    expect(formatMoneyEs(-3)).toMatch(/^−/);
  });
});
