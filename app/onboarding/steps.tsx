"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { IconChevronLeft } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/** Vaste stapnamen; deze gaan ook als `step` mee in de metingen. */
export type OnboardingStepKey = "potjes" | "salarisdag" | "bank" | "klaar";

const ONBOARDING_STEPS: ReadonlyArray<{ key: OnboardingStepKey; path: string }> = [
  { key: "potjes", path: "/onboarding/potjes" },
  { key: "salarisdag", path: "/onboarding/salarisdag" },
  { key: "bank", path: "/onboarding/bron" },
  { key: "klaar", path: "/onboarding/klaar" },
];

/**
 * Bovenbalk van de onboarding: terugchevron en voortgang in vier segmenten.
 * Logt elke getoonde stap één keer via `onView` (server action uit de layout).
 */
export function OnboardingSteps({ onView }: { onView: (step: OnboardingStepKey) => Promise<void> }) {
  const pathname = usePathname();
  const found = ONBOARDING_STEPS.findIndex((s) => pathname.startsWith(s.path));
  const index = Math.max(0, found);
  const step = index + 1;
  const previous = index > 0 ? ONBOARDING_STEPS[index - 1] : null;
  const label = `Stap ${step} van ${ONBOARDING_STEPS.length}`;

  const logged = useRef<string | null>(null);
  useEffect(() => {
    if (found === -1 || logged.current === pathname) return;
    logged.current = pathname;
    void onView(ONBOARDING_STEPS[found].key).catch(() => {});
  }, [found, pathname, onView]);

  return (
    <div className="flex flex-col gap-2 px-4">
      <div className="flex h-11 items-center">
        {previous ? (
          <Link
            href={previous.path}
            aria-label="Terug"
            className="-ml-2.5 flex size-11 items-center justify-center rounded-full text-text transition-colors duration-150 hover:bg-surface-muted"
          >
            <IconChevronLeft />
          </Link>
        ) : (
          <span className="size-11" aria-hidden />
        )}
      </div>
      <div
        className="grid grid-cols-4 gap-1.5"
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={ONBOARDING_STEPS.length}
        aria-valuenow={step}
        aria-valuetext={label}
      >
        {ONBOARDING_STEPS.map((s, i) => (
          <span
            key={s.key}
            className={cn(
              "h-1 rounded-full transition-colors duration-200",
              i < step ? "bg-primary" : "bg-surface-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Kop van een onboardingstap: titel 28 px en één regel uitleg. */
export function StepHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">{title}</h1>
      {children && <p className="mt-2 text-[15px] leading-5 text-text-muted">{children}</p>}
    </div>
  );
}

/** Vaste CTA-strook onderaan een onboardingstap. */
export function StepFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 mt-auto bg-bg/95 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}
