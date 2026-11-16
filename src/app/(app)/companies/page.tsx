import { createClient } from "@/lib/supabase/server";
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

export default async function CompaniesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(id, name)")
    .eq("user_id", user!.id);

  const workspaces =
    memberships
      ?.map((m) => {
        const w = Array.isArray(m.workspaces) ? m.workspaces[0] : m.workspaces;
        return w as { id: string; name: string } | null;
      })
      .filter((w): w is { id: string; name: string } => Boolean(w?.id)) ?? [];

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
          Cada empresa aísla sus DTE bajo el workspace (RLS por membresía).
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
            <CreateCompanyForm workspaces={workspaces} />
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
                  <TableHead>Workspace</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>NRC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!companies || companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Sin empresas todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>
                        {workspaceName.get(c.workspace_id) ?? c.workspace_id}
                      </TableCell>
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
