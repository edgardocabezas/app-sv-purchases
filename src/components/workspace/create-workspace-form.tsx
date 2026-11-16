"use client";

import { useActionState } from "react";
import {
  createWorkspace,
  type WorkspaceActionState,
} from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial: WorkspaceActionState = {};

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState(createWorkspace, initial);

  return (
    <form action={formAction} className="space-y-3">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="workspace-name">Nombre del workspace</Label>
        <Input
          id="workspace-name"
          name="name"
          placeholder="Mi contabilidad"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear workspace"}
      </Button>
    </form>
  );
}
