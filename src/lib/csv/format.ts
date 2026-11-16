/**
 * Strip dashes (and slashes used in some tax IDs) from codes / identifiers.
 * Column D (código de generación) and Column E (NIT/NRC) must be dash-free.
 */
export function stripDashes(value: string): string {
  return value.replace(/[-/]/g, "").trim();
}

/**
 * Format money as text with exactly 2 decimal places.
 * No thousands separator; max 10 characters (F-07 money columns).
 * Used for every numeric CSV column (G–O and Excel money cells).
 */
export function formatMoney(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  // Round half away from zero at 2 decimals, then emit fixed text.
  const scaled = n * 100;
  const roundedInt =
    scaled >= 0 ? Math.floor(scaled + 0.5 + Number.EPSILON) : Math.ceil(scaled - 0.5 - Number.EPSILON);
  const formatted = (roundedInt / 100).toFixed(2);
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

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}
