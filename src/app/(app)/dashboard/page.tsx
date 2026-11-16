import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspace_id, workspaces(id, name, created_at)")
    .eq("user_id", user!.id);

  const workspaces =
    memberships?.map((m) => {
      const w = Array.isArray(m.workspaces) ? m.workspaces[0] : m.workspaces;
      return {
        id: (w as { id: string; name: string; created_at: string } | null)?.id,
        name: (w as { id: string; name: string; created_at: string } | null)?.name,
        role: m.role as string,
      };
    }).filter((w) => w.id && w.name) ?? [];

  const workspaceIds = workspaces.map((w) => w.id!) ;
  const { data: companies } =
    workspaceIds.length > 0
      ? await supabase
          .from("companies")
          .select("id, name, workspace_id")
          .in("workspace_id", workspaceIds)
      : { data: [] as { id: string; name: string; workspace_id: string }[] };

  const { count: dteCount } = await supabase
    .from("dte_documents")
    .select("id", { count: "exact", head: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Workspaces → empresas → carga DTE → export CSV F-07.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspaces</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {workspaces.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Empresas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {companies?.length ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DTEs</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {dteCount ?? 0}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tus workspaces</CardTitle>
            <CardDescription>Cuenta madre multi-empresa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no tienes workspaces.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {workspaces.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span>{w.name}</span>
                    <span className="text-muted-foreground">{w.role}</span>
                  </li>
                ))}
              </ul>
            )}
            <CreateWorkspaceForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Siguiente paso</CardTitle>
            <CardDescription>
              Administra empresas y genera el anexo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button render={<Link href="/companies" />}>Empresas</Button>
            <Button variant="outline" render={<Link href="/export" />}>
              Carga / Export
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
