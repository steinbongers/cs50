import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { IconCards } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ACTION_LABEL } from "@/config/app";

export const metadata: Metadata = { title: ACTION_LABEL };

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
      <PageHeader title={ACTION_LABEL} subtitle={openCount > 0 ? `Nog ${openCount} te gaan` : undefined} />
      <EmptyState
        icon={<IconCards size={28} />}
        title="Dit scherm komt in fase 2"
        description={
          openCount > 0
            ? `Er staan ${openCount} transacties klaar voor een potje.`
            : "Zodra er transacties zijn, verschijnen ze hier als kaarten."
        }
      />
    </>
  );
}
