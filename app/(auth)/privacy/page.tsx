import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { APP_NAME, SUPPORT_EMAIL } from "@/config/app";

export const metadata: Metadata = { title: "Privacy" };

/** Korte, begrijpelijke privacytekst (AVG): welke data, waarom, en dat er niets wordt verkocht. */
export default function PrivacyPage() {
  return (
    <AuthShell>
    <article className="flex flex-col gap-5 text-[15px] leading-relaxed">
      <div>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Privacy, in gewone taal</h1>
        <p className="mt-1 text-text-muted">Wat {APP_NAME} van je bewaart, waarom, en wat we er nooit mee doen.</p>
      </div>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Welke gegevens</h2>
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>Je e-mailadres en de naam die je zelf invult.</li>
          <li>Je betalingen: datum, bedrag, naam van de winkel of persoon en de omschrijving, zoals je bank ze meestuurt. Je rekeningnummer bewaren we alleen half afgeschermd.</li>
          <li>De potjes die je maakt en in welk potje je elke betaling stopt.</li>
          <li>Wat je in de app doet (bijvoorbeeld hoe vaak je een stapel wegwerkt), zonder bedragen of winkelnamen. Daarmee meten we of de app werkt.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Waarom</h2>
        <p className="text-text-muted">
          Zonder je betalingen valt er niets in potjes te stoppen. De rest gebruiken we alleen om de app voor jou te laten
          werken en om tijdens de pilot te leren wat beter kan.
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Je bank</h2>
        <p className="text-text-muted">
          De koppeling loopt via Enable Banking, een vergunninghouder onder toezicht van de Finse toezichthouder, zoals de
          Europese regels (PSD2) voorschrijven. Wij kunnen alleen meekijken, nooit geld overmaken. Af en toe vraagt je bank opnieuw om
          toestemming, en je kunt de koppeling altijd zelf stoppen.
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Wat we nooit doen</h2>
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>Je gegevens verkopen of delen met adverteerders.</li>
          <li>Je betalingen automatisch in potjes stoppen of voorspellen wat je gaat doen.</li>
          <li>Je gegevens bewaren nadat je je account hebt verwijderd.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Jouw knoppen</h2>
        <p className="text-text-muted">
          In Instellingen download je al je gegevens of verwijder je je account in één keer. Dan is alles weg, ook bij
          ons.
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="font-semibold">Waar het staat</h2>
        <p className="text-text-muted">
          Je gegevens staan in een database in de Europese Unie (Supabase, regio Frankfurt). De app draait op Vercel. Beide
          verwerken je gegevens alleen in onze opdracht.
        </p>
      </section>

      <p className="text-[13px] leading-[18px] text-text-muted">
        Vragen? Mail naar{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary">
          {SUPPORT_EMAIL}
        </a>
        .{" "}
        <Link href="/welkom" className="inline-flex min-h-11 items-center font-medium text-primary">
          Terug naar het begin
        </Link>
      </p>
    </article>
    </AuthShell>
  );
}
