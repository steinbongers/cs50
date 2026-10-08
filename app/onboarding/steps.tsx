"use client";

import { usePathname } from "next/navigation";
import { ProgressBar } from "@/components/ui/progress-bar";

const STEPS = [
  { path: "/onboarding/potjes", label: "Potjes kiezen" },
  { path: "/onboarding/bron", label: "Transacties toevoegen" },
  { path: "/onboarding/klaar", label: "Beginnen" },
];

export function OnboardingSteps() {
  const pathname = usePathname();
  const index = Math.max(
    0,
    STEPS.findIndex((s) => pathname.startsWith(s.path)),
  );
  const step = index + 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{STEPS[index].label}</span>
        <span className="text-text-muted">
          Stap {step} van {STEPS.length}
        </span>
      </div>
      <ProgressBar value={step} max={STEPS.length} label={`Stap ${step} van ${STEPS.length}`} />
    </div>
  );
}
