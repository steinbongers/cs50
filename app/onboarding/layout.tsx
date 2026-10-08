import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { OnboardingSteps, type OnboardingStepKey } from "./steps";

// Zelfde stapnamen als in steps.tsx; hier los, want dat is een clientmodule.
const STEP_KEYS: readonly OnboardingStepKey[] = ["potjes", "salarisdag", "bank", "klaar"];

/** Meting: welke onboardingstap is getoond. Alleen de vaste stapnaam. */
async function logStepViewed(step: string): Promise<void> {
  "use server";
  if (!STEP_KEYS.includes(step as OnboardingStepKey)) return;
  await logEvent("onboarding_step_viewed", { step });
}

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col">
      <header className="pt-1">
        <OnboardingSteps onView={logStepViewed} />
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
