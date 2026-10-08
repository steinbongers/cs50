import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/submit-button";
import { ACTION_VERB } from "@/config/app";
import { requireUser } from "@/lib/auth";
import { getPrimaryConnection } from "@/lib/bank/connections";
import { createClient } from "@/lib/supabase/server";
import { finishOnboarding } from "../actions";
import { StepFooter } from "../steps";

export const metadata: Metadata = { title: "Klaar" };

export default async function OnboardingKlaarPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ count: openCount }, connection] = await Promise.all([
    supabase.from("transactions").select("id", { count: "exact", head: true }).is("category_id", null),
    getPrimaryConnection(supabase, user.id),
  ]);
  const open = openCount ?? 0;
  // Bank overgeslagen ('Later doen'): dan komen er geen kaartjes, dus dat beloven we ook niet.
  const noBank = connection === null && open === 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div
          className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary"
          aria-hidden
        >
          <Sparkles size={28} strokeWidth={1.75} />
        </div>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">
          {noBank ? "Klaar. Nog één stap" : open > 0 ? "Klaar. Tijd voor je eerste kaartje" : "Klaar. Je kaartjes komen zo"}
        </h1>
        {noBank && (
          <p className="mt-2 max-w-xs text-[15px] leading-5 text-text-muted">
            Koppel je bank, dan komen je betalingen als kaartjes binnen.
          </p>
        )}
        {open > 0 && (
          <p className="mt-2 max-w-xs text-[15px] leading-5 text-text-muted">
            {open === 1 ? "1 kaartje wacht op je." : `${open} kaartjes wachten op je.`} Eén tik per kaartje.
          </p>
        )}
      </div>

      <StepFooter>
        {noBank ? (
          <div className="flex flex-col gap-2">
            <form action={finishOnboarding}>
              <input type="hidden" name="next" value="bank" />
              <SubmitButton size="lg" fullWidth>
                Bank koppelen
              </SubmitButton>
            </form>
            <form action={finishOnboarding}>
              <SubmitButton size="lg" variant="ghost" fullWidth>
                Eerst rondkijken
              </SubmitButton>
            </form>
          </div>
        ) : (
          <form action={finishOnboarding}>
            <SubmitButton size="lg" fullWidth>
              {open > 0 ? `Begin met ${ACTION_VERB}` : "Naar de app"}
            </SubmitButton>
          </form>
        )}
      </StepFooter>
    </div>
  );
}
