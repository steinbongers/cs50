import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { PushToggle } from "@/components/push/push-toggle";
import { ThemeToggle } from "@/components/push/theme-toggle";
import { Card } from "@/components/ui/card";
import { IconBank, IconChevronRight, IconJar, IconLogout } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { APP_NAME } from "@/config/app";
import { ProfileSettings } from "./profile-settings";
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

        <Card padding="none" className="divide-y">
          <Link href="/potjes/beheren" className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-muted">
            <IconJar size={20} className="text-text-muted" />
            <span className="flex-1 font-medium">Potjes beheren</span>
            <IconChevronRight size={18} className="text-text-muted" />
          </Link>
          <Link href="/bank/koppelen?next=/profiel" className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-muted">
            <IconBank size={20} className="text-text-muted" />
            <span className="flex-1 font-medium">Bankkoppeling</span>
            <IconChevronRight size={18} className="text-text-muted" />
          </Link>
        </Card>

        <Card className="flex flex-col gap-4">
          <PushToggle enabled={profile.notifications_enabled} vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
          <div className="border-t pt-4">
            <ThemeToggle />
          </div>
        </Card>

        <ProfileSettings displayName={profile.display_name ?? ""} salaryDay={profile.salary_day} />

        <p className="px-1 text-sm text-text-muted">
          <Link href="/privacy" className="font-medium text-primary">
            Hoe we met je gegevens omgaan
          </Link>
        </p>

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
