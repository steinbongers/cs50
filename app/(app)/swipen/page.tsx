import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Swipen" };

export default async function SwipenPage() {
  await requireUser();
  const supabase = await createClient();
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .is("category_id", null);

  const openCount = count ?? 0;

  return (
    <>
      <PageHeader title="Swipen" subtitle={openCount > 0 ? `Nog ${openCount} te gaan` : undefined} />
      <EmptyState
        emoji="🃏"
        title="Het swipescherm komt in fase 2"
        description={
          openCount > 0
            ? `Er staan ${openCount} transacties klaar om te swipen.`
            : "Zodra er transacties zijn, verschijnen ze hier als kaarten."
        }
      />
    </>
  );
}
