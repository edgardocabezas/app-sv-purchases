"use client";

import { useActionState } from "react";
import {
  inviteToWorkspace,
  type WorkspaceActionState,
} from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial: WorkspaceActionState = {};

export function InviteMemberForm({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [state, formAction, pending] = useActionState(inviteToWorkspace, initial);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="workspace_id" value={workspaceId} />
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert>
          <AlertDescription>
            {state.success}
            {state.inviteUrl ? (
              <>
                {" "}
                Enlace:{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  {state.inviteUrl}
                </code>
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="colegas@empresa.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-role">Rol</Label>
        <select
          id="invite-role"
          name="role"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          defaultValue="member"
        >
          <option value="member">Miembro</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Invitar"}
      </Button>
    </form>
  );
}
