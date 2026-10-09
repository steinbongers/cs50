import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ruleLabel } from "@/lib/transactions/rules";
import { RuleList, type RuleItem } from "./rule-list";

export const metadata: Metadata = { title: "Vaste ontvangers" };

export default async function VasteOntvangersPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: rules }, { data: categories }] = await Promise.all([
    supabase
      .from("category_rules")
      .select("id, counterparty_match, category_id")
      .eq("user_id", user.id)
      .order("counterparty_match"),
    supabase.from("categories").select("id, name, icon, color, archived").eq("user_id", user.id),
  ]);
  const byId = new Map((categories ?? []).map((c) => [c.id, c]));
  const items: RuleItem[] = (rules ?? []).flatMap((rule) => {
    const category = byId.get(rule.category_id);
    if (!category) return [];
    const { counterparty, incoming } = ruleLabel(rule.counterparty_match);
    return [
      {
        id: rule.id,
        counterparty,
        incoming,
        categoryName: category.name,
        icon: category.icon,
        color: category.color,
        archived: category.archived,
      },
    ];
  });

  return (
    <>
      <PageHeader title="Vaste ontvangers" backHref="/instellingen" />
      <div className="flex flex-col gap-4 px-4 pb-8">
        <p className="px-1 text-[13px] leading-[18px] text-text-muted">
          Houd op het hoofdscherm een potje ingedrukt, dan gaat die ontvanger voortaan altijd daarin. Haal je er een weg,
          dan blijft wat al is ingedeeld gewoon staan.
        </p>
        <RuleList items={items} />
      </div>
    </>
  );
}
