import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteForm } from "@/components/workspace/accept-invite-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type InvitePublic = {
  email: string;
  role: string;
  accepted_at: string | null;
  workspace_name: string;
};

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase.rpc("get_workspace_invite_public", {
    p_token: token,
  });

  const invite = (Array.isArray(rows) ? rows[0] : rows) as
    | InvitePublic
    | null
    | undefined;

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitación no encontrada</CardTitle>
            <CardDescription>
              El enlace es inválido o ya no está disponible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/login" />}>Iniciar sesión</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.accepted_at) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitación ya aceptada</CardTitle>
            <CardDescription>
              Esta invitación a {invite.workspace_name} ya fue usada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/dashboard" />}>Ir al dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const emailMatches =
    !!user?.email && user.email.toLowerCase() === invite.email.toLowerCase();
  const next = `/invite/${token}`;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unirte a {invite.workspace_name}</CardTitle>
          <CardDescription>
            Invitación para <strong>{invite.email}</strong> como{" "}
            <strong>{invite.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <Alert>
              <AlertDescription>
                Inicia sesión o regístrate con {invite.email} para aceptar.{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="underline underline-offset-4"
                >
                  Iniciar sesión
                </Link>{" "}
                ·{" "}
                <Link
                  href={`/signup?next=${encodeURIComponent(next)}`}
                  className="underline underline-offset-4"
                >
                  Crear cuenta
                </Link>
              </AlertDescription>
            </Alert>
          ) : !emailMatches ? (
            <Alert variant="destructive">
              <AlertDescription>
                Estás autenticado como {user.email}, pero la invitación es para{" "}
                {invite.email}. Cierra sesión e ingresa con el email invitado.
              </AlertDescription>
            </Alert>
          ) : (
            <AcceptInviteForm token={token} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
