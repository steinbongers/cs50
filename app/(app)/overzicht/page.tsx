import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ACTION_LABEL, ACTION_VERB } from "@/config/app";
import { ConnectionBanner } from "@/components/bank/connection-banner";
import { RefreshButton } from "@/components/bank/refresh-button";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getPrimaryConnection, statusFor } from "@/lib/bank/connections";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overzicht" };

function greeting(name: string | null): string {
  const hour = new Date().getHours();
  const dagdeel = hour < 6 ? "Goedenacht" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  return name ? `${dagdeel}, ${name}` : dagdeel;
}

export default async function OverzichtPage({ searchParams }: PageProps<"/overzicht">) {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();
  const params = await searchParams;

  const [{ count }, connection] = await Promise.all([
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .is("category_id", null)
      .eq("is_internal_transfer", false),
    getPrimaryConnection(supabase, user.id),
  ]);

  const openCount = count ?? 0;
  const justConnected = params.bank === "gekoppeld";
  const canRefresh = connection !== null && ["active", "expiring"].includes(statusFor(connection));

  return (
    <>
      <PageHeader title={greeting(profile.display_name)} />
      <div className="flex flex-col gap-4 px-4">
        {justConnected && (
          <p className="rounded-control bg-positive-soft px-4 py-3 text-sm text-positive" role="status">
            Bank gekoppeld. Je transacties komen vanaf nu vanzelf binnen.
          </p>
        )}
        <ConnectionBanner connection={connection} />
        <Card padding="lg" className="flex flex-col gap-4">
          {openCount > 0 ? (
            <>
              <div>
                <p className="text-sm text-text-muted">Nog te {ACTION_VERB}</p>
                <p className="text-4xl font-semibold tabular-nums tracking-tight">{openCount}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {openCount === 1 ? "transactie zoekt nog een potje" : "transacties zoeken nog een potje"}
                </p>
              </div>
              <ButtonLink href="/swipen" size="lg" fullWidth>
                {ACTION_LABEL}
              </ButtonLink>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-text-muted">Nog te {ACTION_VERB}</p>
                <p className="text-4xl font-semibold tabular-nums tracking-tight">0</p>
                <p className="mt-1 text-sm text-text-muted">Alles zit in een potje. Lekker bezig, kop koffie verdiend.</p>
              </div>
              <ButtonLink href="/swipen" variant="secondary" size="lg" fullWidth>
                Naar {ACTION_LABEL.toLowerCase()}
              </ButtonLink>
            </>
          )}
          {canRefresh && <RefreshButton lastSyncedAt={connection?.last_synced_at ?? null} />}
        </Card>

        <Card className="flex flex-col gap-1">
          <p className="text-sm text-text-muted">Uitgegeven deze maand</p>
          <p className="text-sm text-text-muted">
            Inzichten verschijnen hier zodra je transacties een potje hebben. Dit onderdeel volgt in
            fase 4.
          </p>
        </Card>
      </div>
    </>
  );
}
