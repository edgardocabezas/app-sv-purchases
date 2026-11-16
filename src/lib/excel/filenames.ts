/**
 * Control Excel filenames (Licuadora-style period prefix).
 * Not bound by the CSV ≤25-char rule; keep them readable and short.
 */
export function buildControlExcelFilename(
  year: number,
  month: number,
  kind: "CRED" | "FACT",
): string {
  const ym = `${year}${String(month).padStart(2, "0")}`;
  return `${ym} - CONTROL ${kind}.xlsx`;
}
