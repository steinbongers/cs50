import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconChevronLeft } from "@/components/ui/icons";
import { APP_NAME } from "@/config/app";
import { requireUser } from "@/lib/auth";
import { daysUntil, getPrimaryConnection, statusFor } from "@/lib/bank/connections";
import { listAspsps } from "@/lib/enablebanking/client";
import { isEnableBankingConfigured } from "@/lib/enablebanking/jwt";
import type { EbAspsp } from "@/lib/enablebanking/types";
import { createClient } from "@/lib/supabase/server";
import { BankPicker } from "./bank-picker";
import { ConnectionCard } from "./connection-card";
import { HowItWorks } from "./how-it-works";

export const metadata: Metadata = { title: "Bank koppelen" };

const PRIORITY = ["ING", "Rabobank", "ABN AMRO", "bunq", "ASN", "SNS", "Knab", "Triodos"];

/** Foutcodes van /api/bank/callback, in gewone taal. */
const ERRORS: Record<string, string> = {
  state: "Er ging iets mis op de terugweg van je bank. Probeer het nog een keer.",
  geweigerd: "Je bank heeft het koppelen afgebroken. Probeer het nog een keer.",
  sessie: "Je bank gaf geen akkoord terug. Probeer het nog een keer.",
  opslaan: "Het koppelen lukte bijna, maar niet helemaal. Probeer het nog een keer.",
};

const NOT_CONFIGURED = "Bank koppelen kan nu even niet. We zijn ermee bezig.";

function sortBanks(aspsps: EbAspsp[]): EbAspsp[] {
  const rank = (a: EbAspsp) => {
    const index = PRIORITY.findIndex((p) => a.name.toLowerCase().includes(p.toLowerCase()));
    return index === -1 ? PRIORITY.length : index;
  };
  return [...aspsps]
    .filter((a) => !a.beta)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "nl"));
}

export default async function BankKoppelenPage({ searchParams }: PageProps<"/bank/koppelen">) {
  const user = await requireUser();
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/overzicht";
  const errorKey = typeof params.error === "string" && Object.hasOwn(ERRORS, params.error) ? params.error : null;
  const reconnect = params.reconnect === "1";

  // bank_connect_failed wordt al eenmalig gelogd in /api/bank/callback.

  const supabase = await createClient();
  const connection = await getPrimaryConnection(supabase, user.id);
  const status = connection ? statusFor(connection) : null;
  const configured = isEnableBankingConfigured();

  let banks: EbAspsp[] = [];
  let loadError: string | null = null;
  if (configured && (!connection || status !== "active" || reconnect)) {
    try {
      banks = sortBanks((await listAspsps("NL")).aspsps ?? []);
    } catch {
      loadError = "We konden de lijst met banken niet ophalen. Probeer het zo nog eens.";
    }
  }

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col pb-8">
      <header className="mt-1 flex h-11 items-center gap-2 px-4">
        <Link
          href={next}
          aria-label="Terug"
          className="-ml-2 flex size-11 items-center justify-center rounded-full hover:bg-surface-muted"
        >
          <IconChevronLeft />
        </Link>
        <p className="text-[13px] leading-[18px] font-semibold text-primary">{APP_NAME}</p>
      </header>

      <div className="px-5 pt-4 pb-3">
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">
          {connection && status === "active" && !reconnect ? "Je bankkoppeling" : "Koppel je bank"}
        </h1>
        <p className="mt-2 text-[15px] leading-5 text-text-muted">
          Je logt in bij je eigen bank en geeft toestemming om mee te kijken. Wij kunnen nooit geld overmaken. Af en
          toe vraagt je bank opnieuw om toestemming. Wij laten het je op tijd weten.
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {errorKey && (
          <p className="rounded-control bg-negative-soft px-4 py-3 text-[13px] leading-[18px] text-negative" role="alert">
            {ERRORS[errorKey]}
          </p>
        )}

        {connection && status && (
          <ConnectionCard
            aspspName={connection.aspsp_name ?? "je bank"}
            status={status}
            daysLeft={daysUntil(connection.valid_until)}
            validUntil={connection.valid_until}
            lastSyncedAt={connection.last_synced_at}
            lastError={connection.last_error}
            showReconnect={status !== "active" && !reconnect}
            next={next}
          />
        )}

        {!configured ? (
          <>
            <Card className="text-[13px] leading-[18px] text-text-muted">{NOT_CONFIGURED}</Card>
            {/* Geen doodlopende weg: je kunt altijd door naar waar je vandaan kwam. */}
            <ButtonLink href={next} variant="secondary" size="lg" fullWidth>
              Verder naar de app
            </ButtonLink>
          </>
        ) : loadError ? (
          <Card className="text-[13px] leading-[18px] text-negative">{loadError}</Card>
        ) : banks.length > 0 ? (
          <>
            {/* Eerst rustig uitleggen, dan pas de bank kiezen. */}
            <HowItWorks />
            <BankPicker banks={banks.map((b) => ({ name: b.name, logo: b.logo ?? null }))} next={next} reconnect={Boolean(connection)} />
          </>
        ) : null}

        <p className="px-1 text-[13px] leading-[18px] text-text-muted">
          Je koppelt één bank, met al je rekeningen daar. Geld dat je naar jezelf overmaakt, slaan we over.
        </p>
      </div>
    </div>
  );
}
