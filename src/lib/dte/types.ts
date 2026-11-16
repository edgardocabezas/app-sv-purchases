/** DTE types persisted by the MVP. */
export const PERSISTED_DTE_TYPES = ["01", "03", "05", "06", "07"] as const;
export type PersistedDteType = (typeof PERSISTED_DTE_TYPES)[number];

/**
 * Tipos that appear as rows in Anexo Compras CSV (F-07 V14 locked decision).
 * 01 and 07 remain informative-only (persisted, not exported).
 */
export const EXPORT_DTE_TYPES = ["03", "05", "06"] as const;
export type ExportDteType = (typeof EXPORT_DTE_TYPES)[number];

/** @deprecated Use EXPORT_DTE_TYPES / isExportDteType */
export const EXPORT_DTE_TYPE = "03" as const;

export const INFORMATIVE_DTE_TYPES = ["01", "07"] as const;

export function isExportDteType(tipo: string): tipo is ExportDteType {
  return (EXPORT_DTE_TYPES as readonly string[]).includes(tipo);
}

export function isInformativeDteType(tipo: string): boolean {
  return (INFORMATIVE_DTE_TYPES as readonly string[]).includes(tipo);
}

export const TRIBUTO_IVA = "20";
export const TRIBUTO_COTRANS = "C8";
export const TRIBUTO_FOVIAL = "D1";

export type ParseEncoding = "utf-8-sig" | "cp1252" | "latin-1";

export interface DteTributo {
  codigo?: string | null;
  valor?: number | string | null;
}

export interface ParsedDte {
  tipoDte: PersistedDteType;
  codigoGeneracion: string;
  fecEmi: string; // YYYY-MM-DD
  emisorNit: string;
  emisorNrc: string;
  emisorNombre: string;
  totalGravada: number;
  iva: number;
  cotrans: number;
  fovial: number;
  totalConIva: number;
  exento: number;
  encoding: ParseEncoding;
  raw: Record<string, unknown>;
}

export interface ParseDteSuccess {
  ok: true;
  data: ParsedDte;
}

export interface ParseDteFailure {
  ok: false;
  error: string;
  code:
    | "empty"
    | "malformed"
    | "missing_fec_emi"
    | "unsupported_tipo"
    | "missing_codigo"
    | "invalid_amounts";
}

export type ParseDteResult = ParseDteSuccess | ParseDteFailure;

export interface ExportClassification {
  /** Column Q — Tipo de Operación */
  tipoOperacion: string;
  /** Column R — Clasificación */
  clasificacion: string;
  /** Column S — Sector */
  sector: string;
  /** Column T — Tipo de Costo/Gasto */
  tipoCostoGasto: string;
}

export const DEFAULT_CLASSIFICATION: ExportClassification = {
  tipoOperacion: "1",
  clasificacion: "2",
  sector: "2",
  tipoCostoGasto: "2",
};

export const CLASE_DOCUMENTO_DTE = "4";
export const NUMERO_ANEXO = "3";

/** Q–T must be "0" for declaration periods before February 2024 (F-07 V14). */
export const QT_EFFECTIVE_YEAR = 2024;
export const QT_EFFECTIVE_MONTH = 2;

/**
 * Processing window: selected period + 2 prior months (3 periods total).
 * `isInProcessingWindow` accepts month diffs where `0 <= diff <= 2`.
 */
export const PROCESSING_WINDOW_MONTHS_BACK = 2;
