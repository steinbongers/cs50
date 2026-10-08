import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { inviteCodesEnabled } from "@/lib/invites/codes";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Account aanmaken" };

export default async function RegistrerenPage({ searchParams }: PageProps<"/registreren">) {
  const params = await searchParams;
  const prefill = typeof params.code === "string" ? params.code : "";
  const codeError = params.error === "code";
  const requireInvite = inviteCodesEnabled();

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Account aanmaken</h1>
          <p className="mt-1 text-[15px] text-text-muted">
            {requireInvite
              ? "De pilot is op uitnodiging. Je code staat in je uitnodiging."
              : "Binnen een minuut ben je bezig."}
          </p>
        </div>
        {codeError && (
          <p className="rounded-control bg-negative-soft px-4 py-3 text-[13px] leading-[18px] text-negative" role="alert">
            Voor een nieuw account heb je een geldige code nodig. Vul hem hieronder in en probeer het nog een keer.
          </p>
        )}
        <RegisterForm requireInvite={requireInvite} prefillCode={prefill} />
      </div>
    </AuthShell>
  );
}
