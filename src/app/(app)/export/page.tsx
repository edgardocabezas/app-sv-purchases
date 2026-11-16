import { createClient } from "@/lib/supabase/server";
import { ExportWorkspace } from "@/components/export/export-workspace";
import { PageHeader } from "@/components/page-header";
import { ensureDefaultWorkspace } from "@/lib/workspace/ensure";
import type { Company, DteDocument } from "@/types/database";

export default async function ExportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await ensureDefaultWorkspace();

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
      <PageHeader
        eyebrow="Anexo Compras · F-07"
        title="Carga y export"
        description="Valida DTE JSON, configura clasificación con cascada F-07 (nombres en UI, códigos en CSV) y descarga Anexo + Excel CRED/FACT."
      />
      <ExportWorkspace
        companies={(companies ?? []) as Company[]}
        initialDocs={(docs ?? []) as DteDocument[]}
      />
    </div>
  );
}
