import ExcelJS from "exceljs";
import {
  CLASE_DOCUMENTO_DTE,
  DEFAULT_CLASSIFICATION,
  NUMERO_ANEXO,
  type ExportClassification,
} from "@/lib/dte/types";
import { amountSignForTipo, signedExportAmounts } from "@/lib/csv/amounts";
import {
  applyPeriodClassification,
  formatEmissionDate,
  formatMoney,
  stripDashes,
} from "@/lib/csv/format";
import { buildControlExcelFilename } from "./filenames";

/** Columns aligned with Licuadora.py CRED control Excel. */
export const CRED_EXCEL_HEADERS = [
  "Fecha de Emision",
  "Clase Documento",
  "Tipo Documento",
  "Codigo de Generacion",
  "NRC",
  "NIT",
  "Nombre Proveedor",
  "Compras internas Exentas",
  "Internaciones Exentas",
  "Importaciones Exentas",
  "Compras Internas Gravadas",
  "Internacines Gravadas de Bienes",
  "Importaciones Gravadas de Bienes",
  "Importaciones Gravadas de Servicios",
  "Credito Fiscal",
  "Total Compras",
  "DUI",
  "EXENTO",
  "Tipo Operacion",
  "Clasificacion",
  "Sector",
  "Tipo de Costo/Gasto",
  "Anexo",
] as const;

export type CredExcelDoc = {
  fecEmi: string;
  tipoDte: string;
  codigoGeneracion: string;
  emisorNit: string;
  emisorNrc: string;
  emisorNombre: string;
  totalGravada: number;
  iva: number;
  totalConIva: number;
  exento: number;
  dui?: string;
  classification?: ExportClassification;
};

export type CredExcelRow = (string | number)[];

/**
 * Build one CRED control Excel data row (tipos 03/05/06).
 * Amounts for 05/06 follow CSV signed rules (NC subtracts, ND adds).
 */
export function buildCredExcelRow(
  doc: CredExcelDoc,
  periodYear: number,
  periodMonth: number,
): CredExcelRow {
  const classification = applyPeriodClassification(
    periodYear,
    periodMonth,
    doc.classification ?? DEFAULT_CLASSIFICATION,
  );
  const amounts = signedExportAmounts(doc.tipoDte, {
    totalGravada: doc.totalGravada,
    iva: doc.iva,
    totalConIva: doc.totalConIva,
  });
  const exento = amountSignForTipo(doc.tipoDte) * Math.abs(doc.exento);

  return [
    formatEmissionDate(doc.fecEmi),
    CLASE_DOCUMENTO_DTE,
    doc.tipoDte,
    stripDashes(doc.codigoGeneracion),
    stripDashes(doc.emisorNrc),
    stripDashes(doc.emisorNit),
    doc.emisorNombre,
    formatMoney(0),
    formatMoney(0),
    formatMoney(0),
    formatMoney(amounts.totalGravada),
    formatMoney(0),
    formatMoney(0),
    formatMoney(0),
    formatMoney(amounts.iva),
    formatMoney(amounts.totalConIva),
    stripDashes(doc.dui ?? ""),
    formatMoney(exento),
    classification.tipoOperacion,
    classification.clasificacion,
    classification.sector,
    classification.tipoCostoGasto,
    NUMERO_ANEXO,
  ];
}

export async function buildCredControlWorkbook(
  docs: CredExcelDoc[],
  periodYear: number,
  periodMonth: number,
): Promise<{ filename: string; buffer: ArrayBuffer; rowCount: number }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Anexo Compras";
  const sheet = workbook.addWorksheet("CRED");
  sheet.addRow([...CRED_EXCEL_HEADERS]);

  for (const doc of docs) {
    sheet.addRow(buildCredExcelRow(doc, periodYear, periodMonth));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    filename: buildControlExcelFilename(periodYear, periodMonth, "CRED"),
    buffer: buffer as ArrayBuffer,
    rowCount: docs.length,
  };
}
