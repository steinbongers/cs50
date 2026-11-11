import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { APP_NAME } from "@/config/app";
import { requireUser } from "@/lib/auth";
import { cardKind, parseCardChoices } from "@/lib/native/wallet-card";
import { createClient } from "@/lib/supabase/server";
import { WalletCards } from "./cards";
import { ApplePayStatus } from "./status";

export const metadata: Metadata = { title: "Apple Pay instellen" };

const STEPS: { title: string; text: string }[] = [
  {
    title: "Open de app Opdrachten",
    text: "Die staat standaard op je iPhone. Tik onderin op Automatisering en dan rechtsboven op het plusje.",
  },
  {
    title: "Kies Transactie",
    text: "Scrol naar beneden tot je Transactie ziet (met het Wallet-icoon). Staat hij er niet, dan heeft je iPhone iOS 17 of nieuwer nodig.",
  },
  {
    title: "Kies je kaarten en Voer direct uit",
    text: "Vink je bankpas aan, en je creditcard als je die met Apple Pay gebruikt. Laat alle categorieën aan staan. Kies Voer direct uit en zet Meld bij uitvoeren uit. Tik op Volgende.",
  },
  {
    title: "Kies de actie Betaling indelen",
    text: `Tik op Nieuwe lege automatisering en zoek op "Betaling indelen". De actie hoort bij ${APP_NAME}.`,
  },
  {
    title: "Vul Winkel, Bedrag en Kaart in",
    text: "Tik in de actie op Winkel, kies Invoer opdracht en daarna Winkel. Doe hetzelfde bij Bedrag. Tik op het pijltje in de actie voor het veld Kaart en kies daar Kaart of pas.",
  },
  {
    title: "Tik op Gereed",
    text: "Klaar. Bij je volgende betaling met Apple Pay krijg je binnen een paar seconden een melding.",
  },
];

export default async function ApplePayPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: seen }, { data: profile }] = await Promise.all([
    supabase.from("transactions").select("wallet_card").eq("user_id", user.id).not("wallet_card", "is", null).limit(2000),
    supabase.from("profiles").select("wallet_cards").eq("id", user.id).maybeSingle(),
  ]);
  const choices = parseCardChoices(profile?.wallet_cards);
  const names = [...new Set([...Object.keys(choices), ...(seen ?? []).flatMap((r) => (r.wallet_card ? [r.wallet_card] : []))])].sort();
  const cards = names.map((name) => ({ name, credit: cardKind(name, choices) === "credit" }));
  return (
    <>
      <PageHeader title="Apple Pay instellen" backHref="/instellingen" />
      <div className="flex flex-col gap-4 px-4 pb-8">
        <p className="px-1 text-[15px] leading-[22px] text-text-muted">
          Je bank geeft een betaling pas na uren door. Met Apple Pay kan het meteen: je iPhone vertelt de app na elke
          betaling de winkel en het bedrag, en je krijgt een melding om hem in een potje te zetten. Je stelt dit één keer in.
        </p>

        <ApplePayStatus />

        <Card padding="none" className="overflow-hidden">
          <ol>
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary"
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium leading-5 text-text">{step.title}</span>
                  <span className="mt-0.5 block text-[14px] leading-5 text-text-muted">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <WalletCards cards={cards} />

        <div className="flex flex-col gap-2 px-1 text-[13px] leading-[18px] text-text-muted">
          <p>
            Wat de app krijgt: de winkel, het bedrag en de naam van de kaart zoals die in Wallet staat. Geen kaartnummer. De namen van de knoppen in Opdrachten
            kunnen per iOS-versie iets verschillen.
          </p>
          <p>
            Dit werkt alleen voor betalingen met Apple Pay. Pin je met je pasje of betaal je met iDEAL, dan komt de
            betaling via je bank binnen, een paar keer per dag. Komt dezelfde betaling ook via de bank, dan voegt de app
            ze samen: je ziet hem één keer.
          </p>
          <p>
            Betaal je met een creditcard, dan schrijft je bank één keer per maand het totaal af. Op dat kaartje staat dan
            hoeveel je al via Apple Pay hebt ingedeeld. Eén tik haalt dat eraf, zodat niets dubbel telt.
          </p>
          <p>
            Stoppen? Verwijder de automatisering in Opdrachten (veeg hem naar links), of zet Melding na elke betaling uit
            in Instellingen.
          </p>
        </div>
      </div>
    </>
  );
}
