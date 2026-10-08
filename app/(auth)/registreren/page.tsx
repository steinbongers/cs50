import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Account aanmaken" };

import { inviteCodesEnabled } from "@/lib/invites/codes";

export default async function RegistrerenPage({ searchParams }: PageProps<"/registreren">) {
  const params = await searchParams;
  const prefill = typeof params.code === "string" ? params.code : "";
  const codeError = params.error === "code";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account aanmaken</h1>
        <p className="mt-1 text-text-muted">
          {inviteCodesEnabled() ? "De pilot is op uitnodiging. Je code staat in het bericht dat je kreeg." : "Binnen een minuut ben je bezig."}
        </p>
      </div>
      {codeError && (
        <p className="rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
          Er hoort een geldige uitnodigingscode bij een nieuw account. Vul hem hieronder in en probeer het opnieuw.
        </p>
      )}
      <RegisterForm requireInvite={inviteCodesEnabled()} prefillCode={prefill} />
    </div>
  );
}
