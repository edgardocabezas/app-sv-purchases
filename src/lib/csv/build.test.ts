import { describe, expect, it } from "vitest";
import { buildAnexoComprasCsv, buildAnexoComprasFilename } from "./build";
import { buildAnexoComprasRow } from "./row";
import { formatMoney, resolveProveedorId, stripDashes } from "./format";
import { amountSignForTipo, signedExportAmounts } from "./amounts";

describe("format helpers", () => {
  it("strips dashes (and slashes) from codes and IDs", () => {
    expect(stripDashes("A1B2-C3D4-E5F6")).toBe("A1B2C3D4E5F6");
    expect(stripDashes("0614-123456-001-2")).toBe("06141234560012");
    expect(stripDashes("A1B2C3D4-E5F6-7890-ABCD-EF1234567890")).toBe(
      "A1B2C3D4E5F67890ABCDEF1234567890",
    );
    expect(stripDashes("alreadyclean")).toBe("alreadyclean");
    expect(stripDashes("  spaced-id  ")).toBe("spacedid");
    expect(stripDashes("0614/290101/001/2")).toBe("06142901010012");
  });

  it("formats money with exactly 2 decimals as text", () => {
    expect(formatMoney(13)).toBe("13.00");
    expect(formatMoney(12.5)).toBe("12.50");
    expect(formatMoney(100.1)).toBe("100.10");
    expect(formatMoney(0)).toBe("0.00");
    expect(formatMoney(-13)).toBe("-13.00");
    expect(formatMoney(-6.5)).toBe("-6.50");
    expect(formatMoney(1.999)).toBe("2.00");
    expect(formatMoney(0.004)).toBe("0.00");
    expect(formatMoney(0.005)).toBe("0.01");
  });

  it("prefers NIT then NRC without dashes or padding", () => {
    expect(resolveProveedorId("0614-1", "00123")).toBe("06141");
    expect(resolveProveedorId("", "123-4")).toBe("1234");
    expect(resolveProveedorId("", "00123")).toBe("00123");
  });
});

describe("signed amounts (F-07 NC/ND)", () => {
  it("05 subtracts, 03/06 add", () => {
    expect(amountSignForTipo("05")).toBe(-1);
    expect(amountSignForTipo("06")).toBe(1);
    expect(amountSignForTipo("03")).toBe(1);
    expect(
      signedExportAmounts("05", {
        totalGravada: 100,
        iva: 13,
        totalConIva: 113,
      }),
    ).toEqual({ totalGravada: -100, iva: -13, totalConIva: -113 });
  });
});

