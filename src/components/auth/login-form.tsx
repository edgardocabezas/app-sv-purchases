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
    <Card className="w-full max-w-md border-brand-border bg-card/95 shadow-[0_1px_0_rgba(15,40,35,0.04)] ring-brand-border/40 [--card-spacing:--spacing(6)]">
      <CardHeader className="space-y-2 pb-1">
        <p className="page-eyebrow">Anexo Compras</p>
        <CardTitle className="font-heading text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>
          Accede con email y contraseña (Supabase Auth).
        </CardDescription>
      </CardHeader>
      <form action={formAction} className="flex flex-col">
        <CardContent className="flex flex-col gap-5 pb-6">
          <input type="hidden" name="next" value={next} />
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="brand-field-label">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-10 border-brand-border bg-white/80 px-3"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="brand-field-label">
              Contraseña
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-10 border-brand-border bg-white/80 px-3"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
          <p className="text-sm text-brand-muted">
            ¿Sin cuenta?{" "}
            <Link
              href={
                next && next !== "/dashboard"
                  ? `/signup?next=${encodeURIComponent(next)}`
                  : "/signup"
              }
              className="font-medium text-brand-accent underline-offset-4 hover:underline"
            >
              Crear cuenta
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
