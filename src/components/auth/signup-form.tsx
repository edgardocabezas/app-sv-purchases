"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthActionState } from "@/app/actions/auth";
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

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initial);

  return (
    <Card className="w-full max-w-md border-brand-border bg-card/95 shadow-[0_1px_0_rgba(15,40,35,0.04)] ring-brand-border/40">
      <CardHeader className="space-y-2">
        <p className="page-eyebrow">Anexo Compras</p>
        <CardTitle className="font-heading text-2xl">Crear cuenta</CardTitle>
        <CardDescription>
          Regístrate: creamos tu espacio automáticamente. Luego agrega empresas
          e invita a tu equipo.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
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
            <Label htmlFor="full_name" className="brand-field-label">
              Nombre
            </Label>
            <Input
              id="full_name"
              name="full_name"
              autoComplete="name"
              className="h-9 border-brand-border bg-white/80"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="brand-field-label">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-9 border-brand-border bg-white/80"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="brand-field-label">
              Contraseña
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              className="h-9 border-brand-border bg-white/80"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creando…" : "Crear cuenta"}
          </Button>
          <p className="text-sm text-brand-muted">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-accent underline-offset-4 hover:underline"
            >
              Iniciar sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
