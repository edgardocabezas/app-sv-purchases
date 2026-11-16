"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDteJson } from "@/lib/dte/parse";
import { isInProcessingWindow } from "@/lib/dte/window";
import { stripDashes } from "@/lib/csv/format";
import type { ExportClassification } from "@/lib/dte/types";
import { DEFAULT_CLASSIFICATION } from "@/lib/dte/types";

export type UploadResultItem = {
  filename: string;
  status: "saved" | "duplicate" | "out_of_window" | "error" | "informative";
  message: string;
  tipoDte?: string;
  codigoGeneracion?: string;
};

export type UploadActionState = {
  error?: string;
  results?: UploadResultItem[];
};

export async function uploadDteFiles(
  _prev: UploadActionState,
  formData: FormData,
): Promise<UploadActionState> {
  const companyId = String(formData.get("company_id") ?? "").trim();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (!companyId) return { error: "Selecciona una empresa." };
  if (!year || !month || month < 1 || month > 12) {
    return { error: "Año/mes inválidos." };
  }
  if (files.length === 0) return { error: "Selecciona al menos un JSON." };

  const supabase = await createClient();
  const results: UploadResultItem[] = [];

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".json")) {
      results.push({
        filename: file.name,
        status: "error",
        message: "Solo se aceptan archivos .json",
      });
      continue;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseDteJson(bytes);

    if (!parsed.ok) {
      results.push({
        filename: file.name,
        status: "error",
        message: parsed.error,
      });
      continue;
    }

    const dte = parsed.data;
    const codigo = stripDashes(dte.codigoGeneracion);

    if (!isInProcessingWindow(dte.fecEmi, year, month, 2)) {
      results.push({
        filename: file.name,
        status: "out_of_window",
        message: `Fuera de ventana (fecEmi=${dte.fecEmi}, periodo=${year}-${String(month).padStart(2, "0")})`,
        tipoDte: dte.tipoDte,
        codigoGeneracion: codigo,
      });
      continue;
    }

    const { data: existing } = await supabase
      .from("dte_documents")
      .select("id")
      .eq("company_id", companyId)
      .eq("codigo_generacion", codigo)
      .maybeSingle();

    if (existing) {
      results.push({
        filename: file.name,
        status: "duplicate",
        message: "Ya existe en la base de datos (mismo código de generación).",
        tipoDte: dte.tipoDte,
        codigoGeneracion: codigo,
      });
      continue;
    }

    const isExportable = dte.tipoDte === "03";
    const classification = DEFAULT_CLASSIFICATION;

    const { error } = await supabase.from("dte_documents").insert({
      company_id: companyId,
      tipo_dte: dte.tipoDte,
      codigo_generacion: codigo,
      fec_emi: dte.fecEmi,
      emisor_nit: stripDashes(dte.emisorNit) || null,
      emisor_nrc: stripDashes(dte.emisorNrc) || null,
      emisor_nombre: dte.emisorNombre || null,
      total_gravada: dte.totalGravada,
      iva: dte.iva,
      fovial: dte.fovial,
      cotrans: dte.cotrans,
      total_con_iva: dte.totalConIva,
      exento: dte.exento,
      raw_json: dte.raw,
      source_filename: file.name,
      tipo_operacion: isExportable ? classification.tipoOperacion : null,
      clasificacion: isExportable ? classification.clasificacion : null,
      sector: isExportable ? classification.sector : null,
      tipo_costo_gasto: isExportable ? classification.tipoCostoGasto : null,
      period_year: year,
      period_month: month,
    });

    if (error) {
      if (error.code === "23505") {
        results.push({
          filename: file.name,
          status: "duplicate",
          message: "Duplicado (unique company + codigo_generacion).",
          tipoDte: dte.tipoDte,
          codigoGeneracion: codigo,
        });
      } else {
        results.push({
          filename: file.name,
          status: "error",
          message: error.message,
          tipoDte: dte.tipoDte,
          codigoGeneracion: codigo,
        });
      }
      continue;
    }

    results.push({
      filename: file.name,
      status: dte.tipoDte === "03" ? "saved" : "informative",
      message:
        dte.tipoDte === "03"
          ? "Guardado (incluible en CSV)."
          : `Guardado como informativo (tipo ${dte.tipoDte}; no va al CSV).`,
      tipoDte: dte.tipoDte,
      codigoGeneracion: codigo,
    });
  }

  revalidatePath("/export");
  revalidatePath("/dashboard");
  return { results };
}

export async function updateDocumentClassification(
  documentId: string,
  classification: ExportClassification,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("dte_documents")
    .update({
      tipo_operacion: classification.tipoOperacion,
      clasificacion: classification.clasificacion,
      sector: classification.sector,
      tipo_costo_gasto: classification.tipoCostoGasto,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("tipo_dte", "03");

  if (error) return { error: error.message };
  revalidatePath("/export");
  return {};
}

export async function bulkUpdateClassification(
  documentIds: string[],
  classification: ExportClassification,
): Promise<{ error?: string; updated?: number }> {
  if (documentIds.length === 0) return { updated: 0 };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("dte_documents")
    .update(
      {
        tipo_operacion: classification.tipoOperacion,
        clasificacion: classification.clasificacion,
        sector: classification.sector,
        tipo_costo_gasto: classification.tipoCostoGasto,
        updated_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .in("id", documentIds)
    .eq("tipo_dte", "03");

  if (error) return { error: error.message };
  revalidatePath("/export");
  return { updated: count ?? documentIds.length };
}
