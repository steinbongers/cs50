import { Hand } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";

export const metadata: Metadata = { title: "Welkom" };

export default async function WelkomPage({ searchParams }: PageProps<"/welkom">) {
  const params = await searchParams;
  const removed = params.verwijderd === "1";
  return (
    <div className="flex flex-col gap-10">
      {removed && (
        <p className="rounded-control bg-positive-soft px-4 py-3 text-sm text-positive" role="status">
          Je account is verwijderd. Alles is weg, zoals beloofd. Bedankt dat je meedeed.
        </p>
      )}
      <div className="flex flex-col gap-4">
        <div
          className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary"
          aria-hidden
        >
          <Hand size={28} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Grip op je geld, <span className="text-primary">met je eigen handen.</span>
        </h1>
        <p className="text-lg text-text-muted">{APP_DESCRIPTION}</p>
        <p className="text-text-muted">
          {APP_NAME} vult niets voor je in en voorspelt niets. Jij tikt elke uitgave zelf in een
          potje. Dat duurt een seconde, en precies die seconde zorgt dat je weet waar je geld heen gaat.
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
