import { createClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/workspace/ensure";
import { pickPrimaryWorkspace } from "@/lib/workspace/primary";
import { CreateCompanyForm } from "@/components/workspace/create-company-form";
import { PageHeader } from "@/components/page-header";
import { BrandPanel } from "@/components/brand-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkspaceRole } from "@/types/database";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await ensureDefaultWorkspace();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspace_id, workspaces(id, name, created_at)")
    .eq("user_id", user!.id);

  const membershipViews =
    memberships?.map((m) => {
      const w = Array.isArray(m.workspaces) ? m.workspaces[0] : m.workspaces;
      return {
        role: m.role as WorkspaceRole,
        workspace: w as { id: string; name: string; created_at: string } | null,
      };
    }) ?? [];

  const primary = pickPrimaryWorkspace(membershipViews);
  const workspaces = membershipViews
    .map((m) => m.workspace)
    .filter((w): w is { id: string; name: string; created_at: string } =>
      Boolean(w?.id),
    )
    // Prefer primary first for the company form default.
    .sort((a, b) => {
      if (primary && a.id === primary.id) return -1;
      if (primary && b.id === primary.id) return 1;
      return a.created_at.localeCompare(b.created_at);
    })
    .map(({ id, name }) => ({ id, name }));

  const workspaceIds = workspaces.map((w) => w.id);
  const workspaceName = new Map(workspaces.map((w) => [w.id, w.name]));

  const { data: companies } =
    workspaceIds.length > 0
      ? await supabase
          .from("companies")
          .select("*")
          .in("workspace_id", workspaceIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catálogo"
        title="Empresas"
        description="Cada empresa aísla sus DTE bajo tu espacio (RLS por membresía)."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BrandPanel
          eyebrow="Alta"
          title="Nueva empresa"
          description="NIT/NRC son metadatos de la empresa compradora (opcional en MVP)."
        >
          <CreateCompanyForm
            workspaces={workspaces}
            hideWorkspaceSelect={workspaces.length <= 1}
          />
        </BrandPanel>

        <BrandPanel eyebrow="Inventario" title="Listado">
          <div className="overflow-x-auto rounded-xl border border-brand-border bg-white/75">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-brand-table-head">Nombre</TableHead>
                  {workspaces.length > 1 ? (
                    <TableHead className="bg-brand-table-head">Espacio</TableHead>
                  ) : null}
                  <TableHead className="bg-brand-table-head">NIT</TableHead>
                  <TableHead className="bg-brand-table-head">NRC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!companies || companies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={workspaces.length > 1 ? 4 : 3}
                      className="py-10 text-center text-brand-muted"
                    >
                      Sin empresas todavía. Crea la primera para empezar a
                      cargar DTE.
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((c) => (
                    <TableRow key={c.id} className="border-brand-border/70">
                      <TableCell className="font-medium text-brand-ink">
                        {c.name}
                      </TableCell>
                      {workspaces.length > 1 ? (
                        <TableCell>
                          {workspaceName.get(c.workspace_id) ?? c.workspace_id}
                        </TableCell>
                      ) : null}
                      <TableCell className="tabular-nums">
                        {c.nit ?? "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {c.nrc ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </BrandPanel>
      </div>
    </div>
  );
}
