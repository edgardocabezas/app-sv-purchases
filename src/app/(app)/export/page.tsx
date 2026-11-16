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
          .order("fec_emi", { ascending: false })
      : { data: [] as DteDocument[] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Carga y export CSV
        </h1>
        <p className="text-muted-foreground">
          Valida DTE JSON, configura Q–T para tipos 03/05/06 y descarga el
          Anexo de Compras.
        </p>
      </div>
      <ExportWorkspace
        companies={(companies ?? []) as Company[]}
        initialDocs={(docs ?? []) as DteDocument[]}
      />
    </div>
  );
}
