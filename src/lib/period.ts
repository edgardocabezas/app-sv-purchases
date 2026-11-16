export type ProcessingPeriod = {
  year: number;
  /** Calendar month 1–12 */
  month: number;
};

/**
 * Previous calendar month relative to `date` (defaults to now).
 * January → December of the previous year.
 */
export function previousPeriod(date: Date = new Date()): ProcessingPeriod {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1–12
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}
