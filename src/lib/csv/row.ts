import {
  CLASE_DOCUMENTO_DTE,
  DEFAULT_CLASSIFICATION,
  NUMERO_ANEXO,
  type ExportClassification,
} from "@/lib/dte/types";
import { signedExportAmounts } from "./amounts";
import {
  applyPeriodClassification,
  formatEmissionDate,
  formatMoney,
  resolveProveedorId,
  stripDashes,
  truncate,
} from "./format";

/** Column character limits from F-07 V14 Anexo Compras (A–U). */
export const COLUMN_LIMITS = {
  A: 10, // fecha dd/mm/yyyy
  B: 1, // clase
  C: 2, // tipo doc
  D: 100, // código generación
  E: 14, // NIT/NRC
  F: 250, // nombre (manual doesn't hard-cap tightly; keep practical)
  G: 10,
  H: 10,
  I: 10,
  J: 10,
  K: 10,
  L: 10,
  M: 10,
  N: 10,
  O: 10,
  P: 9, // DUI
  Q: 1,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
} as const;

export interface AnexoComprasRowInput {
  fecEmi: string;
  codigoGeneracion: string;
  emisorNit: string;
  emisorNrc: string;
  emisorNombre: string;
  totalGravada: number;
  iva: number;
  totalConIva: number;
  dui?: string;
  periodYear: number;
  periodMonth: number;
  classification?: ExportClassification;
  /**
   * Tipo de documento (column C). Default `03`.
   * Use `05` / `06` for NC/ND — money columns are signed per F-07
   * (05 subtracts, 06/03 add). See `signedExportAmounts`.
   */
  tipoDocumento?: string;
}

export type AnexoComprasRow = [
  string, // A fecha
  string, // B clase
  string, // C tipo
  string, // D codigo
  string, // E nit/nrc
  string, // F nombre
  string, // G exentas internas
  string, // H internaciones exentas
  string, // I importaciones exentas
  string, // J gravadas internas
  string, // K internaciones gravadas
  string, // L importaciones bienes
  string, // M importaciones servicios
  string, // N crédito fiscal
  string, // O total
  string, // P DUI
  string, // Q tipo operación
  string, // R clasificación
  string, // S sector
  string, // T tipo costo/gasto
  string, // U anexo
];

/**
 * Build one Anexo Compras CSV row (21 columns A–U) as all-text cells.
 */
export function buildAnexoComprasRow(
  input: AnexoComprasRowInput,
): AnexoComprasRow {
  const classification = applyPeriodClassification(
    input.periodYear,
    input.periodMonth,
    input.classification ?? DEFAULT_CLASSIFICATION,
  );

  const tipoDocumento = input.tipoDocumento ?? "03";
  const amounts = signedExportAmounts(tipoDocumento, {
    totalGravada: input.totalGravada,
    iva: input.iva,
    totalConIva: input.totalConIva,
  });

  const codigo = truncate(stripDashes(input.codigoGeneracion), COLUMN_LIMITS.D);
  const proveedorId = truncate(
    resolveProveedorId(input.emisorNit, input.emisorNrc),
    COLUMN_LIMITS.E,
  );
  const nombre = truncate(input.emisorNombre, COLUMN_LIMITS.F);
  const dui = truncate(stripDashes(input.dui ?? ""), COLUMN_LIMITS.P);

  const row: AnexoComprasRow = [
    formatEmissionDate(input.fecEmi),
    CLASE_DOCUMENTO_DTE,
    tipoDocumento,
    codigo,
    proveedorId,
    nombre,
    formatMoney(0),
    formatMoney(0),
    formatMoney(0),
    formatMoney(amounts.totalGravada),
    formatMoney(0),
    formatMoney(0),
    formatMoney(0),
    formatMoney(amounts.iva),
    formatMoney(amounts.totalConIva),
    dui,
    classification.tipoOperacion,
    classification.clasificacion,
    classification.sector,
    classification.tipoCostoGasto,
    NUMERO_ANEXO,
  ];

  validateRowLimits(row);
  return row;
}

function validateRowLimits(row: AnexoComprasRow): void {
  const keys = Object.keys(COLUMN_LIMITS) as (keyof typeof COLUMN_LIMITS)[];
  keys.forEach((key, index) => {
    const limit = COLUMN_LIMITS[key];
    const value = row[index];
    if (value.length > limit) {
      throw new Error(
        `Column ${key} exceeds ${limit} characters: "${value}" (${value.length})`,
      );
    }
  });
}
