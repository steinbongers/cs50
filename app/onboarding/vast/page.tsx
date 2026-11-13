import type { Metadata } from "next";
import { FixedPicker } from "@/components/fixed/fixed-picker";
import { loadFixedMonthPage } from "@/lib/insights/fixed-month-page";
import { StepHeader } from "../steps";

export const metadata: Metadata = { title: "Je vaste maand" };

/**
 * Onboarding, na het koppelen van de bank: de lopende salarismaand tot nu toe, per verkoper. De gebruiker tikt
 * aan wat elke maand terugkomt; daarmee weet de app vanaf dag één wat er per maand vrij is.
 */
export default async function OnboardingVastPage() {
  const data = await loadFixedMonthPage();
  return (
    <div className="flex flex-1 flex-col">
      <StepHeader title="Je vaste maand">
        Tik aan wat elke maand terugkomt.
      </StepHeader>
      <FixedPicker {...data} next="/onboarding/klaar" saveLabel="Verder" skipLabel="Later doen" />
    </div>
  );
}
