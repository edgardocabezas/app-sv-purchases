import { createClient } from "@/lib/supabase/server";
import { ExportWorkspace } from "@/components/export/export-workspace";
import type { Company, DteDocument } from "@/types/database";

export default async function ExportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user!.id);

  const workspaceIds = memberships?.map((m) => m.workspace_id) ?? [];

  const { data: companies } =
    workspaceIds.length > 0
      ? await supabase
          .from("companies")
          .select("*")
          .in("workspace_id", workspaceIds)
          .order("name")
      : { data: [] as Company[] };

  const companyIds = (companies ?? []).map((c) => c.id);

  const { data: docs } =
    companyIds.length > 0
      ? await supabase
          .from("dte_documents")
          .select("*")
          .in("company_id", companyIds)
          .order("fec_emi", { ascending: true })
      : { data: [] as DteDocument[] };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
          Anexo Compras · F-07
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Carga y export
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
          Valida DTE JSON, clasifica Q–T con cascada F-07 (nombres en UI,
          códigos en CSV) y descarga Anexo + Excel CRED/FACT.
        </p>
      </header>
      <ExportWorkspace
        companies={(companies ?? []) as Company[]}
        initialDocs={(docs ?? []) as DteDocument[]}
      />
    </div>
  );
}
