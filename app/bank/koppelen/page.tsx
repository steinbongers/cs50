import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = { title: "Bank koppelen" };

const PRIORITY = ["ING", "Rabobank", "ABN AMRO", "bunq", "ASN", "SNS", "Knab", "Triodos"];

const ERRORS: Record<string, string> = {
  state: "De terugkeer van de bank klopte niet met je poging. Probeer het opnieuw.",
  geweigerd: "De koppeling is bij de bank afgebroken. Je kunt het opnieuw proberen.",
  sessie: "De bank gaf geen geldige sessie terug. Probeer het nog eens.",
  opslaan: "De koppeling kon niet worden opgeslagen. Probeer het nog eens.",
};

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
  const errorKey = typeof params.error === "string" ? params.error : null;
  const reconnect = params.reconnect === "1";

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
      loadError = "De lijst met banken kon niet worden geladen. Probeer het zo nog eens.";
    }
  }

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col pb-8">
      <header className="flex items-center gap-2 px-4 pt-4">
        <Link
          href={next}
          aria-label="Terug"
          className="-ml-2 flex size-11 items-center justify-center rounded-full hover:bg-surface-muted"
        >
          <IconChevronLeft />
        </Link>
        <p className="text-sm font-semibold text-primary">{APP_NAME}</p>
      </header>

      <div className="px-5 pt-4 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {connection && status === "active" && !reconnect ? "Je bankkoppeling" : "Koppel je bank"}
        </h1>
        <p className="mt-1 text-text-muted">
          Je logt in bij je eigen bank en geeft toestemming om transacties te lezen. Wij kunnen niets
          overmaken of wijzigen. Na 90 dagen vraagt je bank opnieuw om toestemming.
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {errorKey && ERRORS[errorKey] && (
          <p className="rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
            {ERRORS[errorKey]}
          </p>
        )}

        {connection && status && (
          <ConnectionCard
            aspspName={connection.aspsp_name ?? "je bank"}
            status={status}
            daysLeft={daysUntil(connection.valid_until)}
            lastSyncedAt={connection.last_synced_at}
            lastError={connection.last_error}
            showReconnect={status !== "active" && !reconnect}
            next={next}
          />
        )}

        {!configured ? (
          <Card className="text-sm text-text-muted">
            De bankkoppeling staat nog niet aan voor deze omgeving. Probeer het later.
          </Card>
        ) : loadError ? (
          <Card className="text-sm text-negative">{loadError}</Card>
        ) : banks.length > 0 ? (
          <BankPicker banks={banks.map((b) => ({ name: b.name, logo: b.logo ?? null }))} next={next} reconnect={Boolean(connection)} />
        ) : null}

        <p className="px-1 text-xs text-text-muted">
          Je kunt één bank koppelen; alle rekeningen van die bank komen mee. Overboekingen tussen je
          eigen rekeningen slaan we automatisch over.
        </p>
      </div>
    </div>
  );
}
