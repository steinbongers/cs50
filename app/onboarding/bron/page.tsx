import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { IconBank, IconChevronRight } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Bank koppelen" };

export default function OnboardingBronPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Koppel je bank</h1>
        <p className="mt-1 text-text-muted">
          Je logt in bij je eigen bank en geeft toestemming om transacties te lezen. Wij kunnen
          niets overmaken of wijzigen. Na 90 dagen vraagt je bank opnieuw om toestemming.
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4">
        <Link href="/bank/koppelen?next=/onboarding/klaar" className="block rounded-card">
          <Card className="flex items-center gap-4 transition-colors duration-150 hover:bg-surface-muted">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <IconBank />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Bank koppelen</p>
              <p className="text-sm text-text-muted">ING, Rabobank, ABN AMRO, bunq en meer. Veilig via je eigen bank.</p>
            </div>
            <IconChevronRight className="shrink-0 text-text-muted" size={20} />
          </Card>
        </Link>
      </div>

      <div className="safe-bottom mt-auto px-4 pt-6 pb-5">
        <Link
          href="/onboarding/klaar"
          className="flex min-h-13 items-center justify-center rounded-control bg-primary px-5 text-base font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-strong"
        >
          Nu overslaan
        </Link>
        <p className="mt-3 text-center text-sm text-text-muted">
          Je kunt dit later doen via je profiel.
        </p>
      </div>
    </div>
  );
}
