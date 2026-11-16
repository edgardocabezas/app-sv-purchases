import { createClient } from "@/lib/supabase/server";
import { defaultWorkspaceName } from "./primary";
import type { Workspace } from "@/types/database";

/**
 * Ensure the signed-in user has at least one workspace (auto-create as owner).
 * Returns the default/primary workspace from the DB RPC.
 */
export async function ensureDefaultWorkspace(): Promise<{
  workspace: Workspace | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { workspace: null, error: "No autenticado." };

  const name = defaultWorkspaceName(
    (user.user_metadata?.full_name as string | undefined) ?? null,
    user.email,
  );

  const { data, error } = await supabase.rpc("ensure_default_workspace", {
    p_name: name,
  });

  if (error) {
    return { workspace: null, error: error.message };
  }

  return { workspace: (data as Workspace) ?? null };
}
