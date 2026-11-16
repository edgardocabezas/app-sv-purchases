"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptWorkspaceInvite } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptWorkspaceInvite(token);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button onClick={onAccept} disabled={pending} className="w-full">
        {pending ? "Aceptando…" : "Aceptar invitación"}
      </Button>
    </div>
  );
}
