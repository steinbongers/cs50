import { Hand } from "lucide-react";
import type { Metadata } from "next";
import { AppleButton } from "@/components/auth/apple-button";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Welkom" };

export default async function WelkomPage({ searchParams }: PageProps<"/welkom">) {
  const params = await searchParams;
  const removed = params.verwijderd === "1";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center gap-5 px-6 pt-10 pb-8">
        {removed && (
          <p className="rounded-control bg-positive-soft px-4 py-3 text-[13px] leading-[18px] text-positive" role="status">
            Je account is verwijderd. Alles is weg, zoals beloofd. Bedankt dat je meedeed.
          </p>
        )}
        <div
          className="flex size-16 items-center justify-center rounded-[18px] bg-primary text-on-primary"
          aria-hidden
        >
          <Hand size={30} strokeWidth={1.75} />
        </div>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Grip op je geld, met je eigen handen</h1>
        <p className="text-[17px] leading-[22px] text-text-muted">
          Jij beslist waar elk bedrag hoort. Wij vullen niets in. Eén tik per betaling.
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <ButtonLink href="/registreren" size="lg" fullWidth>
          Beginnen
        </ButtonLink>
        {/* Werkt voor nieuwe én bestaande accounts, dus geen 'Inloggen'. */}
        <AppleButton next="/" label="Doorgaan met Apple" />
        <ButtonLink href="/login" variant="ghost" size="lg" fullWidth>
          Ik heb al een account
        </ButtonLink>
      </div>
    </div>
  );
}
