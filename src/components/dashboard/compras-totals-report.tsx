"use client";

import { useMemo, useState } from "react";
import {
  MONTH_LABELS_ES,
  aggregateComprasReport,
  formatMoneyEs,
  tipoDteLabel,
  yearOptionsForDocs,
  type ComprasReportDoc,
} from "@/lib/dashboard/compras-report";
import { cn } from "@/lib/utils";

export function ComprasTotalsReport({
  docs,
  initialYear,
}: {
  docs: ComprasReportDoc[];
  initialYear: number;
}) {
  const [year, setYear] = useState(initialYear);
  const yearOptions = useMemo(
    () => yearOptionsForDocs(docs, year),
    [docs, year],
  );
  const matrix = useMemo(
    () => aggregateComprasReport(docs, year),
    [docs, year],
  );

  const maxMonthTotal = useMemo(() => {
    const peaks = matrix.byMonth.map((m) => Math.abs(m.total));
    return Math.max(0, ...peaks);
  }, [matrix.byMonth]);

  const isEmpty = matrix.documentCount === 0;

  return (
    <section
      className="compras-report brand-panel relative overflow-hidden"
      aria-labelledby="compras-report-title"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
      >
        <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,var(--brand-glow),transparent_70%)]" />
        <div className="absolute -right-10 top-8 h-40 w-72 rounded-full bg-[radial-gradient(circle,var(--brand-glow-deep),transparent_68%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--brand-table-head)_80%,transparent),transparent)]" />
      </div>

      <div className="brand-panel-header relative compras-report-enter">
        <div className="min-w-0 space-y-1">
          <p className="page-eyebrow">Informe del año</p>
          <h2
            id="compras-report-title"
            className="font-heading text-2xl font-semibold tracking-tight text-brand-ink sm:text-[1.75rem]"
          >
            Montos de compras
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-brand-muted">
            Totales netos por tipo DTE y mes de emisión. Misma base que el
            anexo F-07: gravada, IVA y total con IVA; la nota de crédito (05)
            resta y la de débito (06) suma.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
          <label htmlFor="compras-report-year" className="brand-field-label">
            Año
          </label>
          <select
            id="compras-report-year"
            className="brand-select w-[7.5rem]"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative space-y-6 px-5 py-5">
        <div
          key={`summary-${year}`}
          className="compras-report-fade grid gap-4 sm:grid-cols-3"
        >
          <SummaryStat
            label="Total compras (neto)"
            value={`$${formatMoneyEs(matrix.grand.total)}`}
            hint="Suma firmada del periodo"
          />
          <SummaryStat
            label="Documentos"
            value={String(matrix.documentCount)}
            hint={`Emitidos en ${year}`}
          />
          <SummaryStat
            label="Gravada · IVA"
            value={`$${formatMoneyEs(matrix.grand.gravada)}`}
            hint={`IVA $${formatMoneyEs(matrix.grand.iva)}`}
          />
        </div>

        {isEmpty ? (
          <div
            key={`empty-${year}`}
            className="compras-report-fade rounded-xl border border-dashed border-brand-border bg-white/50 px-5 py-10 text-center"
          >
            <p className="font-heading text-lg font-semibold text-brand-ink">
              Sin documentos en {year}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-brand-muted">
              No hay DTE cargados con fecha de emisión en este año para las
              empresas de tu espacio. Sube JSON en Carga / Export o elige otro
              año.
            </p>
          </div>
        ) : (
          <>
            <div
              key={`bars-${year}`}
              className="compras-report-fade space-y-3"
            >
              <div className="flex items-end justify-between gap-3">
                <p className="brand-field-label">Por mes</p>
                <p className="text-xs text-brand-muted">
                  Altura relativa al mes con mayor monto absoluto
                </p>
              </div>
              <div
                className="grid h-28 grid-cols-12 items-end gap-1.5 sm:gap-2"
                role="img"
                aria-label={`Distribución mensual de montos de compras en ${year}`}
              >
                {matrix.byMonth.map((bucket, index) => {
                  const ratio =
                    maxMonthTotal > 0
                      ? Math.abs(bucket.total) / maxMonthTotal
                      : 0;
                  const heightPct = bucket.count === 0 ? 0 : Math.max(ratio * 100, 8);
                  const negative = bucket.total < 0;
                  return (
                    <div
                      key={MONTH_LABELS_ES[index]}
                      className="flex h-full flex-col items-center justify-end gap-1"
                    >
                      <div
                        className={cn(
                          "compras-report-bar w-full max-w-[2.25rem] rounded-t-md",
                          negative
                            ? "bg-brand-muted/55"
                            : "bg-brand-accent/80",
                          bucket.count === 0 && "bg-brand-border/70",
                        )}
                        style={{
                          height: `${heightPct}%`,
                          animationDelay: `${index * 35}ms`,
                        }}
                        title={`${MONTH_LABELS_ES[index]}: $${formatMoneyEs(bucket.total)} (${bucket.count})`}
                      />
                      <span className="text-[10px] font-medium uppercase tracking-wide text-brand-muted">
                        {MONTH_LABELS_ES[index]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              key={`matrix-${year}`}
              className="compras-report-fade overflow-x-auto rounded-xl border border-brand-border bg-white/65"
            >
              <table className="w-full min-w-[52rem] border-collapse text-sm">
                <caption className="sr-only">
                  Matriz de montos de compras por tipo DTE y mes para {year}
                </caption>
                <thead>
                  <tr className="bg-brand-table-head/90 text-left">
                    <th className="sticky left-0 z-10 bg-brand-table-head px-3 py-2.5 font-medium text-brand-ink">
                      Tipo DTE
                    </th>
                    {MONTH_LABELS_ES.map((label) => (
                      <th
                        key={label}
                        className="px-2 py-2.5 text-right font-medium text-brand-muted"
                      >
                        {label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right font-semibold text-brand-ink">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.tipos.map((tipo) => (
                    <tr
                      key={tipo}
                      className="border-t border-brand-border/80 hover:bg-brand-accent-soft/25"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-[color-mix(in_srgb,var(--brand-panel)_92%,white)] px-3 py-2 text-left font-medium text-brand-ink"
                      >
                        <span className="font-mono text-xs text-brand-accent">
                          {tipo}
                        </span>{" "}
                        <span className="text-brand-muted">
                          {tipoDteLabel(tipo)}
                        </span>
                      </th>
                      {matrix.cells[tipo]!.map((cell, monthIndex) => (
                        <td
                          key={`${tipo}-${monthIndex}`}
                          className={cn(
                            "px-2 py-2 text-right tabular-nums",
                            cell.count === 0
                              ? "text-brand-border"
                              : cell.total < 0
                                ? "text-brand-muted"
                                : "text-brand-ink",
                          )}
                        >
                          {cell.count === 0
                            ? "—"
                            : formatMoneyEs(cell.total)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-brand-ink">
                        {formatMoneyEs(matrix.byTipo[tipo]!.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-brand-border bg-brand-table-head/60">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-brand-table-head px-3 py-2.5 text-left font-semibold text-brand-ink"
                    >
                      Total mes
                    </th>
                    {matrix.byMonth.map((bucket, monthIndex) => (
                      <td
                        key={`foot-${monthIndex}`}
                        className="px-2 py-2.5 text-right font-semibold tabular-nums text-brand-ink"
                      >
                        {bucket.count === 0
                          ? "—"
                          : formatMoneyEs(bucket.total)}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-brand-accent">
                      {formatMoneyEs(matrix.grand.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-brand-border/80 bg-white/55 px-4 py-3">
      <p className="brand-field-label">{label}</p>
      <p className="mt-1.5 font-heading text-2xl font-semibold tracking-tight text-brand-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-brand-muted">{hint}</p>
    </div>
  );
}
