import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { cardKind, parseCardChoices } from "@/lib/native/wallet-card";
import { createClient } from "@/lib/supabase/server";
import { WalletCards } from "./cards";
import { ApplePayStatus } from "./status";

export const metadata: Metadata = { title: "Apple Pay instellen" };

/** Naam van een knop of veld in Opdrachten: vet en letterlijk. */
function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-text">{children}</strong>;
}

/** Per stap: de titel is de ene tik die telt, eronder hooguit één korte zin. */
const STEPS: { key: string; title: ReactNode; text: ReactNode }[] = [
  {
    key: "open",
    title: (
      <>
        Open <B>Opdrachten</B>
      </>
    ),
    text: (
      <>
        Tik op <B>Automatisering</B> en dan op <B>+</B>.
      </>
    ),
  },
  {
    key: "transactie",
    title: (
      <>
        Kies <B>Transactie</B>
      </>
    ),
    text: "Die staat onderaan de lijst.",
  },
  {
    key: "kaart",
    title: "Vink je kaart aan",
    text: (
      <>
        Kies <B>Voer direct uit</B>, zet <B>Meld bij uitvoeren</B> uit en tik op <B>Volgende</B>.
      </>
    ),
  },
  {
    key: "actie",
    title: (
      <>
        Tik op <B>Nieuwe lege automatisering</B>
      </>
    ),
    text: (
      <>
        Zoek <B>Betaling indelen</B> en tik erop.
      </>
    ),
  },
  {
    key: "velden",
    title: "Vul de drie velden",
    text: (
      <>
        Tik op een veld, kies <B>Invoer opdracht</B> en dan de naam hieronder.
        <span className="mt-1 flex flex-col">
          <span>
            <B>Winkel</B> wordt Winkel
          </span>
          <span>
            <B>Bedrag</B> wordt Bedrag
          </span>
          <span>
            <B>Kaart</B> (achter het pijltje) wordt Kaart of pas
          </span>
        </span>
      </>
    ),
  },
  {
    key: "gereed",
    title: (
      <>
        Tik op <B>Gereed</B>
      </>
    ),
    text: "Bij je volgende betaling krijg je een melding.",
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
          Krijg meteen na het betalen een melding. Je stelt dit één keer in.
        </p>

        <ApplePayStatus />

        <Card padding="none" className="overflow-hidden">
          <ol>
            {STEPS.map((step, index) => (
              <li key={step.key} className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0">
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
          <p>We krijgen alleen winkel, bedrag en kaartnaam, geen kaartnummer.</p>
          <p>Stoppen? Verwijder de automatisering in Opdrachten.</p>
        </div>
      </div>
    </>
  );
}
