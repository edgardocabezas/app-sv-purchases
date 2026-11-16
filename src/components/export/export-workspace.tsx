"use client";

import { useMemo, useState, useTransition } from "react";
import { uploadDteFiles, bulkUpdateClassification } from "@/app/actions/documents";
import { exportAnexoComprasCsv } from "@/app/actions/export";
import type { Company, DteDocument } from "@/types/database";
import { DEFAULT_CLASSIFICATION, type ExportClassification } from "@/lib/dte/types";
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

  const tipo03 = filtered.filter((d) => d.tipo_dte === "03");
  const informative = filtered.filter((d) => d.tipo_dte !== "03");
  const qtZeroPeriod = year < 2024 || (year === 2024 && month < 2);

  function refreshFromServerDocs(next: DteDocument[]) {
    setDocs(next);
  }

  async function reloadDocs() {
    // Soft reload via full page navigation keeps RLS path simple for MVP.
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
    const ids = tipo03.map((d) => d.id);
    startTransition(async () => {
      const result = await bulkUpdateClassification(ids, classification);
      if (result.error) {
        setError(result.error);
        return;
      }
      setInfo(`Clasificación Q–T aplicada a ${result.updated ?? ids.length} documentos.`);
      refreshFromServerDocs(
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

  function onExport() {
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
            Ventana de fechas: mes objetivo + 2 meses anteriores (Licuadora).
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
            Detecta duplicados por código de generación (por empresa). Tipos
            01/05/06/07 se guardan como informativos; solo 03 entra al CSV.
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
          <CardTitle>Configuración Q / R / S / T (tipo 03)</CardTitle>
          <CardDescription>
            Defaults Licuadora: Q=1, R=2, S=2, T=2. U siempre = 3. Periodos
            &lt; 2024-02 exportan Q–T como 0.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qtZeroPeriod ? (
            <Alert>
              <AlertDescription>
                Periodo anterior a febrero 2024: al exportar, Q–T serán 0
                automáticamente.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Q Tipo operación</Label>
              <Input value={bulkQ} onChange={(e) => setBulkQ(e.target.value)} maxLength={1} />
            </div>
            <div className="space-y-2">
              <Label>R Clasificación</Label>
              <Input value={bulkR} onChange={(e) => setBulkR(e.target.value)} maxLength={1} />
            </div>
            <div className="space-y-2">
              <Label>S Sector</Label>
              <Input value={bulkS} onChange={(e) => setBulkS(e.target.value)} maxLength={1} />
            </div>
            <div className="space-y-2">
              <Label>T Tipo costo/gasto</Label>
              <Input value={bulkT} onChange={(e) => setBulkT(e.target.value)} maxLength={1} />
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={onApplyClassification}
            disabled={pending || tipo03.length === 0 || qtZeroPeriod}
          >
            Aplicar a {tipo03.length} filas tipo 03
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Documentos del periodo</CardTitle>
            <CardDescription>
              {tipo03.length} exportables (03) · {informative.length} informativos
            </CardDescription>
          </div>
          <Button onClick={onExport} disabled={pending || tipo03.length === 0}>
            Descargar CSV
          </Button>
        </CardHeader>
        <CardContent>
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
                filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge variant={d.tipo_dte === "03" ? "default" : "secondary"}>
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
                    <TableCell>{Number(d.total_gravada).toFixed(2)}</TableCell>
                    <TableCell>{Number(d.iva).toFixed(2)}</TableCell>
                    <TableCell>{d.tipo_operacion ?? "—"}</TableCell>
                    <TableCell>{d.clasificacion ?? "—"}</TableCell>
                    <TableCell>{d.sector ?? "—"}</TableCell>
                    <TableCell>{d.tipo_costo_gasto ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
