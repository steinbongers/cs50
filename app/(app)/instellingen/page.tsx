import type { Metadata } from "next";
import { CircleHelp, Download, Info, Landmark, LayoutGrid, Pin, ShieldCheck, Users } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { HapticsToggle } from "@/components/push/haptics-toggle";
import { PushToggle } from "@/components/push/push-toggle";
import { ThemeToggle } from "@/components/push/theme-toggle";
import { ListGroup, ListRow } from "@/components/ui/list-group";
import { APP_NAME, SUPPORT_EMAIL } from "@/config/app";
import { ensureProfile, requireUser } from "@/lib/auth";
import { daysUntil, getPrimaryConnection, statusFor } from "@/lib/bank/connections";
import { createClient } from "@/lib/supabase/server";
import type { BankConnectionRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import pkg from "@/package.json";
import { DeleteAccountRow, ProfileCard, SalaryDayRow } from "./profile-settings";
import { AnchorRow, ROW_FOCUS, RowLabel } from "./rows";

export const metadata: Metadata = { title: "Instellingen" };

/** "0.1.0" wordt "0.1": de patchversie zegt een gebruiker niets. */
const VERSION = pkg.version.split(".").slice(0, 2).join(".");

function bankValue(connection: BankConnectionRow | null): { text: string; warn: boolean } {
  if (!connection) return { text: "Niet gekoppeld", warn: false };
  const status = statusFor(connection);
  const bank = connection.aspsp_name ?? "Bank";
  if (status === "active") return { text: `${bank} · actief`, warn: false };
  if (status === "expiring") {
    const days = Math.max(0, daysUntil(connection.valid_until) ?? 0);
    return { text: days === 0 ? "verloopt vandaag" : `verloopt over ${days} ${days === 1 ? "dag" : "dagen"}`, warn: true };
  }
  if (status === "expired") return { text: "verlopen", warn: true };
  return { text: "Niet gekoppeld", warn: false };
}

export default async function InstellingenPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [profile, connection] = await Promise.all([ensureProfile(user), getPrimaryConnection(supabase, user.id)]);
  const bank = bankValue(connection);

  return (
    <div className="safe-top-2 flex flex-col gap-6 px-4 pb-8">
      <h1 className="flex min-h-11 items-center text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Instellingen</h1>

      <ProfileCard displayName={profile.display_name?.trim() ?? ""} email={user.email} />

      <ListGroup title="Geld">
        <ListRow
          href="/potjes/beheren"
          icon={LayoutGrid}
          iconClass="bg-primary-soft text-primary"
          label={<RowLabel label="Potjes beheren" hint="Volgorde en gearchiveerde potjes" />}
          className={ROW_FOCUS}
        />
        <ListRow
          href="/instellingen/vaste-ontvangers"
          icon={Pin}
          iconClass="bg-cat-paars-soft text-cat-paars"
          label={<RowLabel label="Vaste ontvangers" hint="Potje ingedrukt gehouden: gaat er altijd in" />}
          className={ROW_FOCUS}
        />
        <ListRow
          href="/instellingen/groepen"
          icon={Users}
          iconClass="bg-cat-oranje-soft text-cat-oranje"
          label={<RowLabel label="Groepen" hint="Vaste mensen om mee te delen" />}
          className={ROW_FOCUS}
        />
        <SalaryDayRow salaryDay={profile.salary_day} />
        <ListRow
          href="/bank/koppelen?next=/instellingen"
          icon={Landmark}
          iconClass="bg-cat-mint-soft text-cat-mint"
          label="Bank"
          value={<span className={cn(bank.warn && "text-accent-strong")}>{bank.text}</span>}
          className={ROW_FOCUS}
        />
      </ListGroup>

      <ListGroup title="Meldingen en weergave">
        <PushToggle enabled={profile.notifications_enabled} vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
        <ThemeToggle />
        <HapticsToggle />
      </ListGroup>

      <ListGroup title="Gegevens">
        <AnchorRow
          href="/api/export"
          download
          icon={Download}
          iconClass="bg-cat-blauw-soft text-cat-blauw"
          label="Download je gegevens"
          hint="Alles als CSV-bestand"
        />
        <ListRow
          href="/privacy"
          icon={ShieldCheck}
          iconClass="bg-cat-groen-soft text-cat-groen"
          label="Privacy"
          className={ROW_FOCUS}
        />
      </ListGroup>

      <ListGroup title="Over">
        <ListRow
          href="/instellingen/over"
          icon={Info}
          iconClass="bg-cat-grijs-soft text-cat-grijs"
          label={`Over ${APP_NAME}`}
          value={`Versie ${VERSION}`}
          className={ROW_FOCUS}
        />
        <AnchorRow
          href={`mailto:${SUPPORT_EMAIL}`}
          icon={CircleHelp}
          iconClass="bg-cat-oranje-soft text-cat-oranje"
          label="Hulp en contact"
        />
      </ListGroup>

      <ListGroup>
        <form action={signOut}>
          <button
            type="submit"
            className={cn(
              "flex min-h-[52px] w-full items-center justify-center px-4 text-[15px] leading-5 text-primary",
              "transition-colors duration-150 active:bg-surface-muted",
              ROW_FOCUS,
            )}
          >
            Uitloggen
          </button>
        </form>
      </ListGroup>

      <ListGroup>
        <DeleteAccountRow />
      </ListGroup>
    </div>
  );
}
