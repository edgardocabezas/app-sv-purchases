import {
  QT_EFFECTIVE_MONTH,
  QT_EFFECTIVE_YEAR,
  type ExportClassification,
} from "@/lib/dte/types";

/** Strip dashes and slashes from tax IDs / generation codes. */
export function stripDashes(value: string): string {
  return value.replace(/[-/]/g, "").trim();
}

/** Format money as text with exactly 2 decimals, no thousands separator, max 10 chars. */
export function formatMoney(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const formatted = n.toFixed(2);
  if (formatted.length > 10) {
    throw new Error(`Money value exceeds 10 characters: ${formatted}`);
  }
  return formatted;
}

/** Emission date YYYY-MM-DD → DD/MM/YYYY (Licuadora format_date). */
export function formatEmissionDate(fecEmiIso: string): string {
  const [y, m, d] = fecEmiIso.split("-");
  if (!y || !m || !d) {
    throw new Error(`Invalid fecEmi: ${fecEmiIso}`);
  }
  return `${d}/${m}/${y}`;
}

/**
 * Column E: NIT without dashes; if empty, NRC without dashes (no zero-padding).
 */
export function resolveProveedorId(nit: string, nrc: string): string {
  const cleanNit = stripDashes(nit);
  if (cleanNit) return cleanNit;
  // Do not zero-pad NRC; keep digits as provided after stripping dashes.
  return stripDashes(nrc);
}

/** Q–T are forced to "0" when declaration period is before 2024-02. */
export function applyPeriodClassification(
  year: number,
  month: number,
  classification: ExportClassification,
): ExportClassification {
  const beforeEffective =
    year < QT_EFFECTIVE_YEAR ||
    (year === QT_EFFECTIVE_YEAR && month < QT_EFFECTIVE_MONTH);

  if (beforeEffective) {
    return {
      tipoOperacion: "0",
      clasificacion: "0",
      sector: "0",
      tipoCostoGasto: "0",
    };
  }
  return classification;
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}
