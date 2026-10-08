import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/config/app";

export const metadata: Metadata = { title: "Privacy" };

/** Korte, begrijpelijke privacytekst (AVG): welke data, waarom, en dat er niets wordt verkocht. */
export default function PrivacyPage() {
  return (
    <article className="flex flex-col gap-5 text-[15px] leading-relaxed">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Privacy, in gewone taal</h1>
        <p className="mt-1 text-text-muted">Wat {APP_NAME} van je bewaart, waarom, en wat we er nooit mee doen.</p>
      </div>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Welke gegevens</h2>
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>Je e-mailadres en de naam die je zelf invult.</li>
          <li>Je banktransacties: datum, bedrag, tegenpartij en omschrijving, zoals je bank ze meestuurt. Je IBAN bewaren we alleen gemaskeerd.</li>
          <li>De potjes die je maakt en in welk potje je elke transactie stopt.</li>
          <li>Wat je in de app doet (bijvoorbeeld hoe vaak je een stapel wegwerkt), zonder bedragen of winkelnamen. Daarmee meten we of de app werkt.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Waarom</h2>
        <p className="text-text-muted">
          Zonder je transacties valt er niets in potjes te stoppen. De rest gebruiken we alleen om de app voor jou te laten
          werken en om tijdens de pilot te leren wat beter kan.
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Je bank</h2>
        <p className="text-text-muted">
          De koppeling loopt via Enable Banking, een vergunninghouder onder toezicht van de Finse toezichthouder, zoals de
          Europese regels (PSD2) voorschrijven. Wij kunnen alleen lezen, nooit overmaken. Je bank vraagt elke 90 dagen opnieuw
          om toestemming en je kunt de koppeling altijd zelf stoppen.
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Wat we nooit doen</h2>
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>Je gegevens verkopen of delen met adverteerders.</li>
          <li>Je transacties automatisch in potjes stoppen of voorspellen wat je gaat doen.</li>
          <li>Je gegevens bewaren nadat je je account hebt verwijderd.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Jouw knoppen</h2>
        <p className="text-text-muted">
          In je profiel kun je al je gegevens downloaden als CSV en je account in één keer definitief verwijderen. Dan is
          alles weg, ook bij ons.
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Waar het staat</h2>
        <p className="text-text-muted">
          Je gegevens staan in een database in de Europese Unie (Supabase, regio Frankfurt). De app draait op Vercel. Beide
          verwerken je gegevens alleen in onze opdracht.
        </p>
      </section>

      <p className="text-sm text-text-muted">
        Vragen? Mail naar het adres dat je bij de uitnodiging kreeg.{" "}
        <Link href="/welkom" className="font-medium text-primary">
          Terug naar het begin
        </Link>
      </p>
    </article>
  );
}
