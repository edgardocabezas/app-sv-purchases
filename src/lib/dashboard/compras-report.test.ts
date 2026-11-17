import { describe, expect, it } from "vitest";
import {
  aggregateComprasReport,
  formatMoneyEs,
  resolveComprasDocMonth,
  sortTipoDteCodes,
  tipoDteLabel,
  yearOptionsForDocs,
  type ComprasReportDoc,
} from "./compras-report";

function doc(
  partial: Partial<ComprasReportDoc> &
    Pick<ComprasReportDoc, "tipo_dte" | "fec_emi">,
): ComprasReportDoc {
  return {
    period_year: null,
    period_month: null,
    total_gravada: 0,
    iva: 0,
    total_con_iva: 0,
    ...partial,
  };
}

describe("aggregateComprasReport", () => {
  it("buckets by tipo and emission month for the selected year", () => {
    const matrix = aggregateComprasReport(
      [
        doc({
          tipo_dte: "03",
          fec_emi: "2025-01-15",
          total_gravada: 100,
          iva: 13,
          total_con_iva: 113,
        }),
        doc({
          tipo_dte: "03",
          fec_emi: "2025-03-01",
          total_gravada: 50,
          iva: 6.5,
          total_con_iva: 56.5,
        }),
        doc({
          tipo_dte: "01",
          fec_emi: "2024-12-31",
          total_gravada: 999,
          iva: 0,
          total_con_iva: 999,
        }),
      ],
      2025,
    );

    expect(matrix.documentCount).toBe(2);
    expect(matrix.perspective).toBe("emission");
    expect(matrix.tipos).toEqual(["03"]);
    expect(matrix.cells["03"]![0]!.total).toBe(113);
    expect(matrix.cells["03"]![2]!.total).toBe(56.5);
    expect(matrix.byMonth[0]!.count).toBe(1);
    expect(matrix.byMonth[2]!.count).toBe(1);
    expect(matrix.grand.total).toBe(169.5);
    expect(matrix.grand.gravada).toBe(150);
  });

  it("buckets by reporting period when perspective is reported", () => {
    const docs = [
      doc({
        tipo_dte: "03",
        fec_emi: "2025-12-20",
        period_year: 2026,
        period_month: 1,
        total_gravada: 100,
        iva: 13,
        total_con_iva: 113,
      }),
      doc({
        tipo_dte: "03",
        fec_emi: "2026-01-05",
        period_year: 2026,
        period_month: 1,
        total_gravada: 50,
        iva: 6.5,
        total_con_iva: 56.5,
      }),
      doc({
        tipo_dte: "03",
        fec_emi: "2026-02-01",
        period_year: 2026,
        period_month: 2,
        total_gravada: 10,
        iva: 1.3,
        total_con_iva: 11.3,
      }),
    ];

    const byEmission = aggregateComprasReport(docs, 2026, "emission");
    expect(byEmission.documentCount).toBe(2);
    expect(byEmission.byMonth[0]!.total).toBe(56.5);
    expect(byEmission.byMonth[1]!.total).toBe(11.3);

    const byReported = aggregateComprasReport(docs, 2026, "reported");
    expect(byReported.perspective).toBe("reported");
    expect(byReported.documentCount).toBe(3);
    expect(byReported.byMonth[0]!.total).toBe(169.5);
    expect(byReported.byMonth[0]!.count).toBe(2);
    expect(byReported.byMonth[1]!.total).toBe(11.3);
    expect(byReported.grand.total).toBeCloseTo(180.8, 5);
  });

  it("excludes docs without period when perspective is reported", () => {
    const matrix = aggregateComprasReport(
      [
        doc({
          tipo_dte: "03",
          fec_emi: "2026-03-01",
          period_year: null,
          period_month: null,
          total_gravada: 100,
          iva: 13,
          total_con_iva: 113,
        }),
      ],
      2026,
      "reported",
    );
    expect(matrix.documentCount).toBe(0);
  });

  it("applies F-07 sign so NC (05) resta and ND (06) suma", () => {
    const matrix = aggregateComprasReport(
      [
        doc({
          tipo_dte: "03",
          fec_emi: "2026-06-10",
          total_gravada: 200,
          iva: 26,
          total_con_iva: 226,
        }),
        doc({
          tipo_dte: "05",
          fec_emi: "2026-06-12",
          total_gravada: 40,
          iva: 5.2,
          total_con_iva: 45.2,
        }),
        doc({
          tipo_dte: "06",
          fec_emi: "2026-06-20",
          total_gravada: 10,
          iva: 1.3,
          total_con_iva: 11.3,
        }),
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
        doc({
          tipo_dte: "03",
          fec_emi: "2024-01-01",
          total_gravada: 1,
          iva: 0,
          total_con_iva: 1,
        }),
      ],
      2026,
    );
    expect(matrix.documentCount).toBe(0);
    expect(matrix.tipos).toEqual([]);
    expect(matrix.grand.total).toBe(0);
  });
});

describe("resolveComprasDocMonth", () => {
  it("reads fec_emi for emission and period_* for reported", () => {
    const row = doc({
      tipo_dte: "03",
      fec_emi: "2025-11-30",
      period_year: 2026,
      period_month: 1,
    });
    expect(resolveComprasDocMonth(row, "emission")).toEqual({
      year: 2025,
      month: 11,
    });
    expect(resolveComprasDocMonth(row, "reported")).toEqual({
      year: 2026,
      month: 1,
    });
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

  it("builds year options from docs and recent window for emission", () => {
    const years = yearOptionsForDocs(
      [
        { fec_emi: "2020-05-01", period_year: null, period_month: null },
        { fec_emi: "2026-01-01", period_year: null, period_month: null },
      ],
      2026,
      "emission",
      new Date("2026-11-17T00:00:00Z"),
    );
    expect(years[0]).toBe(2026);
    expect(years).toContain(2020);
    expect(years).toContain(2021);
  });

  it("builds year options from reporting period when perspective is reported", () => {
    const years = yearOptionsForDocs(
      [
        {
          fec_emi: "2018-12-01",
          period_year: 2019,
          period_month: 1,
        },
      ],
      2026,
      "reported",
      new Date("2026-11-17T00:00:00Z"),
    );
    expect(years).toContain(2019);
    expect(years).not.toContain(2018);
  });

  it("formats money with minus sign for negatives", () => {
    expect(formatMoneyEs(12.5)).toMatch(/12[.,]50/);
    expect(formatMoneyEs(-3)).toMatch(/^−/);
  });
});
