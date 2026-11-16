"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  uploadDteFiles,
  bulkUpdateClassification,
  updateDocumentClassification,
} from "@/app/actions/documents";
import {
  exportAnexoComprasCsv,
  exportCredControlExcel,
  exportFactControlExcel,
} from "@/app/actions/export";
import type { Company, DteDocument } from "@/types/database";
import {
  DEFAULT_CLASSIFICATION,
  isExportDteType,
  type ExportClassification,
} from "@/lib/dte/types";
import {
  applyClassificationPatch,
  optionsForClasificacion,
  optionsForSector,
  optionsForTipoCostoGasto,
  optionsForTipoOperacion,
} from "@/lib/dte/qrt-cascade";
import { previousPeriod } from "@/lib/period";
import { ClassificationSelect } from "@/components/export/classification-select";
import { BrandPanel } from "@/components/brand-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UploadResult = {
  filename: string;
  status: string;
  message: string;
  tipoDte?: string;
};

type DateSort = "asc" | "desc" | "none";

function downloadBase64Excel(filename: string, base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function classificationFromDoc(d: DteDocument): ExportClassification {
  return {
    tipoOperacion: d.tipo_operacion ?? DEFAULT_CLASSIFICATION.tipoOperacion,
    clasificacion: d.clasificacion ?? DEFAULT_CLASSIFICATION.clasificacion,
    sector: d.sector ?? DEFAULT_CLASSIFICATION.sector,
    tipoCostoGasto: d.tipo_costo_gasto ?? DEFAULT_CLASSIFICATION.tipoCostoGasto,
  };
}

function money(n: number): string {
  return Number(n).toFixed(2);
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="brand-field-label">
        {label}
      </Label>
      {children}
    </div>
  );
}

const selectClass = "brand-select";

