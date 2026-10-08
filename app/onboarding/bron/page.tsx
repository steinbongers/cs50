import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { IconBank, IconUpload } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Transacties toevoegen" };

export default function OnboardingBronPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Hoe wil je je transacties toevoegen?</h1>
        <p className="mt-1 text-text-muted">
          Koppel je bank voor automatische updates, of importeer een CSV-export van je bank.
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4">
        <Card className="flex items-center gap-4 opacity-70" aria-disabled>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <IconBank />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Bank koppelen</p>
            <p className="text-sm text-text-muted">Veilig via je eigen bank. Beschikbaar in fase 3.</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 opacity-70" aria-disabled>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <IconUpload />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">CSV importeren</p>
            <p className="text-sm text-text-muted">ING, Rabobank, ABN AMRO of bunq. Beschikbaar in fase 3.</p>
          </div>
        </Card>
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
