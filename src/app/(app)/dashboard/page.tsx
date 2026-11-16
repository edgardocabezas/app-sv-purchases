import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/workspace/ensure";
import { pickPrimaryWorkspace } from "@/lib/workspace/primary";
import { InviteMemberForm } from "@/components/workspace/invite-member-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WorkspaceInvite, WorkspaceRole } from "@/types/database";

export default async function DashboardPage() {
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
  const primaryRole =
    membershipViews.find((m) => m.workspace?.id === primary?.id)?.role ?? null;
  const canInvite = primaryRole === "owner" || primaryRole === "admin";

  const workspaceIds = membershipViews
    .map((m) => m.workspace?.id)
    .filter((id): id is string => Boolean(id));

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

  const { data: pendingInvites } =
    canInvite && primary
      ? await supabase
          .from("workspace_invites")
          .select("id, email, role, token, accepted_at, created_at")
          .eq("workspace_id", primary.id)
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
      : { data: [] as Pick<
          WorkspaceInvite,
          "id" | "email" | "role" | "token" | "accepted_at" | "created_at"
        >[] };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Un espacio por usuario → empresas → carga DTE → export CSV F-07.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Espacio</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {primary?.name ?? "—"}
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
            <CardTitle>Tu espacio</CardTitle>
            <CardDescription>
              Se crea automáticamente al registrarte. Las empresas viven aquí;
              invita colegas por email en lugar de crear espacios paralelos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {primary ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">{primary.name}</span>
                <span className="text-muted-foreground">{primaryRole}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Preparando tu espacio…
              </p>
            )}
            {membershipViews.length > 1 ? (
              <p className="text-xs text-muted-foreground">
                Tienes acceso a {membershipViews.length} espacios (legado o
                invitaciones). El principal es el más antiguo que posees.
              </p>
            ) : null}
            {canInvite && primary ? (
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-medium">Invitar al equipo</h3>
                <InviteMemberForm workspaceId={primary.id} />
                {pendingInvites && pendingInvites.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {pendingInvites.map((inv) => (
                      <li
                        key={inv.id}
                        className="rounded-md border px-3 py-2 text-muted-foreground"
                      >
                        <div className="flex justify-between gap-2">
                          <span>
                            {inv.email} · {inv.role}
                          </span>
                        </div>
                        <code className="mt-1 block truncate text-xs">
                          /invite/{inv.token}
                        </code>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Accedes como miembro invitado. Pide a un admin que gestione
                empresas e invitaciones.
              </p>
            )}
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
