import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ACTION_VERB } from "@/config/app";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const linkError = params.error === "link";

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Welkom terug</h1>
          <p className="mt-1 text-[15px] text-text-muted">Log in en ga verder met {ACTION_VERB}.</p>
        </div>
        {linkError && (
          <p className="rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
            Die link werkt niet meer. Log hieronder in met je wachtwoord.
          </p>
        )}
        <LoginForm next={next} />
      </div>
    </AuthShell>
  );
}
