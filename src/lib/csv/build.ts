import type { AnexoComprasRow } from "./row";

const DELIMITER = ";";
const MAX_FILENAME_LENGTH = 25;

/**
 * Build Anexo Compras CSV content:
 * - `;` delimiter
 * - no header
 * - all text cells
 * - QUOTE_NONE equivalent (no quoting; values must not contain `;`)
 */
export function buildAnexoComprasCsv(rows: AnexoComprasRow[]): string {
  if (rows.length === 0) return "";

  return (
    rows
      .map((row) =>
        row
          .map((cell) => {
            if (cell.includes(DELIMITER) || cell.includes("\n") || cell.includes("\r")) {
              throw new Error(
                `CSV cell contains forbidden character for QUOTE_NONE: ${JSON.stringify(cell)}`,
              );
            }
            return cell;
          })
          .join(DELIMITER),
      )
      .join("\r\n") + "\r\n"
  );
}

/**
 * Build a download filename ≤ 25 characters.
 * Default pattern: YYYYMM-compras.csv (17 chars) or custom truncated stem.
 */
export function buildAnexoComprasFilename(
  year: number,
  month: number,
  stem = "compras",
): string {
  const ym = `${year}${String(month).padStart(2, "0")}`;
  let name = `${ym}-${stem}.csv`;
  if (name.length <= MAX_FILENAME_LENGTH) return name;

  const maxStem = MAX_FILENAME_LENGTH - ym.length - 1 - 4; // - and .csv
  const trimmed = stem.slice(0, Math.max(1, maxStem));
  name = `${ym}-${trimmed}.csv`;
  return name.slice(0, MAX_FILENAME_LENGTH);
}

export { MAX_FILENAME_LENGTH };
