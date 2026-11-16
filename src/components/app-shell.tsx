import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function AppShell({
  email,
  children,
}: {
  email?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Anexo Compras
            </Link>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/companies" className="hover:text-foreground">
                Empresas
              </Link>
              <Link href="/export" className="hover:text-foreground">
                Carga / Export
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {email ? (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {email}
              </span>
            ) : null}
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
