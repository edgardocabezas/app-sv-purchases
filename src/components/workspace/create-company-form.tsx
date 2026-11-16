"use client";

import { useActionState } from "react";
import {
  createCompany,
  type WorkspaceActionState,
} from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial: WorkspaceActionState = {};

export function CreateCompanyForm({
  workspaces,
}: {
  workspaces: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createCompany, initial);

  if (workspaces.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Crea un workspace antes de agregar empresas.
      </p>
    );
  }

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
        <Label htmlFor="workspace_id">Workspace</Label>
        <select
          id="workspace_id"
          name="workspace_id"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          required
          defaultValue={workspaces[0]?.id}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company-name">Nombre de la empresa</Label>
        <Input id="company-name" name="name" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nit">NIT (opcional)</Label>
          <Input id="nit" name="nit" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nrc">NRC (opcional)</Label>
          <Input id="nrc" name="nrc" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear empresa"}
      </Button>
    </form>
  );
}
