import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return (
      <div className="auth-shell">
        <div className="brand-panel w-full max-w-lg px-8 py-10 text-center">
          <p className="page-eyebrow">Configuración</p>
          <h1 className="page-title mt-2">Supabase no configurado</h1>
          <p className="page-description mx-auto mt-3">
            Copia <code className="rounded bg-brand-accent-soft px-1">.env.example</code>{" "}
            a{" "}
            <code className="rounded bg-brand-accent-soft px-1">.env.local</code>{" "}
            y aplica la migración SQL en tu proyecto Supabase.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell email={user.email}>{children}</AppShell>;
}
