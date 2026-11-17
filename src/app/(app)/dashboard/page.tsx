import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/workspace/ensure";
import { pickPrimaryWorkspace } from "@/lib/workspace/primary";
import { InviteMemberForm } from "@/components/workspace/invite-member-form";
import { PageHeader } from "@/components/page-header";
import { BrandPanel } from "@/components/brand-panel";
import { ComprasTotalsReport } from "@/components/dashboard/compras-totals-report";
import { Button } from "@/components/ui/button";
import type { ComprasReportDoc } from "@/lib/dashboard/compras-report";
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

  const companyIds = (companies ?? []).map((c) => c.id);

  const { count: dteCount } = await supabase
    .from("dte_documents")
    .select("id", { count: "exact", head: true });

  const { data: reportRows } =
    companyIds.length > 0
      ? await supabase
          .from("dte_documents")
          .select(
            "tipo_dte, fec_emi, period_year, period_month, total_gravada, iva, total_con_iva",
          )
          .in("company_id", companyIds)
          .order("fec_emi", { ascending: true })
      : {
          data: [] as Array<{
            tipo_dte: string;
            fec_emi: string;
            period_year: number | null;
            period_month: number | null;
            total_gravada: number;
            iva: number;
            total_con_iva: number;
          }>,
        };

  const reportDocs: ComprasReportDoc[] = (reportRows ?? []).map((row) => ({
    tipo_dte: row.tipo_dte,
    fec_emi: row.fec_emi,
    period_year: row.period_year,
    period_month: row.period_month,
    total_gravada: Number(row.total_gravada) || 0,
    iva: Number(row.iva) || 0,
    total_con_iva: Number(row.total_con_iva) || 0,
  }));

  const reportYear = new Date().getFullYear();

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
      <PageHeader
        eyebrow="Espacio de trabajo"
        title="Dashboard"
        description="Un espacio por usuario → empresas → carga DTE → export CSV F-07."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Espacio", value: primary?.name ?? "—" },
          { label: "Empresas", value: String(companies?.length ?? 0) },
          { label: "DTEs", value: String(dteCount ?? 0) },
        ].map((stat) => (
          <div key={stat.label} className="brand-panel px-5 py-4">
            <p className="brand-field-label">{stat.label}</p>
            <p className="mt-2 font-heading text-2xl font-semibold tracking-tight text-brand-ink">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <ComprasTotalsReport docs={reportDocs} initialYear={reportYear} />

      <div className="grid gap-6 lg:grid-cols-2">
        <BrandPanel
          eyebrow="Equipo"
          title="Tu espacio"
          description="Se crea automáticamente al registrarte. Las empresas viven aquí; invita colegas por email en lugar de crear espacios paralelos."
        >
          <div className="space-y-4">
            {primary ? (
              <div className="flex items-center justify-between rounded-xl border border-brand-border bg-white/70 px-3 py-2.5 text-sm">
                <span className="font-medium text-brand-ink">{primary.name}</span>
                <span className="rounded-md bg-brand-accent-soft px-2 py-0.5 text-xs font-medium text-brand-accent">
                  {primaryRole}
                </span>
              </div>
            ) : (
              <p className="text-sm text-brand-muted">Preparando tu espacio…</p>
            )}
            {membershipViews.length > 1 ? (
              <p className="text-xs text-brand-muted">
                Tienes acceso a {membershipViews.length} espacios (legado o
                invitaciones). El principal es el más antiguo que posees.
              </p>
            ) : null}
            {canInvite && primary ? (
              <div className="space-y-3 border-t border-brand-border pt-4">
                <h3 className="text-sm font-medium text-brand-ink">
                  Invitar al equipo
                </h3>
                <InviteMemberForm workspaceId={primary.id} />
                {pendingInvites && pendingInvites.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {pendingInvites.map((inv) => (
                      <li
                        key={inv.id}
                        className="rounded-xl border border-brand-border bg-white/60 px-3 py-2 text-brand-muted"
                      >
                        <div className="flex justify-between gap-2">
                          <span>
                            {inv.email} · {inv.role}
                          </span>
                        </div>
                        <code className="mt-1 block truncate text-xs text-brand-ink/80">
                          /invite/{inv.token}
                        </code>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-brand-muted">
                Accedes como miembro invitado. Pide a un admin que gestione
                empresas e invitaciones.
              </p>
            )}
          </div>
        </BrandPanel>

        <BrandPanel
          eyebrow="Flujo"
          title="Siguiente paso"
          description="Administra empresas y genera el anexo."
        >
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/companies" />}>Empresas</Button>
            <Button variant="outline" render={<Link href="/export" />}>
              Carga / Export
            </Button>
          </div>
        </BrandPanel>
      </div>
    </div>
  );
}
