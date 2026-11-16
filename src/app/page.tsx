import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  if (hasSupabaseEnv()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) redirect("/dashboard");
    } catch {
      // Fall through to marketing/landing if env misconfigured at runtime.
    }
  }

  return (
    <div className="auth-shell">
      <div className="brand-panel w-full max-w-lg px-8 py-10 text-center">
        <p className="page-eyebrow">El Salvador · F-07 V14</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-brand-ink">
          Anexo <span className="text-brand-accent">Compras</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-brand-muted">
          Sube DTE JSON, valida por empresa y periodo, y descarga el CSV del
          Anexo de Compras más Excel de control CRED/FACT.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" render={<Link href="/login" />}>
            Iniciar sesión
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/signup" />}>
            Crear cuenta
          </Button>
        </div>
        {!hasSupabaseEnv() ? (
          <p className="mt-6 text-sm text-amber-800">
            Configura <code className="rounded bg-brand-accent-soft px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            y{" "}
            <code className="rounded bg-brand-accent-soft px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            en <code className="rounded bg-brand-accent-soft px-1">.env.local</code>{" "}
            (ver README).
          </p>
        ) : null}
      </div>
    </div>
  );
}
