import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ManageCategories } from "./manage-categories";

export const metadata: Metadata = { title: "Potjes beheren" };

export default async function PotjesBeherenPage() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, icon, color, archived, is_income")
    .is("system_key", null)
    .order("sort_order", { ascending: true });

  const all = data ?? [];
  return (
    <>
      <PageHeader title="Potjes beheren" subtitle="Volgorde van de tegels, gearchiveerde potjes" backHref="/instellingen" />
      <ManageCategories
        active={all.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))}
        archived={all.filter((c) => c.archived).map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))}
      />
    </>
  );
}
