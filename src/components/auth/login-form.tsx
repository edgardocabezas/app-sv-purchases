"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial: AuthActionState = {};

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initial);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Accede a Anexo Compras con email y contraseña (Supabase Auth).
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="next" value={next} />
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
          <p className="text-sm text-muted-foreground">
            ¿Sin cuenta?{" "}
            <Link
              href={
                next && next !== "/dashboard"
                  ? `/signup?next=${encodeURIComponent(next)}`
                  : "/signup"
              }
              className="underline underline-offset-4"
            >
              Crear cuenta
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
