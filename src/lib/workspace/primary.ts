import type { WorkspaceRole } from "@/types/database";

export type MembershipForPrimary = {
  role: WorkspaceRole | string;
  workspace: {
    id: string;
    name: string;
    created_at: string;
  } | null;
};

/**
 * Pick the user's primary workspace:
 * 1) oldest owned workspace
 * 2) else oldest membership
 */
export function pickPrimaryWorkspace(
  memberships: MembershipForPrimary[],
): MembershipForPrimary["workspace"] {
  const withWorkspace = memberships.filter(
    (m): m is MembershipForPrimary & { workspace: NonNullable<MembershipForPrimary["workspace"]> } =>
      Boolean(m.workspace?.id),
  );

  if (withWorkspace.length === 0) return null;

  const owned = withWorkspace
    .filter((m) => m.role === "owner")
    .sort((a, b) => a.workspace.created_at.localeCompare(b.workspace.created_at));

  if (owned.length > 0) return owned[0].workspace;

  return [...withWorkspace].sort((a, b) =>
    a.workspace.created_at.localeCompare(b.workspace.created_at),
  )[0].workspace;
}

export function defaultWorkspaceName(fullName?: string | null, email?: string | null): string {
  const name = fullName?.trim();
  if (name) return `Espacio de ${name}`;
  const local = email?.split("@")[0]?.trim();
  if (local) return `Espacio de ${local}`;
  return "Mi espacio";
}
