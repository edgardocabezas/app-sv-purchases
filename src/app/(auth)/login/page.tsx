import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="auth-shell">
      <LoginForm next={params.next || "/dashboard"} />
    </div>
  );
}
