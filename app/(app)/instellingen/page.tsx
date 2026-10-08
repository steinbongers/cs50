import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { PushToggle } from "@/components/push/push-toggle";
import { ThemeToggle } from "@/components/push/theme-toggle";
import { Card } from "@/components/ui/card";
import { IconBank, IconChevronRight, IconJar, IconLogout, IconMail } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { APP_NAME, SUPPORT_EMAIL } from "@/config/app";
import { ensureProfile, requireUser } from "@/lib/auth";
import pkg from "@/package.json";
import { Info, ShieldCheck } from "lucide-react";
import { ProfileSettings } from "./profile-settings";

export const metadata: Metadata = { title: "Instellingen" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-medium text-text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Row({ href, icon, label, hint, external }: { href: string; icon: ReactNode; label: string; hint?: string; external?: boolean }) {
  const className = "flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-muted";
  const content = (
    <>
      <span className="text-text-muted" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block truncate text-sm text-text-muted">{hint}</span>}
      </span>
      <IconChevronRight size={18} className="text-text-muted" />
    </>
  );
  return external ? (
    <a href={href} className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export default async function InstellingenPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);

  return (
    <>
      <PageHeader title="Instellingen" />
      <div className="flex flex-col gap-6 px-4">
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

        <Section title="Je account">
          <ProfileSettings displayName={profile.display_name ?? ""} salaryDay={profile.salary_day} />
        </Section>

        <Section title="Potjes en bank">
          <Card padding="none" className="divide-y">
            <Row href="/potjes/beheren" icon={<IconJar size={20} />} label="Potjes beheren" hint="Volgorde, namen en kleuren" />
            <Row href="/bank/koppelen?next=/instellingen" icon={<IconBank size={20} />} label="Bankkoppeling" hint="Koppelen, verversen of verwijderen" />
          </Card>
        </Section>

        <Section title="Meldingen en weergave">
          <Card className="flex flex-col gap-4">
            <PushToggle enabled={profile.notifications_enabled} vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
            <div className="border-t pt-4">
              <ThemeToggle />
            </div>
          </Card>
        </Section>

        <Section title="Over">
          <Card padding="none" className="divide-y">
            <Row href="/instellingen/over" icon={<Info size={20} strokeWidth={1.75} />} label={`Over ${APP_NAME}`} hint={`Versie ${pkg.version}`} />
            <Row href="/privacy" icon={<ShieldCheck size={20} strokeWidth={1.75} />} label="Privacy en copyright" />
            <Row href={`mailto:${SUPPORT_EMAIL}`} external icon={<IconMail size={20} />} label="Service en contact" hint={SUPPORT_EMAIL} />
          </Card>
        </Section>

        <form action={signOut}>
          <SubmitButton variant="ghost" fullWidth>
            <IconLogout size={20} />
            Uitloggen
          </SubmitButton>
        </form>

        <p className="pb-2 text-center text-xs text-text-muted">
          {APP_NAME} · versie {pkg.version} · pilot
        </p>
      </div>
    </>
  );
}