describe("buildAnexoComprasRow", () => {
  it("builds 21 columns with clase=4 and U=3", () => {
    const row = buildAnexoComprasRow({
      fecEmi: "2024-05-10",
      codigoGeneracion: "AAAA-BBBB-CCCC",
      emisorNit: "0614-123456-001-2",
      emisorNrc: "123-4",
      emisorNombre: "Proveedor",
      totalGravada: 100,
      iva: 13,
      totalConIva: 113,
      periodYear: 2024,
      periodMonth: 5,
    });
    expect(row).toHaveLength(21);
    expect(row[0]).toBe("10/05/2024");
    expect(row[1]).toBe("4");
    expect(row[2]).toBe("03");
    expect(row[3]).toBe("AAAABBBBCCCC");
    expect(row[4]).toBe("06141234560012");
    expect(row[9]).toBe("100.00");
    expect(row[13]).toBe("13.00");
    expect(row[14]).toBe("113.00");
    expect(row[16]).toBe("1");
    expect(row[17]).toBe("2");
    expect(row[18]).toBe("2");
    expect(row[19]).toBe("2");
    expect(row[20]).toBe("3");
  });

  it("column D always strips dashes from código de generación", () => {
    const uuid = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890";
    const row = buildAnexoComprasRow({
      fecEmi: "2024-05-10",
      codigoGeneracion: uuid,
      emisorNit: "1",
      emisorNrc: "",
      emisorNombre: "P",
      totalGravada: 1,
      iva: 0.13,
      totalConIva: 1.13,
      periodYear: 2024,
      periodMonth: 5,
    });
    expect(row[3]).toBe("A1B2C3D4E5F67890ABCDEF1234567890");
    expect(row[3]).not.toContain("-");
    // Idempotent if already dash-free (e.g. after upload persistence).
    const again = buildAnexoComprasRow({
      fecEmi: "2024-05-10",
      codigoGeneracion: row[3],
      emisorNit: "1",
      emisorNrc: "",
      emisorNombre: "P",
      totalGravada: 1,
      iva: 0.13,
      totalConIva: 1.13,
      periodYear: 2024,
      periodMonth: 5,
    });
    expect(again[3]).toBe(row[3]);
  });

  it("formats every money column G–O with exactly 2 decimals", () => {
    const row = buildAnexoComprasRow({
      fecEmi: "2024-05-10",
      codigoGeneracion: "X",
      emisorNit: "1",
      emisorNrc: "",
      emisorNombre: "P",
      totalGravada: 12.5,
      iva: 1.625,
      totalConIva: 14.125,
      periodYear: 2024,
      periodMonth: 5,
    });
    const moneyCols = row.slice(6, 15); // G–O (indexes 6..14)
    expect(moneyCols).toEqual([
      "0.00",
      "0.00",
      "0.00",
      "12.50",
      "0.00",
      "0.00",
      "0.00",
      "1.63",
      "14.13",
    ]);
    for (const cell of moneyCols) {
      expect(cell).toMatch(/^-?\d+\.\d{2}$/);
    }
  });

  it("emits tipo 05/06 with signed money columns", () => {
    const nc = buildAnexoComprasRow({
      fecEmi: "2024-05-10",
      codigoGeneracion: "NC-1",
      emisorNit: "1",
      emisorNrc: "",
      emisorNombre: "P",
      totalGravada: 50,
      iva: 6.5,
      totalConIva: 56.5,
      periodYear: 2024,
      periodMonth: 5,
      tipoDocumento: "05",
    });
    expect(nc[2]).toBe("05");
    expect(nc[3]).toBe("NC1");
    expect(nc[9]).toBe("-50.00");
    expect(nc[13]).toBe("-6.50");
    expect(nc[14]).toBe("-56.50");

    const nd = buildAnexoComprasRow({
      fecEmi: "2024-05-11",
      codigoGeneracion: "ND-1",
      emisorNit: "1",
      emisorNrc: "",
      emisorNombre: "P",
      totalGravada: 10,
      iva: 1.3,
      totalConIva: 11.3,
      periodYear: 2024,
      periodMonth: 5,
      tipoDocumento: "06",
    });
    expect(nd[2]).toBe("06");
    expect(nd[9]).toBe("10.00");
    expect(nd[13]).toBe("1.30");
  });

  it("keeps selected Q–T codes for any declaration period (no pre-2024 zeroing)", () => {
    const before = buildAnexoComprasRow({
      fecEmi: "2023-12-15",
      codigoGeneracion: "X",
      emisorNit: "1",
      emisorNrc: "",
      emisorNombre: "P",
      totalGravada: 1,
      iva: 0.13,
      totalConIva: 1.13,
      periodYear: 2024,
      periodMonth: 1,
    });
    expect(before[16]).toBe("1");
    expect(before[17]).toBe("2");
    expect(before[18]).toBe("2");
    expect(before[19]).toBe("2");
    expect(before[20]).toBe("3");

    const custom = buildAnexoComprasRow({
      fecEmi: "2023-11-01",
      codigoGeneracion: "Y",
      emisorNit: "1",
      emisorNrc: "",
      emisorNombre: "P",
      totalGravada: 1,
      iva: 0.13,
      totalConIva: 1.13,
      periodYear: 2023,
      periodMonth: 11,
      classification: {
        tipoOperacion: "1",
        clasificacion: "1",
        sector: "4",
        tipoCostoGasto: "5",
      },
    });
    expect(custom[16]).toBe("1");
    expect(custom[17]).toBe("1");
    expect(custom[18]).toBe("4");
    expect(custom[19]).toBe("5");
  });
});

describe("buildAnexoComprasCsv", () => {
  it("uses semicolon delimiter without header", () => {
    const row = buildAnexoComprasRow({
      fecEmi: "2024-05-10",
      codigoGeneracion: "ABC",
      emisorNit: "1",
      emisorNrc: "",
      emisorNombre: "P",
      totalGravada: 1,
      iva: 0.13,
      totalConIva: 1.13,
      periodYear: 2024,
      periodMonth: 5,
    });
    const csv = buildAnexoComprasCsv([row]);
    expect(csv.startsWith("10/05/2024;4;03;")).toBe(true);
    expect(csv.includes("\n10/05")).toBe(false);
    expect(csv.split(";")).toHaveLength(21);
  });

  it("CSV line keeps column D dash-free and money as 2 decimals", () => {
    const row = buildAnexoComprasRow({
      fecEmi: "2024-05-10",
      codigoGeneracion: "AA-BB-CC",
      emisorNit: "0614-1",
      emisorNrc: "",
      emisorNombre: "P",
      totalGravada: 12.5,
      iva: 1.625,
      totalConIva: 14.125,
      periodYear: 2024,
      periodMonth: 5,
    });
    const csv = buildAnexoComprasCsv([row]).trimEnd();
    const cells = csv.split(";");
    expect(cells[3]).toBe("AABBCC");
    expect(cells[3]).not.toContain("-");
    for (let i = 6; i <= 14; i += 1) {
      expect(cells[i]).toMatch(/^-?\d+\.\d{2}$/);
    }
  });

  it("keeps filename ≤ 25 chars", () => {
    const name = buildAnexoComprasFilename(2024, 5);
    expect(name.length).toBeLessThanOrEqual(25);
    expect(name.endsWith(".csv")).toBe(true);
  });
});
