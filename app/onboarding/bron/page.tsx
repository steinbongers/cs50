import { Eye, Lock, RefreshCw, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { StepFooter, StepHeader } from "../steps";

export const metadata: Metadata = { title: "Koppel je bank" };

const TRUST: ReadonlyArray<{ icon: LucideIcon; text: string }> = [
  { icon: Eye, text: "Alleen meekijken" },
  { icon: Lock, text: "Wij kunnen niets overmaken" },
  { icon: RefreshCw, text: "Af en toe vraagt je bank opnieuw om toestemming. Wij laten het je op tijd weten." },
];

/**
 * Bank koppelen in de onboarding. De app werkt alleen met een bankkoppeling,
 * dus koppelen is de hoofdknop en later doen een rustige tekstknop.
 * `bank_connect_started` wordt gelogd zodra je een bank kiest (startBankConnection).
 */
export default function OnboardingBronPage() {
  return (
    <div className="flex flex-1 flex-col">
      <StepHeader title="Koppel je bank">
        Je logt in bij je eigen bank en geeft toestemming om mee te lezen. Wij kunnen nooit geld overmaken.
      </StepHeader>

      <ul className="flex flex-col gap-4 px-5 pt-2" role="list">
        {TRUST.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-[15px] leading-5">
            <Icon size={18} strokeWidth={1.75} className="mt-px shrink-0 text-positive" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <StepFooter>
        <ButtonLink href="/bank/koppelen?next=/onboarding/klaar" size="lg" fullWidth>
          Bank koppelen
        </ButtonLink>
        <Link
          href="/onboarding/klaar"
          className="mt-1 flex min-h-11 items-center justify-center text-sm font-medium text-text-muted"
        >
          Later doen
        </Link>
        <p className="text-center text-[13px] leading-[18px] text-text-muted">Kan later ook, via Instellingen.</p>
      </StepFooter>
    </div>
  );
}
