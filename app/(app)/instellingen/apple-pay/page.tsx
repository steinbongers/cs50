import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { APP_NAME } from "@/config/app";
import { requireUser } from "@/lib/auth";
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
    title: "Kies je kaart en Voer direct uit",
    text: "Vink de kaart aan waarmee je met Apple Pay betaalt. Laat alle categorieën aan staan. Kies Voer direct uit en zet Meld bij uitvoeren uit. Tik op Volgende.",
  },
  {
    title: "Kies de actie Betaling indelen",
    text: `Tik op Nieuwe lege automatisering en zoek op "Betaling indelen". De actie hoort bij ${APP_NAME}.`,
  },
  {
    title: "Vul Winkel en Bedrag in",
    text: "Tik in de actie op Winkel, kies Invoer opdracht en daarna Winkel. Doe hetzelfde bij Bedrag en kies daar Bedrag.",
  },
  {
    title: "Tik op Gereed",
    text: "Klaar. Bij je volgende betaling met Apple Pay krijg je binnen een paar seconden een melding.",
  },
];

export default async function ApplePayPage() {
  await requireUser();
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

        <div className="flex flex-col gap-2 px-1 text-[13px] leading-[18px] text-text-muted">
          <p>
            Wat de app krijgt: alleen de winkel en het bedrag. Geen kaartnummer. De namen van de knoppen in Opdrachten
            kunnen per iOS-versie iets verschillen.
          </p>
          <p>
            Dit werkt alleen voor betalingen met Apple Pay. Pin je met je pasje of betaal je met iDEAL, dan komt de
            betaling via je bank binnen, een paar keer per dag. Komt dezelfde betaling ook via de bank, dan voegt de app
            ze samen: je ziet hem één keer.
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
