import { createClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/workspace/ensure";
import { pickPrimaryWorkspace } from "@/lib/workspace/primary";
import { CreateCompanyForm } from "@/components/workspace/create-company-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
        <p className="text-muted-foreground">
          Cada empresa aísla sus DTE bajo tu espacio (RLS por membresía).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nueva empresa</CardTitle>
            <CardDescription>
              NIT/NRC son metadatos de la empresa compradora (opcional en MVP).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateCompanyForm
              workspaces={workspaces}
              hideWorkspaceSelect={workspaces.length <= 1}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  {workspaces.length > 1 ? (
                    <TableHead>Espacio</TableHead>
                  ) : null}
                  <TableHead>NIT</TableHead>
                  <TableHead>NRC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!companies || companies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={workspaces.length > 1 ? 4 : 3}
                      className="text-muted-foreground"
                    >
                      Sin empresas todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      {workspaces.length > 1 ? (
                        <TableCell>
                          {workspaceName.get(c.workspace_id) ?? c.workspace_id}
                        </TableCell>
                      ) : null}
                      <TableCell>{c.nit ?? "—"}</TableCell>
                      <TableCell>{c.nrc ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
