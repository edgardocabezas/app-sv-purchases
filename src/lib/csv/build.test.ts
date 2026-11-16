import { describe, expect, it } from "vitest";
import { buildAnexoComprasCsv, buildAnexoComprasFilename } from "./build";
import { buildAnexoComprasRow } from "./row";
import { formatMoney, resolveProveedorId, stripDashes } from "./format";

describe("format helpers", () => {
  it("strips dashes from codes and IDs", () => {
    expect(stripDashes("A1B2-C3D4-E5F6")).toBe("A1B2C3D4E5F6");
    expect(stripDashes("0614-123456-001-2")).toBe("06141234560012");
  });

  it("formats money with 2 decimals", () => {
    expect(formatMoney(13)).toBe("13.00");
    expect(formatMoney(100.1)).toBe("100.10");
  });

  it("prefers NIT then NRC without dashes", () => {
    expect(resolveProveedorId("0614-1", "00123")).toBe("06141");
    expect(resolveProveedorId("", "123-4")).toBe("1234");
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

  it("zero-fills Q–T before 2024-02", () => {
    const row = buildAnexoComprasRow({
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
    expect(row[16]).toBe("0");
    expect(row[17]).toBe("0");
    expect(row[18]).toBe("0");
    expect(row[19]).toBe("0");
    expect(row[20]).toBe("3");
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
    expect(csv.includes("\n10/05")).toBe(false); // single row + trailing CRLF
    expect(csv.split(";")).toHaveLength(21);
  });

  it("keeps filename ≤ 25 chars", () => {
    const name = buildAnexoComprasFilename(2024, 5);
    expect(name.length).toBeLessThanOrEqual(25);
    expect(name.endsWith(".csv")).toBe(true);
  });
});
