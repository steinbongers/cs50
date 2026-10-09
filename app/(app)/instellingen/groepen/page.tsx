import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { openTotalsByMember } from "@/lib/groups/groups";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { GroupList, type GroupItem } from "./group-list";

export const metadata: Metadata = { title: "Groepen" };

export default async function GroepenPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: groups }, shares] = await Promise.all([
    supabase.from("share_groups").select("id, name, members").eq("user_id", user.id).order("name"),
    fetchAll((from, to) =>
      supabase
        .from("transaction_shares")
        .select("id, person_name, amount")
        .eq("user_id", user.id)
        .eq("status", "open")
        .not("person_name", "is", null)
        .order("id")
        .range(from, to),
    ),
  ]);

  const items: GroupItem[] = (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    members: group.members,
    open: openTotalsByMember(group.members, shares),
  }));

  return (
    <>
      <PageHeader title="Groepen" backHref="/instellingen" />
      <div className="flex flex-col gap-4 px-4 pb-8">
        <p className="px-1 text-[13px] leading-[18px] text-text-muted">
          Deel je vaak met dezelfde mensen? Maak een groep. Bij &quot;Ik krijg een deel terug&quot; kies je hem met één tik.
        </p>
        <GroupList items={items} />
      </div>
    </>
  );
}
