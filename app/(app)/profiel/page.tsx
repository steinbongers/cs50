import type { Metadata } from "next";
import { signOut } from "@/app/auth/actions";
import { Card } from "@/components/ui/card";
import { IconLogout } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { APP_NAME } from "@/config/app";
import { ensureProfile, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profiel" };

export default async function ProfielPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);

  return (
    <>
      <PageHeader title="Profiel" />
      <div className="flex flex-col gap-4 px-4">
        <Card className="flex items-center gap-4">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-primary"
            aria-hidden
          >
            {(profile.display_name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{profile.display_name ?? "Zonder naam"}</p>
            <p className="truncate text-sm text-text-muted">{user.email}</p>
          </div>
        </Card>

        <Card className="flex flex-col gap-1">
          <p className="font-medium">Instellingen</p>
          <p className="text-sm text-text-muted">
            Potjes beheren, bankkoppelingen, meldingen, data exporteren en account verwijderen volgen
            in fase 5.
          </p>
        </Card>

        <form action={signOut}>
          <SubmitButton variant="ghost" fullWidth>
            <IconLogout size={20} />
            Uitloggen
          </SubmitButton>
        </form>

        <p className="text-center text-xs text-text-muted">{APP_NAME} · pilotversie</p>
      </div>
    </>
  );
}
