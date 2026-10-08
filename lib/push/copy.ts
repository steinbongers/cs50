/** Speelse meldingsteksten. Afwisseling op basis van de dag, zodat het niet gaat vervelen. */
export function openCardsMessage(count: number, dayIndex: number): { title: string; body: string } {
  if (count === 1) {
    return { title: "Eén kaartje wacht op jou", body: "Tien seconden werk. Daarna is je stapel weer leeg." };
  }
  const variants = [
    { title: `${count} kaartjes wachten op jou`, body: "Twee minuten werk, dan weet je weer precies waar je geld heen ging." },
    { title: `Er liggen ${count} kaartjes klaar`, body: "Even swipen voor het slapengaan? Je toekomstige ik is er blij mee." },
    { title: `${count} transacties zoeken een potje`, body: "Kort momentje van aandacht voor je geld. Dat is alles." },
  ];
  return variants[Math.abs(dayIndex) % variants.length];
}

export function monthReviewMessage(): { title: string; body: string } {
  return { title: "Jouw maand staat klaar", body: "Nieuwe periode, nieuw salaris. Kijk even terug op de afgelopen maand." };
}

export function expiringMessage(days: number): { title: string; body: string } {
  return {
    title: days <= 0 ? "Je bankkoppeling is verlopen" : `Je bankkoppeling verloopt over ${days} ${days === 1 ? "dag" : "dagen"}`,
    body: "Koppel opnieuw, dan blijven je transacties binnenkomen. Je oude data blijft gewoon staan.",
  };
}
