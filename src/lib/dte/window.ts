/**
 * Month difference from emission date to target period.
 * 0 = same month (selected period),
 * 1 = one month earlier,
 * 2 = two months earlier.
 *
 * Together with `isInProcessingWindow`, this is the selected period + 2 prior
 * months = **3 periods total** (F-07 art. 63 framing / locked product rule).
 */
export function monthDifference(
  fecEmiIso: string,
  year: number,
  month: number,
): number {
  const [yEmi, mEmi] = fecEmiIso.split("-").map((p) => Number(p));
  if (!yEmi || !mEmi) {
    throw new Error(`Invalid fecEmi: ${fecEmiIso}`);
  }
  return (year - yEmi) * 12 + (month - mEmi);
}

/**
 * Accept emission dates in the selected period and up to `monthsBack` prior
 * months (default 2 → `0 <= diff <= 2`).
 */
export function isInProcessingWindow(
  fecEmiIso: string,
  year: number,
  month: number,
  monthsBack = 2,
): boolean {
  try {
    const diff = monthDifference(fecEmiIso, year, month);
    return diff >= 0 && diff <= monthsBack;
  } catch {
    return false;
  }
}
