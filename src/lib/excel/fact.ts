import ExcelJS from "exceljs";
import { formatEmissionDate, formatMoney, stripDashes } from "@/lib/csv/format";
import { buildControlExcelFilename } from "./filenames";

/**
 * FACT / otros control Excel.
 * Tipo 01 follows Licuadora FACT columns; 07 and unexpected tipos add
 * tipo + key resumen totals + source filename in the same sheet.
 */
export const FACT_EXCEL_HEADERS = [
  "Fecha de Emision",
  "Tipo Documento",
  "Codigo de Generacion",
  "NIT",
  "NRC",
  "Nombre Proveedor",
  "Total a Pagar",
  "Total Gravada",
  "Credito Fiscal",
  "Total Con IVA",
  "Source Filename",
] as const;

export type FactExcelDoc = {
  fecEmi: string;
  tipoDte: string;
  codigoGeneracion: string;
  emisorNit: string;
  emisorNrc: string;
  emisorNombre: string;
  totalPagar: number;
  totalGravada: number;
  iva: number;
  totalConIva: number;
  sourceFilename?: string | null;
};

export type FactExcelRow = (string | number)[];

export function buildFactExcelRow(doc: FactExcelDoc): FactExcelRow {
  return [
    formatEmissionDate(doc.fecEmi),
    doc.tipoDte,
    stripDashes(doc.codigoGeneracion),
    stripDashes(doc.emisorNit),
    stripDashes(doc.emisorNrc),
    doc.emisorNombre,
    formatMoney(doc.totalPagar),
    formatMoney(doc.totalGravada),
    formatMoney(doc.iva),
    formatMoney(doc.totalConIva),
    doc.sourceFilename ?? "",
  ];
}

/** Read totalPagar from raw DTE JSON when present. */
export function extractTotalPagar(raw: Record<string, unknown> | null | undefined): number {
  if (!raw || typeof raw !== "object") return 0;
  const resumen = raw.resumen;
  if (!resumen || typeof resumen !== "object" || Array.isArray(resumen)) return 0;
  const value = (resumen as Record<string, unknown>).totalPagar;
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

export async function buildFactControlWorkbook(
  docs: FactExcelDoc[],
  periodYear: number,
  periodMonth: number,
): Promise<{ filename: string; buffer: ArrayBuffer; rowCount: number }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Anexo Compras";
  const sheet = workbook.addWorksheet("FACT");
  sheet.addRow([...FACT_EXCEL_HEADERS]);

  for (const doc of docs) {
    sheet.addRow(buildFactExcelRow(doc));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    filename: buildControlExcelFilename(periodYear, periodMonth, "FACT"),
    buffer: buffer as ArrayBuffer,
    rowCount: docs.length,
  };
}
