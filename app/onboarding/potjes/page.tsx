import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/categories/defaults";
import { createClient } from "@/lib/supabase/server";
import type { CategoryDraft } from "../actions";
import { CategoryPicker } from "./category-picker";

export const metadata: Metadata = { title: "Potjes kiezen" };

export default async function OnboardingPotjesPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("categories")
    .select("*")
    .is("system_key", null)
    .order("sort_order", { ascending: true });

  const drafts: CategoryDraft[] =
    existing && existing.length > 0
      ? existing.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          isIncome: c.is_income,
          enabled: !c.archived,
        }))
      : DEFAULT_CATEGORIES.map((c) => ({
          name: c.name,
          icon: c.icon,
          color: c.color,
          isIncome: c.isIncome,
          enabled: true,
        }));

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Welke potjes passen bij jou?</h1>
        <p className="mt-1 text-text-muted">
          Zet potjes aan of uit, geef ze een eigen naam, icoon of kleur. Je kunt dit later altijd
          aanpassen.
        </p>
      </div>
      <CategoryPicker initialDrafts={drafts} />
    </div>
  );
}
