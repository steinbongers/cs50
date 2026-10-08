import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const linkError = params.error === "link";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welkom terug</h1>
        <p className="mt-1 text-text-muted">Log in om verder te gaan met swipen.</p>
      </div>
      {linkError && (
        <p className="rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
          Deze inloglink is ongeldig of verlopen. Vraag hieronder een nieuwe aan.
        </p>
      )}
      <LoginForm next={next} />
    </div>
  );
}
