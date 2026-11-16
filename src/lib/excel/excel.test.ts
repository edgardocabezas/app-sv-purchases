import { describe, expect, it } from "vitest";
import {
  CRED_EXCEL_HEADERS,
  buildCredExcelRow,
  buildCredControlWorkbook,
} from "./cred";
import {
  FACT_EXCEL_HEADERS,
  buildFactExcelRow,
  buildFactControlWorkbook,
  extractTotalPagar,
} from "./fact";
import { buildControlExcelFilename } from "./filenames";

describe("control Excel filenames", () => {
  it("uses YYYYMM - CONTROL CRED/FACT.xlsx", () => {
    expect(buildControlExcelFilename(2024, 5, "CRED")).toBe(
      "202405 - CONTROL CRED.xlsx",
    );
    expect(buildControlExcelFilename(2024, 5, "FACT")).toBe(
      "202405 - CONTROL FACT.xlsx",
    );
  });
});

describe("CRED Excel rows", () => {
  it("matches Licuadora column count and signs 05/06", () => {
    expect(CRED_EXCEL_HEADERS).toHaveLength(23);

    const base = {
      fecEmi: "2024-05-10",
      codigoGeneracion: "AA-BB",
      emisorNit: "0614-1",
      emisorNrc: "12-3",
      emisorNombre: "Prov",
      totalGravada: 100,
      iva: 13,
      totalConIva: 113,
      exento: 2,
    };

    const cred = buildCredExcelRow({ ...base, tipoDte: "03" }, 2024, 5);
    expect(cred[0]).toBe("10/05/2024");
    expect(cred[1]).toBe("4");
    expect(cred[2]).toBe("03");
    expect(cred[3]).toBe("AABB");
    expect(cred[4]).toBe("123");
    expect(cred[5]).toBe("06141");
    expect(cred[10]).toBe("100.00");
    expect(cred[14]).toBe("13.00");
    expect(cred[15]).toBe("113.00");
    expect(cred[17]).toBe("2.00");
    expect(cred[18]).toBe("1");
    expect(cred[22]).toBe("3");

    const nc = buildCredExcelRow({ ...base, tipoDte: "05" }, 2024, 5);
    expect(nc[2]).toBe("05");
    expect(nc[10]).toBe("-100.00");
    expect(nc[14]).toBe("-13.00");
    expect(nc[15]).toBe("-113.00");
    expect(nc[17]).toBe("-2.00");

    const nd = buildCredExcelRow({ ...base, tipoDte: "06" }, 2024, 5);
    expect(nd[2]).toBe("06");
    expect(nd[10]).toBe("100.00");
  });

  it("zero-fills Q–T before Feb 2024", () => {
    const row = buildCredExcelRow(
      {
        fecEmi: "2023-12-01",
        tipoDte: "03",
        codigoGeneracion: "X",
        emisorNit: "1",
        emisorNrc: "",
        emisorNombre: "P",
        totalGravada: 1,
        iva: 0.13,
        totalConIva: 1.13,
        exento: 0,
      },
      2024,
      1,
    );
    expect(row[18]).toBe("0");
    expect(row[19]).toBe("0");
    expect(row[20]).toBe("0");
    expect(row[21]).toBe("0");
  });

  it("builds a valid xlsx buffer", async () => {
    const { filename, buffer, rowCount } = await buildCredControlWorkbook(
      [
        {
          fecEmi: "2024-05-10",
          tipoDte: "03",
          codigoGeneracion: "Z",
          emisorNit: "1",
          emisorNrc: "",
          emisorNombre: "P",
          totalGravada: 10,
          iva: 1.3,
          totalConIva: 11.3,
          exento: 0,
        },
      ],
      2024,
      5,
    );
    expect(filename).toBe("202405 - CONTROL CRED.xlsx");
    expect(rowCount).toBe(1);
    expect(buffer.byteLength).toBeGreaterThan(100);
  });
});

describe("FACT Excel rows", () => {
  it("includes tipo + totals + source filename", () => {
    expect(FACT_EXCEL_HEADERS).toHaveLength(11);
    const row = buildFactExcelRow({
      fecEmi: "2024-05-10",
      tipoDte: "01",
      codigoGeneracion: "F-1",
      emisorNit: "0614-1",
      emisorNrc: "99",
      emisorNombre: "Fact",
      totalPagar: 25.5,
      totalGravada: 0,
      iva: 0,
      totalConIva: 0,
      sourceFilename: "fact.json",
    });
    expect(row[0]).toBe("10/05/2024");
    expect(row[1]).toBe("01");
    expect(row[2]).toBe("F1");
    expect(row[3]).toBe("06141");
    expect(row[6]).toBe("25.50");
    expect(row[10]).toBe("fact.json");
  });

  it("extracts totalPagar from raw JSON", () => {
    expect(extractTotalPagar({ resumen: { totalPagar: 12.3 } })).toBe(12.3);
    expect(extractTotalPagar({ resumen: {} })).toBe(0);
    expect(extractTotalPagar(null)).toBe(0);
  });

  it("builds FACT workbook for 01/07/other", async () => {
    const { filename, buffer, rowCount } = await buildFactControlWorkbook(
      [
        {
          fecEmi: "2024-05-10",
          tipoDte: "01",
          codigoGeneracion: "A",
          emisorNit: "1",
          emisorNrc: "",
          emisorNombre: "F",
          totalPagar: 10,
          totalGravada: 0,
          iva: 0,
          totalConIva: 0,
          sourceFilename: "a.json",
        },
        {
          fecEmi: "2024-05-11",
          tipoDte: "07",
          codigoGeneracion: "B",
          emisorNit: "2",
          emisorNrc: "3",
          emisorNombre: "R",
          totalPagar: 0,
          totalGravada: 5,
          iva: 0.65,
          totalConIva: 5.65,
          sourceFilename: "b.json",
        },
        {
          fecEmi: "2024-05-12",
          tipoDte: "11",
          codigoGeneracion: "C",
          emisorNit: "",
          emisorNrc: "4",
          emisorNombre: "X",
          totalPagar: 1,
          totalGravada: 1,
          iva: 0,
          totalConIva: 1,
          sourceFilename: "c.json",
        },
      ],
      2024,
      5,
    );
    expect(filename).toBe("202405 - CONTROL FACT.xlsx");
    expect(rowCount).toBe(3);
    expect(buffer.byteLength).toBeGreaterThan(100);
  });
});
