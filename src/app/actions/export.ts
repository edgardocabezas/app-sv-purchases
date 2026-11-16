"use server";

import { createClient } from "@/lib/supabase/server";
import { buildAnexoComprasCsv, buildAnexoComprasFilename } from "@/lib/csv/build";
import { buildAnexoComprasRow } from "@/lib/csv/row";
import {
  DEFAULT_CLASSIFICATION,
  EXPORT_DTE_TYPES,
  isExportDteType,
} from "@/lib/dte/types";
import {
  buildCredControlWorkbook,
  buildFactControlWorkbook,
  extractTotalPagar,
} from "@/lib/excel";

export type ExportCsvResult =
  | { ok: true; filename: string; csv: string; rowCount: number }
  | { ok: false; error: string };

export type ExportExcelResult =
  | { ok: true; filename: string; base64: string; rowCount: number }
  | { ok: false; error: string };

/** @deprecated Use ExportCsvResult */
export type ExportActionResult = ExportCsvResult;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

export async function exportAnexoComprasCsv(input: {
  companyId: string;
  year: number;
  month: number;
}): Promise<ExportCsvResult> {
  const { companyId, year, month } = input;
  if (!companyId) return { ok: false, error: "Empresa requerida." };
  if (!year || month < 1 || month > 12) {
    return { ok: false, error: "Periodo inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dte_documents")
    .select("*")
    .eq("company_id", companyId)
    .in("tipo_dte", [...EXPORT_DTE_TYPES])
    .eq("period_year", year)
    .eq("period_month", month)
    .order("fec_emi", { ascending: true });

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "No hay documentos tipo 03/05/06 para este periodo.",
    };
  }

  try {
    const rows = data.map((doc) =>
      buildAnexoComprasRow({
        fecEmi: doc.fec_emi,
        codigoGeneracion: doc.codigo_generacion,
        emisorNit: doc.emisor_nit ?? "",
        emisorNrc: doc.emisor_nrc ?? "",
        emisorNombre: doc.emisor_nombre ?? "",
        totalGravada: Number(doc.total_gravada),
        iva: Number(doc.iva),
        totalConIva: Number(doc.total_con_iva),
        periodYear: year,
        periodMonth: month,
        tipoDocumento: doc.tipo_dte,
        classification: {
          tipoOperacion: doc.tipo_operacion ?? DEFAULT_CLASSIFICATION.tipoOperacion,
          clasificacion: doc.clasificacion ?? DEFAULT_CLASSIFICATION.clasificacion,
          sector: doc.sector ?? DEFAULT_CLASSIFICATION.sector,
          tipoCostoGasto:
            doc.tipo_costo_gasto ?? DEFAULT_CLASSIFICATION.tipoCostoGasto,
        },
      }),
    );

    const csv = buildAnexoComprasCsv(rows);
    const filename = buildAnexoComprasFilename(year, month);

    const ids = data.map((d) => d.id);
    await supabase
      .from("dte_documents")
      .update({ exported_at: new Date().toISOString() })
      .in("id", ids);

    return { ok: true, filename, csv, rowCount: rows.length };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al construir CSV",
    };
  }
}

/** Excel A — Anexo / créditos control (tipos 03, 05, 06). */
export async function exportCredControlExcel(input: {
  companyId: string;
  year: number;
  month: number;
}): Promise<ExportExcelResult> {
  const { companyId, year, month } = input;
  if (!companyId) return { ok: false, error: "Empresa requerida." };
  if (!year || month < 1 || month > 12) {
    return { ok: false, error: "Periodo inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dte_documents")
    .select("*")
    .eq("company_id", companyId)
    .in("tipo_dte", [...EXPORT_DTE_TYPES])
    .eq("period_year", year)
    .eq("period_month", month)
    .order("fec_emi", { ascending: true });

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "No hay documentos tipo 03/05/06 para Excel CRED.",
    };
  }

  try {
    const built = await buildCredControlWorkbook(
      data.map((doc) => ({
        fecEmi: doc.fec_emi,
        tipoDte: doc.tipo_dte,
        codigoGeneracion: doc.codigo_generacion,
        emisorNit: doc.emisor_nit ?? "",
        emisorNrc: doc.emisor_nrc ?? "",
        emisorNombre: doc.emisor_nombre ?? "",
        totalGravada: Number(doc.total_gravada),
        iva: Number(doc.iva),
        totalConIva: Number(doc.total_con_iva),
        exento: Number(doc.exento),
        classification: {
          tipoOperacion:
            doc.tipo_operacion ?? DEFAULT_CLASSIFICATION.tipoOperacion,
          clasificacion:
            doc.clasificacion ?? DEFAULT_CLASSIFICATION.clasificacion,
          sector: doc.sector ?? DEFAULT_CLASSIFICATION.sector,
          tipoCostoGasto:
            doc.tipo_costo_gasto ?? DEFAULT_CLASSIFICATION.tipoCostoGasto,
        },
      })),
      year,
      month,
    );

    return {
      ok: true,
      filename: built.filename,
      base64: arrayBufferToBase64(built.buffer),
      rowCount: built.rowCount,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al construir Excel CRED",
    };
  }
}

/** Excel B — Facturas / otros (01 + non-03/05/06 including 07 and unexpected). */
export async function exportFactControlExcel(input: {
  companyId: string;
  year: number;
  month: number;
}): Promise<ExportExcelResult> {
  const { companyId, year, month } = input;
  if (!companyId) return { ok: false, error: "Empresa requerida." };
  if (!year || month < 1 || month > 12) {
    return { ok: false, error: "Periodo inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dte_documents")
    .select("*")
    .eq("company_id", companyId)
    .eq("period_year", year)
    .eq("period_month", month)
    .order("fec_emi", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const factDocs = (data ?? []).filter((doc) => !isExportDteType(doc.tipo_dte));
  if (factDocs.length === 0) {
    return {
      ok: false,
      error: "No hay documentos 01/07/otros para Excel FACT.",
    };
  }

  try {
    const built = await buildFactControlWorkbook(
      factDocs.map((doc) => ({
        fecEmi: doc.fec_emi,
        tipoDte: doc.tipo_dte,
        codigoGeneracion: doc.codigo_generacion,
        emisorNit: doc.emisor_nit ?? "",
        emisorNrc: doc.emisor_nrc ?? "",
        emisorNombre: doc.emisor_nombre ?? "",
        totalPagar: extractTotalPagar(
          doc.raw_json as Record<string, unknown> | null,
        ),
        totalGravada: Number(doc.total_gravada),
        iva: Number(doc.iva),
        totalConIva: Number(doc.total_con_iva),
        sourceFilename: doc.source_filename,
      })),
      year,
      month,
    );

    return {
      ok: true,
      filename: built.filename,
      base64: arrayBufferToBase64(built.buffer),
      rowCount: built.rowCount,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al construir Excel FACT",
    };
  }
}
