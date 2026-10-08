import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";

export const metadata: Metadata = { title: "Welkom" };

export default function WelkomPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div
          className="flex size-16 items-center justify-center rounded-card bg-primary-soft text-3xl"
          aria-hidden
        >
          👋
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Grip op je geld, <span className="text-primary">met je eigen handen.</span>
        </h1>
        <p className="text-lg text-text-muted">{APP_DESCRIPTION}</p>
        <p className="text-text-muted">
          {APP_NAME} vult niets voor je in. Door elke uitgave zelf een plek te geven, sta je even
          stil bij waar je geld heen gaat. Dat korte moment is precies wat werkt.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <ButtonLink href="/registreren" size="lg" fullWidth>
          Beginnen
        </ButtonLink>
        <ButtonLink href="/login" variant="ghost" size="lg" fullWidth>
          Ik heb al een account
        </ButtonLink>
      </div>
    </div>
  );
}
