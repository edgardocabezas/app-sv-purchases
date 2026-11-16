"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceActionState = {
  error?: string;
  success?: string;
  workspaceId?: string;
};

export async function createWorkspace(
  _prev: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nombre del workspace requerido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data: workspace, error } = await supabase.rpc(
    "create_workspace_with_owner",
    { p_name: name },
  );

  if (error || !workspace) {
    return { error: error?.message ?? "No se pudo crear el workspace." };
  }

  const workspaceId =
    typeof workspace === "object" && workspace !== null && "id" in workspace
      ? String((workspace as { id: string }).id)
      : undefined;

  revalidatePath("/dashboard");
  revalidatePath("/companies");
  return {
    success: "Workspace creado.",
    workspaceId,
  };
}

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
