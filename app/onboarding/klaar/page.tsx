import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ACTION_VERB } from "@/config/app";
import { finishOnboarding } from "../actions";

export const metadata: Metadata = { title: "Klaar om te beginnen" };

export default async function OnboardingKlaarPage() {
  await requireUser();
  const supabase = await createClient();

  const [{ count: categoryCount }, { count: openCount }] = await Promise.all([
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("archived", false),
    supabase.from("transactions").select("id", { count: "exact", head: true }).is("category_id", null),
  ]);

  const potjes = categoryCount ?? 0;
  const open = openCount ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div
          className="mb-5 flex size-20 items-center justify-center rounded-full bg-primary-soft text-primary"
          aria-hidden
        >
          <Sparkles size={32} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Je bent er klaar voor</h1>
        <p className="mt-2 max-w-xs text-text-muted">
          Je hebt {potjes === 1 ? "1 potje" : `${potjes} potjes`} klaarstaan.{" "}
          {open > 0
            ? `Er zoeken ${open} transacties nog een potje. Elke keuze is een klein moment van aandacht voor je geld (en een beetje voldoening).`
            : `Zodra er transacties binnenkomen, stop je ze één voor één in het juiste potje.`}
        </p>
      </div>

      <form action={finishOnboarding} className="safe-bottom px-4 pt-6 pb-5">
        <SubmitButton size="lg" fullWidth>
          {open > 0 ? `Begin met ${ACTION_VERB}` : "Naar de app"}
        </SubmitButton>
      </form>
    </div>
  );
}
