import { ACTION_VERB } from "@/config/app";

/**
 * Meldingsteksten. Titel hoogstens 40 tekens, tekst hoogstens 90.
 * Nooit bedragen of winkelnamen (het vergrendelscherm is openbaar) en geen uitroeptekens.
 */
export type PushCopy = { title: string; body: string };

/**
 * Kaartjes wachten. Afwisseling op basis van de dag, zodat het niet gaat vervelen.
 * Nooit schuldgevoel: geen "je bent vergeten" of "je reeks gaat verloren".
 * Bij een grote stapel: een paar is genoeg, de rest kan morgen.
 */
export function openCardsMessage(count: number, dayIndex: number): PushCopy {
  const pick = <T,>(list: T[]) => list[Math.abs(Math.trunc(dayIndex)) % list.length];
  if (count === 1) {
    return pick([
      { title: "Eén kaartje wacht op je", body: "Tien seconden werk. Dan is je stapel leeg." },
      { title: "Nog één kaartje", body: "Eén tik en je bent bij voor vandaag." },
      { title: "Er ligt één kaartje klaar", body: "Snel even in een potje? Meer is het niet." },
    ]);
  }
  if (count > 15) {
    return pick([
      { title: `${count} kaartjes, geen haast`, body: "Doe er een paar, de rest kan morgen ook nog." },
      { title: "Je stapel is wat gegroeid", body: "Vijf kaartjes is al mooi. De rest loopt niet weg." },
      { title: `Er liggen ${count} kaartjes klaar`, body: "Begin met de bovenste paar. Elke tik telt mee." },
    ]);
  }
  return pick([
    { title: `${count} kaartjes wachten op je`, body: "Twee minuten werk, dan weet je weer waar je geld heen ging." },
    { title: `Er liggen ${count} kaartjes klaar`, body: `Even ${ACTION_VERB}? Daarna is je avond weer van jou.` },
    { title: `${count} kaartjes zoeken een potje`, body: "Kort momentje voor je geld. Meer is het niet." },
    { title: "Je dag in potjes", body: `${count} kaartjes staan klaar. Even kijken waar het heen ging?` },
    { title: `${count} kaartjes, even tijd?`, body: "Lukt het vandaag niet, dan is dat ook prima. Ze wachten wel." },
  ]);
}

/** Jouw maand op de salarisdag. */
export function monthReviewMessage(): PushCopy {
  return { title: "Jouw maand staat klaar", body: "Een nieuwe maand begint. Zin om even terug te kijken?" };
}

/** Bankkoppeling verloopt binnenkort (days > 0) of is verlopen (days <= 0). */
export function expiringMessage(days: number): PushCopy {
  if (days <= 0) {
    return {
      title: "Je bankkoppeling is verlopen",
      body: "Koppel opnieuw, dan komen je kaartjes weer binnen. Alles wat er al is, blijft staan.",
    };
  }
  return {
    title: `Je bankkoppeling verloopt over ${days} ${days === 1 ? "dag" : "dagen"}`,
    body: "Koppel even opnieuw, dan blijven je kaartjes komen. Duurt een minuut.",
  };
}
