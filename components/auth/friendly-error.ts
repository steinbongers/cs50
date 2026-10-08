/**
 * Maakt de foutmeldingen uit app/auth/actions.ts (Supabase) wat menselijker.
 * Onbekende meldingen gaan ongewijzigd door.
 */
const FRIENDLY: Array<[match: string, text: string]> = [
  ["e-mailadres of wachtwoord klopt niet", "Dat e-mailadres of wachtwoord klopt niet. Probeer het nog een keer."],
  ["bevestig eerst je e-mailadres", "Je moet eerst je e-mailadres bevestigen. Tik op de link in je mail."],
  ["er bestaat al een account", "Met dit e-mailadres heb je al een account. Log gewoon in."],
  ["even geduld", "Even te vaak geprobeerd. Wacht een minuutje en probeer het opnieuw."],
  ["registreren is op dit moment niet mogelijk", "Registreren kan nu even niet. Probeer het later nog eens."],
  ["vul een geldig e-mailadres in", "Dat e-mailadres lijkt niet te kloppen."],
  ["dit e-mailadres lijkt niet te kloppen", "Dat e-mailadres lijkt niet te kloppen."],
  ["vul je wachtwoord in", "Vul je wachtwoord nog even in."],
  ["wachtwoord van minimaal", "Kies een wachtwoord van minstens 8 tekens."],
  ["wachtwoord moet minimaal", "Kies een wachtwoord van minstens 8 tekens."],
  ["vul je uitnodigingscode in", "Vul de code uit je uitnodiging in."],
  ["uitnodigingscode is niet geldig", "Die code klopt niet of is al gebruikt. Kijk nog even in je uitnodiging."],
  ["inloggen met apple is nu niet beschikbaar", "Inloggen met Apple lukt nu even niet. Probeer het zo nog eens."],
  ["er ging iets mis", "Dat ging even mis. Probeer het nog een keer."],
];

export function friendlyAuthError(message: string | null | undefined): string | undefined {
  if (!message) return undefined;
  const m = message.toLowerCase();
  for (const [match, text] of FRIENDLY) {
    if (m.includes(match)) return text;
  }
  return message;
}
