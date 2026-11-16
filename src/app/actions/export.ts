"use server";

import { createClient } from "@/lib/supabase/server";
import { buildAnexoComprasCsv, buildAnexoComprasFilename } from "@/lib/csv/build";
import { buildAnexoComprasRow } from "@/lib/csv/row";
import { DEFAULT_CLASSIFICATION } from "@/lib/dte/types";

export type ExportActionResult =
  | { ok: true; filename: string; csv: string; rowCount: number }
  | { ok: false; error: string };

export async function exportAnexoComprasCsv(input: {
  companyId: string;
  year: number;
  month: number;
}): Promise<ExportActionResult> {
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
    .eq("tipo_dte", "03")
    .eq("period_year", year)
    .eq("period_month", month)
    .order("fec_emi", { ascending: true });

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "No hay documentos tipo 03 para este periodo." };
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
