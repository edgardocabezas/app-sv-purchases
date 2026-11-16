"use client";

import { useMemo, useState, useTransition } from "react";
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
  CLASIFICACION_OPTIONS,
  SECTOR_OPTIONS,
  TIPO_COSTO_GASTO_OPTIONS,
  TIPO_OPERACION_OPTIONS,
} from "@/lib/dte/classification-options";
import { ClassificationSelect } from "@/components/export/classification-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
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

export function ExportWorkspace({
  companies,
  initialDocs,
}: {
  companies: Company[];
  initialDocs: DteDocument[];
}) {
  const now = new Date();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [docs, setDocs] = useState(initialDocs);
  const [pending, startTransition] = useTransition();

  const [bulkQ, setBulkQ] = useState(DEFAULT_CLASSIFICATION.tipoOperacion);
  const [bulkR, setBulkR] = useState(DEFAULT_CLASSIFICATION.clasificacion);
  const [bulkS, setBulkS] = useState(DEFAULT_CLASSIFICATION.sector);
  const [bulkT, setBulkT] = useState(DEFAULT_CLASSIFICATION.tipoCostoGasto);

  const filtered = useMemo(
    () =>
      docs.filter(
        (d) =>
          d.company_id === companyId &&
          d.period_year === year &&
          d.period_month === month,
      ),
    [docs, companyId, year, month],
  );

  const exportable = filtered.filter((d) => isExportDteType(d.tipo_dte));
  const informative = filtered.filter((d) => !isExportDteType(d.tipo_dte));
  const qtZeroPeriod = year < 2024 || (year === 2024 && month < 2);

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
    if (qtZeroPeriod) {
      setError(
        "Para periodos anteriores a 2024-02, Q–T se exportan como 0 (manual F-07).",
      );
      return;
    }
    const classification: ExportClassification = {
      tipoOperacion: bulkQ,
      clasificacion: bulkR,
      sector: bulkS,
      tipoCostoGasto: bulkT,
    };
    const ids = exportable.map((d) => d.id);
    startTransition(async () => {
      const result = await bulkUpdateClassification(ids, classification);
      if (result.error) {
        setError(result.error);
        return;
      }
      setInfo(
        `Clasificación Q–T aplicada a ${result.updated ?? ids.length} documentos.`,
      );
      setDocs(
        docs.map((d) =>
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
    if (!isExportDteType(doc.tipo_dte) || qtZeroPeriod) return;
    const next: ExportClassification = {
      ...classificationFromDoc(doc),
      ...patch,
    };
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
      setInfo(`Q–T actualizado para ${doc.codigo_generacion.slice(0, 8)}…`);
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
          Crea un workspace y una empresa antes de cargar DTE.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {info ? (
        <Alert>
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Periodo y empresa</CardTitle>
          <CardDescription>
            Ventana: periodo seleccionado + 2 meses anteriores (3 periodos;
            diff 0..2). Fuera de ventana no se guarda (exportables ni
            informativos).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="company">Empresa</Label>
            <select
              id="company"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Año</Label>
            <Input
              id="year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="month">Mes</Label>
            <Input
              id="month"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Carga multi-JSON</CardTitle>
          <CardDescription>
            Persiste cualquier tipoDte parseable (01/03/05/06/07 y otros). CSV +
            Excel CRED: 03/05/06. Excel FACT: 01/07/otros. Duplicados por código
            de generación. NC (05) resta; ND (06) suma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept=".json,application/json"
            multiple
            onChange={(e) => setFiles(e.target.files)}
          />
          <Button onClick={onUpload} disabled={pending}>
            {pending ? "Procesando…" : "Subir y validar"}
          </Button>
          {uploadResults.length > 0 ? (
            <div className="space-y-2">
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
                  <span className="text-muted-foreground">{r.message}</span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración Q / R / S / T (tipos 03/05/06)</CardTitle>
          <CardDescription>
            Catálogo F-07 V14 (código + nombre). Defaults Licuadora: Q=1, R=2,
            S=2, T=2. U siempre = 3. Periodos &lt; febrero 2024 exportan Q–T como
            0.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qtZeroPeriod ? (
            <Alert>
              <AlertDescription>
                Periodo anterior a febrero 2024: al exportar, Q–T serán 0
                automáticamente. La asignación masiva/individual está
                deshabilitada.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-q">Q Tipo de Operación</Label>
              <ClassificationSelect
                id="bulk-q"
                value={bulkQ}
                options={TIPO_OPERACION_OPTIONS}
                onChange={setBulkQ}
                disabled={qtZeroPeriod}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-r">R Clasificación</Label>
              <ClassificationSelect
                id="bulk-r"
                value={bulkR}
                options={CLASIFICACION_OPTIONS}
                onChange={setBulkR}
                disabled={qtZeroPeriod}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-s">S Sector</Label>
              <ClassificationSelect
                id="bulk-s"
                value={bulkS}
                options={SECTOR_OPTIONS}
                onChange={setBulkS}
                disabled={qtZeroPeriod}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-t">T Tipo de Costo/Gasto</Label>
              <ClassificationSelect
                id="bulk-t"
                value={bulkT}
                options={TIPO_COSTO_GASTO_OPTIONS}
                onChange={setBulkT}
                disabled={qtZeroPeriod}
              />
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={onApplyClassification}
            disabled={pending || exportable.length === 0 || qtZeroPeriod}
          >
            Aplicar a {exportable.length} filas 03/05/06
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle>Documentos del periodo</CardTitle>
            <CardDescription>
              {exportable.length} exportables (03/05/06) ·{" "}
              {informative.length} informativos (01/07/otros)
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onExportCsv}
              disabled={pending || exportable.length === 0}
            >
              Descargar CSV
            </Button>
            <Button
              variant="secondary"
              onClick={onExportCredExcel}
              disabled={pending || exportable.length === 0}
            >
              Excel CRED (03/05/06)
            </Button>
            <Button
              variant="secondary"
              onClick={onExportFactExcel}
              disabled={pending || informative.length === 0}
            >
              Excel FACT (01/otros)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Gravada</TableHead>
                <TableHead>IVA</TableHead>
                <TableHead>Q</TableHead>
                <TableHead>R</TableHead>
                <TableHead>S</TableHead>
                <TableHead>T</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground">
                    Sin documentos para este periodo.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => {
                  const canEditQt =
                    isExportDteType(d.tipo_dte) && !qtZeroPeriod;
                  const cls = classificationFromDoc(d);
                  return (
                    <TableRow key={d.id}>
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
                      <TableCell>{d.fec_emi}</TableCell>
                      <TableCell className="max-w-[140px] truncate font-mono text-xs">
                        {d.codigo_generacion}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {d.emisor_nombre}
                      </TableCell>
                      <TableCell>
                        {Number(d.total_gravada).toFixed(2)}
                      </TableCell>
                      <TableCell>{Number(d.iva).toFixed(2)}</TableCell>
                      {canEditQt ? (
                        <>
                          <TableCell>
                            <ClassificationSelect
                              compact
                              value={cls.tipoOperacion}
                              options={TIPO_OPERACION_OPTIONS}
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
                              options={CLASIFICACION_OPTIONS}
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
                              options={SECTOR_OPTIONS}
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
                              options={TIPO_COSTO_GASTO_OPTIONS}
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
                          <TableCell>{d.tipo_operacion ?? "—"}</TableCell>
                          <TableCell>{d.clasificacion ?? "—"}</TableCell>
                          <TableCell>{d.sector ?? "—"}</TableCell>
                          <TableCell>{d.tipo_costo_gasto ?? "—"}</TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