export function ExportWorkspace({
  companies,
  initialDocs,
}: {
  companies: Company[];
  initialDocs: DteDocument[];
}) {
  const initialPeriod = previousPeriod();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [year, setYear] = useState(initialPeriod.year);
  const [month, setMonth] = useState(initialPeriod.month);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [docs, setDocs] = useState(initialDocs);
  const [pending, startTransition] = useTransition();

  const [bulk, setBulk] = useState<ExportClassification>(DEFAULT_CLASSIFICATION);

  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateSort, setDateSort] = useState<DateSort>("asc");

  const periodDocs = useMemo(
    () =>
      docs.filter(
        (d) =>
          d.company_id === companyId &&
          d.period_year === year &&
          d.period_month === month,
      ),
    [docs, companyId, year, month],
  );

  const tipoOptions = useMemo(() => {
    const set = new Set(periodDocs.map((d) => d.tipo_dte));
    return Array.from(set).sort();
  }, [periodDocs]);

  const filtered = useMemo(() => {
    let rows = periodDocs;
    if (tipoFilter !== "all") {
      rows = rows.filter((d) => d.tipo_dte === tipoFilter);
    }
    if (dateFrom) {
      rows = rows.filter((d) => d.fec_emi >= dateFrom);
    }
    if (dateTo) {
      rows = rows.filter((d) => d.fec_emi <= dateTo);
    }
    if (dateSort !== "none") {
      const dir = dateSort === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        if (a.fec_emi === b.fec_emi) {
          return a.codigo_generacion.localeCompare(b.codigo_generacion);
        }
        return a.fec_emi < b.fec_emi ? -dir : dir;
      });
    }
    return rows;
  }, [periodDocs, tipoFilter, dateFrom, dateTo, dateSort]);

  const exportable = filtered.filter((d) => isExportDteType(d.tipo_dte));
  const informative = filtered.filter((d) => !isExportDteType(d.tipo_dte));
  const periodExportable = periodDocs.filter((d) => isExportDteType(d.tipo_dte));

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, d) => {
        acc.gravada += Number(d.total_gravada) || 0;
        acc.iva += Number(d.iva) || 0;
        acc.total += Number(d.total_con_iva) || 0;
        acc.exento += Number(d.exento) || 0;
        return acc;
      },
      { gravada: 0, iva: 0, total: 0, exento: 0 },
    );
  }, [filtered]);

  const bulkTOptions = useMemo(
    () =>
      optionsForTipoCostoGasto(
        bulk.tipoOperacion,
        bulk.clasificacion,
        bulk.sector,
      ),
    [bulk.tipoOperacion, bulk.clasificacion, bulk.sector],
  );

  const filtersActive =
    tipoFilter !== "all" || dateFrom !== "" || dateTo !== "" || dateSort !== "asc";

  function clearFilters() {
    setTipoFilter("all");
    setDateFrom("");
    setDateTo("");
    setDateSort("asc");
  }

  function patchBulk(patch: Partial<ExportClassification>) {
    setBulk((prev) => applyClassificationPatch(prev, patch));
  }

  async function reloadDocs() {
    window.location.reload();
  }

  function onUpload() {
    if (!companyId) {
      setError("Selecciona una empresa.");
      return;
    }
    if (!files || files.length === 0) {
      setError("Selecciona archivos JSON.");
      return;
    }

    setError(null);
    setInfo(null);
    const fd = new FormData();
    fd.set("company_id", companyId);
    fd.set("year", String(year));
    fd.set("month", String(month));
    Array.from(files).forEach((f) => fd.append("files", f));

    startTransition(async () => {
      const result = await uploadDteFiles({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUploadResults(result.results ?? []);
      setInfo("Carga procesada. Recargando documentos…");
      await reloadDocs();
    });
  }

  function onApplyClassification() {
    const classification = applyClassificationPatch(bulk, {});
    const ids = periodExportable.map((d) => d.id);
    startTransition(async () => {
      const result = await bulkUpdateClassification(ids, classification);
      if (result.error) {
        setError(result.error);
        return;
      }
      setInfo(
        `Clasificación aplicada a ${result.updated ?? ids.length} documentos.`,
      );
      setDocs((prev) =>
        prev.map((d) =>
          ids.includes(d.id)
            ? {
                ...d,
                tipo_operacion: classification.tipoOperacion,
                clasificacion: classification.clasificacion,
                sector: classification.sector,
                tipo_costo_gasto: classification.tipoCostoGasto,
              }
            : d,
        ),
      );
    });
  }

  function onRowClassificationChange(
    doc: DteDocument,
    patch: Partial<ExportClassification>,
  ) {
    if (!isExportDteType(doc.tipo_dte)) return;
    const next = applyClassificationPatch(classificationFromDoc(doc), patch);
    setDocs((prev) =>
      prev.map((d) =>
        d.id === doc.id
          ? {
              ...d,
              tipo_operacion: next.tipoOperacion,
              clasificacion: next.clasificacion,
              sector: next.sector,
              tipo_costo_gasto: next.tipoCostoGasto,
            }
          : d,
      ),
    );
    startTransition(async () => {
      const result = await updateDocumentClassification(doc.id, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setInfo(
        `Clasificación actualizada para ${doc.codigo_generacion.slice(0, 8)}…`,
      );
    });
  }

  function onExportCsv() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await exportAnexoComprasCsv({ companyId, year, month });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      setInfo(`CSV descargado: ${result.filename} (${result.rowCount} filas).`);
    });
  }

  function onExportCredExcel() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await exportCredControlExcel({ companyId, year, month });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadBase64Excel(result.filename, result.base64);
      setInfo(
        `Excel CRED descargado: ${result.filename} (${result.rowCount} filas).`,
      );
    });
  }

  function onExportFactExcel() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await exportFactControlExcel({ companyId, year, month });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadBase64Excel(result.filename, result.base64);
      setInfo(
        `Excel FACT descargado: ${result.filename} (${result.rowCount} filas).`,
      );
    });
  }

  if (companies.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Crea una empresa en tu espacio antes de cargar DTE.
        </AlertDescription>
      </Alert>
    );
  }

  const periodLabel = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="relative space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {info ? (
        <Alert className="border-brand-border bg-white/70">
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      ) : null}

      <BrandPanel
        eyebrow="Contexto"
        title="Periodo y empresa"
        description="Periodo a declarar (por defecto el mes anterior). Ventana: ese periodo + 2 meses anteriores."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="company" label="Empresa">
            <select
              id="company"
              className={selectClass}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="year" label="Año">
            <Input
              id="year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-lg border-brand-border bg-white/80 shadow-sm"
            />
          </Field>
          <Field id="month" label="Mes">
            <Input
              id="month"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 rounded-lg border-brand-border bg-white/80 shadow-sm"
            />
          </Field>
        </div>
        <p className="mt-4 text-xs text-brand-muted">
          Periodo activo:{" "}
          <span className="font-medium text-brand-ink">{periodLabel}</span> ·{" "}
          {periodDocs.length} documentos cargados
        </p>
      </BrandPanel>

      <BrandPanel
        eyebrow="Ingesta"
        title="Carga multi-JSON"
        description="Persiste cualquier tipoDte parseable. CSV + Excel CRED: 03/05/06. Excel FACT: 01/07/otros. NC (05) resta; ND (06) suma."
        actions={
          <Button onClick={onUpload} disabled={pending}>
            {pending ? "Procesando…" : "Subir y validar"}
          </Button>
        }
      >
        <Input
          type="file"
          accept=".json,application/json"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="max-w-xl cursor-pointer rounded-lg border-brand-border bg-white/80 file:mr-3 file:rounded-md file:border-0 file:bg-brand-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-accent"
        />
        {uploadResults.length > 0 ? (
          <div className="mt-4 space-y-2 rounded-xl border border-brand-border bg-white/60 p-3">
            {uploadResults.map((r, i) => (
              <div
                key={`${r.filename}-${i}`}
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                <Badge
                  variant={
                    r.status === "saved"
                      ? "default"
                      : r.status === "informative"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {r.status}
                </Badge>
                <span className="font-medium">{r.filename}</span>
                <span className="text-brand-muted">{r.message}</span>
              </div>
            ))}
          </div>
        ) : null}
      </BrandPanel>

      <BrandPanel
        eyebrow="F-07"
        title="Clasificación"
        description="Nombres en pantalla; códigos numéricos en DB/CSV. Cascada Gravada según manual pág. 21. Defaults: Gravada / Gasto / Comercio / Gastos de Administración."
        actions={
          <Button
            variant="secondary"
            onClick={onApplyClassification}
            disabled={pending || periodExportable.length === 0}
          >
            Aplicar a {periodExportable.length} filas 03/05/06
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="bulk-q" label="Tipo de Operación">
            <ClassificationSelect
              id="bulk-q"
              value={bulk.tipoOperacion}
              options={optionsForTipoOperacion()}
              onChange={(code) => patchBulk({ tipoOperacion: code })}
              className="rounded-lg border-brand-border bg-white/80 shadow-sm"
            />
          </Field>
          <Field id="bulk-r" label="Clasificación">
            <ClassificationSelect
              id="bulk-r"
              value={bulk.clasificacion}
              options={optionsForClasificacion()}
              onChange={(code) => patchBulk({ clasificacion: code })}
              className="rounded-lg border-brand-border bg-white/80 shadow-sm"
            />
          </Field>
          <Field id="bulk-s" label="Sector">
            <ClassificationSelect
              id="bulk-s"
              value={bulk.sector}
              options={optionsForSector()}
              onChange={(code) => patchBulk({ sector: code })}
              className="rounded-lg border-brand-border bg-white/80 shadow-sm"
            />
          </Field>
          <Field id="bulk-t" label="Tipo de Costo/Gasto">
            <ClassificationSelect
              id="bulk-t"
              value={bulk.tipoCostoGasto}
              options={bulkTOptions}
              onChange={(code) => patchBulk({ tipoCostoGasto: code })}
              className="rounded-lg border-brand-border bg-white/80 shadow-sm"
            />
          </Field>
        </div>
      </BrandPanel>

      <BrandPanel
        eyebrow="Documentos"
        title="Documentos del periodo"
        description={`${exportable.length} exportables (03/05/06) · ${informative.length} informativos (01/07/otros) · orden por fecha`}
        actions={
          <>
            <Button
              onClick={onExportCsv}
              disabled={pending || periodExportable.length === 0}
            >
              Descargar CSV
            </Button>
            <Button
              variant="secondary"
              onClick={onExportCredExcel}
              disabled={pending || periodExportable.length === 0}
            >
              Excel CRED
            </Button>
            <Button
              variant="secondary"
              onClick={onExportFactExcel}
              disabled={
                pending ||
                periodDocs.filter((d) => !isExportDteType(d.tipo_dte)).length ===
                  0
              }
            >
              Excel FACT
            </Button>
          </>
        }
      >
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-brand-border bg-[linear-gradient(135deg,rgba(204,251,241,0.35),rgba(255,255,255,0.7))] p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Field id="filter-tipo" label="Tipo de documento">
            <select
              id="filter-tipo"
              className={`${selectClass} min-w-[8rem]`}
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              {tipoOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field id="date-from" label="Fecha desde">
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 min-w-[10rem] rounded-lg border-brand-border bg-white/80 shadow-sm"
            />
          </Field>
          <Field id="date-to" label="Fecha hasta">
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 min-w-[10rem] rounded-lg border-brand-border bg-white/80 shadow-sm"
            />
          </Field>
          <Field id="date-sort" label="Orden fecha">
            <select
              id="date-sort"
              className={`${selectClass} min-w-[9rem]`}
              value={dateSort}
              onChange={(e) => setDateSort(e.target.value as DateSort)}
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
              <option value="none">Sin orden</option>
            </select>
          </Field>
          <div className="flex items-end pb-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={!filtersActive}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-brand-border bg-white/75">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="bg-brand-table-head">Tipo</TableHead>
                <TableHead className="bg-brand-table-head">Fecha</TableHead>
                <TableHead className="bg-brand-table-head">Código</TableHead>
                <TableHead className="bg-brand-table-head">Proveedor</TableHead>
                <TableHead className="bg-brand-table-head text-right">
                  Gravada
                </TableHead>
                <TableHead className="bg-brand-table-head text-right">
                  IVA
                </TableHead>
                <TableHead className="bg-brand-table-head text-right">
                  Total
                </TableHead>
                <TableHead className="bg-brand-table-head text-right">
                  Exento
                </TableHead>
                <TableHead className="min-w-[9rem] bg-brand-table-head">
                  Tipo de Operación
                </TableHead>
                <TableHead className="min-w-[8rem] bg-brand-table-head">
                  Clasificación
                </TableHead>
                <TableHead className="min-w-[9rem] bg-brand-table-head">
                  Sector
                </TableHead>
                <TableHead className="min-w-[11rem] bg-brand-table-head">
                  Tipo de Costo/Gasto
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="py-10 text-center text-brand-muted"
                  >
                    Sin documentos para este periodo o filtro.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => {
                  const canEditQt = isExportDteType(d.tipo_dte);
                  const cls = classificationFromDoc(d);
                  const tOptions = optionsForTipoCostoGasto(
                    cls.tipoOperacion,
                    cls.clasificacion,
                    cls.sector,
                  );
                  return (
                    <TableRow key={d.id} className="border-brand-border/70">
                      <TableCell>
                        <Badge
                          variant={
                            isExportDteType(d.tipo_dte)
                              ? "default"
                              : "secondary"
                          }
                        >
                          {d.tipo_dte}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {d.fec_emi}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate font-mono text-xs">
                        {d.codigo_generacion}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {d.emisor_nombre}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(d.total_gravada)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(d.iva)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(d.total_con_iva)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(d.exento)}
                      </TableCell>
                      {canEditQt ? (
                        <>
                          <TableCell>
                            <ClassificationSelect
                              compact
                              value={cls.tipoOperacion}
                              options={optionsForTipoOperacion()}
                              disabled={pending}
                              onChange={(code) =>
                                onRowClassificationChange(d, {
                                  tipoOperacion: code,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <ClassificationSelect
                              compact
                              value={cls.clasificacion}
                              options={optionsForClasificacion()}
                              disabled={pending}
                              onChange={(code) =>
                                onRowClassificationChange(d, {
                                  clasificacion: code,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <ClassificationSelect
                              compact
                              value={cls.sector}
                              options={optionsForSector()}
                              disabled={pending}
                              onChange={(code) =>
                                onRowClassificationChange(d, { sector: code })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <ClassificationSelect
                              compact
                              value={cls.tipoCostoGasto}
                              options={tOptions}
                              disabled={pending}
                              onChange={(code) =>
                                onRowClassificationChange(d, {
                                  tipoCostoGasto: code,
                                })
                              }
                            />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="tabular-nums text-brand-muted">
                            {d.tipo_operacion ?? "—"}
                          </TableCell>
                          <TableCell className="tabular-nums text-brand-muted">
                            {d.clasificacion ?? "—"}
                          </TableCell>
                          <TableCell className="tabular-nums text-brand-muted">
                            {d.sector ?? "—"}
                          </TableCell>
                          <TableCell className="tabular-nums text-brand-muted">
                            {d.tipo_costo_gasto ?? "—"}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {filtered.length > 0 ? (
              <TableFooter>
                <TableRow className="border-t-2 border-brand-border bg-brand-table-head/80 hover:bg-brand-table-head/80">
                  <TableCell
                    colSpan={4}
                    className="font-semibold text-brand-ink"
                  >
                    Totales ({filtered.length} filas)
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {money(totals.gravada)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {money(totals.iva)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {money(totals.total)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {money(totals.exento)}
                  </TableCell>
                  <TableCell colSpan={4} />
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      </BrandPanel>
    </div>
  );
}
