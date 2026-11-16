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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="max-w-lg space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Anexo Compras</h1>
        <p className="text-muted-foreground">
          Sube DTE JSON, valida por empresa y periodo, y descarga el CSV del
          Anexo de Compras F-07 V14.
        </p>
      </div>
      <div className="flex gap-3">
        <Button render={<Link href="/login" />}>Iniciar sesión</Button>
        <Button variant="outline" render={<Link href="/signup" />}>
          Crear cuenta
        </Button>
      </div>
      {!hasSupabaseEnv() ? (
        <p className="max-w-md text-center text-sm text-amber-700">
          Configura <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en <code>.env.local</code>{" "}
          (ver README).
        </p>
      ) : null}
    </div>
  );
}
