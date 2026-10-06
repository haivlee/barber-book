import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Barber login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const usingDefaultPassword = !process.env.ADMIN_PASSWORD;

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[oklch(0.18_0.012_60)] px-4 text-[oklch(0.97_0.01_85)]">
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-brass/20 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <Logo className="mx-auto flex w-fit" />
        <div className="mt-8 rounded-2xl bg-background p-6 text-foreground shadow-2xl sm:p-8">
          <h1 className="font-heading text-2xl font-semibold">Barber dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to review and confirm booking requests.
          </p>
          <LoginForm next={next} />
          {usingDefaultPassword && (
            <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Demo mode: the password is <span className="font-mono font-semibold text-foreground">barber123</span>.
              Set <span className="font-mono">ADMIN_PASSWORD</span> in <span className="font-mono">.env</span> to change it.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
