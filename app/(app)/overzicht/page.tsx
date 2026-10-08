import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ensureProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overzicht" };

function greeting(name: string | null): string {
  const hour = new Date().getHours();
  const dagdeel = hour < 6 ? "Goedenacht" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  return name ? `${dagdeel}, ${name}` : dagdeel;
}

export default async function OverzichtPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .is("category_id", null);

  const openCount = count ?? 0;

  return (
    <>
      <PageHeader title={greeting(profile.display_name)} />
      <div className="flex flex-col gap-4 px-4">
        <Card padding="lg" className="flex flex-col gap-4">
          {openCount > 0 ? (
            <>
              <div>
                <p className="text-sm text-text-muted">Nog te swipen</p>
                <p className="text-4xl font-semibold tabular-nums tracking-tight">{openCount}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {openCount === 1 ? "transactie wacht op een potje" : "transacties wachten op een potje"}
                </p>
              </div>
              <ButtonLink href="/swipen" size="lg" fullWidth>
                Swipen
              </ButtonLink>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-text-muted">Nog te swipen</p>
                <p className="text-4xl font-semibold tabular-nums tracking-tight">0</p>
                <p className="mt-1 text-sm text-text-muted">Alles heeft een potje. Lekker bezig.</p>
              </div>
              <ButtonLink href="/swipen" variant="secondary" size="lg" fullWidth>
                Naar swipen
              </ButtonLink>
            </>
          )}
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
