"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceActionState = {
  error?: string;
  success?: string;
  workspaceId?: string;
  inviteUrl?: string;
};

export async function createCompany(
  _prev: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const nit = String(formData.get("nit") ?? "").trim() || null;
  const nrc = String(formData.get("nrc") ?? "").trim() || null;

  if (!workspaceId || !name) {
    return { error: "Workspace y nombre de empresa son requeridos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({
    workspace_id: workspaceId,
    name,
    nit,
    nrc,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/companies");
  revalidatePath("/export");
  return { success: "Empresa creada." };
}

export async function inviteToWorkspace(
  _prev: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member").trim() as
    | "admin"
    | "member";

  if (!workspaceId || !email) {
    return { error: "Workspace y email son requeridos." };
  }
  if (!["admin", "member"].includes(role)) {
    return { error: "Rol inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  if (user.email && user.email.toLowerCase() === email) {
    return { error: "No puedes invitarte a ti mismo." };
  }

  const { data: invite, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      email,
      role,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe una invitación pendiente para ese email." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  const inviteUrl = `/invite/${invite.token}`;
  return {
    success: `Invitación creada para ${email}.`,
    inviteUrl,
  };
}

export async function acceptWorkspaceInvite(
  token: string,
): Promise<WorkspaceActionState> {
  const trimmed = token.trim();
  if (!trimmed) return { error: "Token de invitación inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para aceptar la invitación." };

  const { error } = await supabase.rpc("accept_workspace_invite", {
    p_token: trimmed,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/companies");
  revalidatePath("/export");
  return { success: "Te uniste al espacio de trabajo." };
}

