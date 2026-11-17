import { amountSignForTipo } from "@/lib/csv/amounts";

/** Spanish calendar month labels (1–12). */
export const MONTH_LABELS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

/** Display names for known tipo DTE; unknown codes fall back to the code. */
export const TIPO_DTE_LABELS: Record<string, string> = {
  "01": "Factura",
  "03": "Crédito fiscal",
  "05": "Nota de crédito",
  "06": "Nota de débito",
  "07": "Comprobante de retención",
};

/**
 * How monthly buckets are chosen for the dashboard report.
 * - `emission`: fecha de factura (`fec_emi`) — compras reales por mes
 * - `reported`: periodo F-07 de carga/export (`period_year`/`period_month`)
 */
export type ComprasDatePerspective = "emission" | "reported";

export const DEFAULT_COMPRAS_DATE_PERSPECTIVE: ComprasDatePerspective =
  "emission";

export type ComprasReportDoc = {
  tipo_dte: string;
  fec_emi: string;
  /** Reporting period year set at upload / export selection. */
  period_year: number | null;
  /** Reporting period month (1–12) set at upload / export selection. */
  period_month: number | null;
  total_gravada: number;
  iva: number;
  total_con_iva: number;
};

export type MoneyBucket = {
  gravada: number;
  iva: number;
  total: number;
  count: number;
};

export type ComprasReportMatrix = {
  year: number;
  perspective: ComprasDatePerspective;
  tipos: string[];
  /** cells[tipo][monthIndex 0–11] */
  cells: Record<string, MoneyBucket[]>;
  byMonth: MoneyBucket[];
  byTipo: Record<string, MoneyBucket>;
  grand: MoneyBucket;
  documentCount: number;
};

function emptyBucket(): MoneyBucket {
  return { gravada: 0, iva: 0, total: 0, count: 0 };
}

function addSigned(
  bucket: MoneyBucket,
  doc: ComprasReportDoc,
): void {
  const sign = amountSignForTipo(doc.tipo_dte);
  bucket.gravada += sign * (Number(doc.total_gravada) || 0);
  bucket.iva += sign * (Number(doc.iva) || 0);
  bucket.total += sign * (Number(doc.total_con_iva) || 0);
  bucket.count += 1;
}

function parseEmissionMonth(fecEmi: string): { year: number; month: number } | null {
  // Expected YYYY-MM-DD (date column / ISO date)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecEmi);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!year || month < 1 || month > 12) return null;
  return { year, month };
}

function parseReportedMonth(
  doc: Pick<ComprasReportDoc, "period_year" | "period_month">,
): { year: number; month: number } | null {
  const year = doc.period_year;
  const month = doc.period_month;
  if (year == null || month == null) return null;
  if (!year || month < 1 || month > 12) return null;
  return { year, month };
}

/** Resolve year/month bucket for a doc under the chosen perspective. */
export function resolveComprasDocMonth(
  doc: Pick<ComprasReportDoc, "fec_emi" | "period_year" | "period_month">,
  perspective: ComprasDatePerspective,
): { year: number; month: number } | null {
  if (perspective === "reported") {
    return parseReportedMonth(doc);
  }
  return parseEmissionMonth(doc.fec_emi);
}

/** Prefer known tipo order, then any unexpected codes alphabetically. */
export function sortTipoDteCodes(tipos: Iterable<string>): string[] {
  const knownOrder = ["01", "03", "05", "06", "07"];
  const set = new Set(tipos);
  const ordered: string[] = [];
  for (const t of knownOrder) {
    if (set.has(t)) {
      ordered.push(t);
      set.delete(t);
    }
  }
  return ordered.concat(Array.from(set).sort());
}

export function tipoDteLabel(tipo: string): string {
  return TIPO_DTE_LABELS[tipo] ?? `Tipo ${tipo}`;
}

/**
 * Aggregate purchase amounts for a calendar year by tipo DTE × month.
 * Month basis follows `perspective` (emission date vs F-07 reporting period).
 * Uses the same signed F-07 money rules as CSV build (05 resta, 03/06 suman).
 */
export function aggregateComprasReport(
  docs: readonly ComprasReportDoc[],
  year: number,
  perspective: ComprasDatePerspective = DEFAULT_COMPRAS_DATE_PERSPECTIVE,
): ComprasReportMatrix {
  const yearDocs: Array<ComprasReportDoc & { month: number }> = [];
  const tipoSet = new Set<string>();

  for (const doc of docs) {
    const parsed = resolveComprasDocMonth(doc, perspective);
    if (!parsed || parsed.year !== year) continue;
    yearDocs.push({ ...doc, month: parsed.month });
    tipoSet.add(doc.tipo_dte);
  }

  const tipos = sortTipoDteCodes(tipoSet);
  const cells: Record<string, MoneyBucket[]> = {};
  const byTipo: Record<string, MoneyBucket> = {};
  for (const tipo of tipos) {
    cells[tipo] = Array.from({ length: 12 }, () => emptyBucket());
    byTipo[tipo] = emptyBucket();
  }

  const byMonth = Array.from({ length: 12 }, () => emptyBucket());
  const grand = emptyBucket();

  for (const doc of yearDocs) {
    const monthIndex = doc.month - 1;
    const cell = cells[doc.tipo_dte]![monthIndex]!;
    addSigned(cell, doc);
    addSigned(byTipo[doc.tipo_dte]!, doc);
    addSigned(byMonth[monthIndex]!, doc);
    addSigned(grand, doc);
  }

  return {
    year,
    perspective,
    tipos,
    cells,
    byMonth,
    byTipo,
    grand,
    documentCount: yearDocs.length,
  };
}

/** Years present in docs (by active perspective) plus a small recent window. */
export function yearOptionsForDocs(
  docs: readonly Pick<
    ComprasReportDoc,
    "fec_emi" | "period_year" | "period_month"
  >[],
  selectedYear: number,
  perspective: ComprasDatePerspective = DEFAULT_COMPRAS_DATE_PERSPECTIVE,
  now: Date = new Date(),
): number[] {
  const current = now.getFullYear();
  const years = new Set<number>();
  for (let y = current; y >= current - 5; y -= 1) years.add(y);
  years.add(selectedYear);
  for (const doc of docs) {
    const parsed = resolveComprasDocMonth(doc, perspective);
    if (parsed) years.add(parsed.year);
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function formatMoneyEs(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("es-SV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `−${formatted}` : formatted;
}
