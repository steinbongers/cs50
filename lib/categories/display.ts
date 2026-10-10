/**
 * Weergave van potjesnamen op de kleine tegels (11 px, ±73 px breed).
 *
 * Chromium heeft geen Nederlands afbreekwoordenboek, dus `hyphens-auto` breekt lange woorden
 * daar midden in een woord zonder streepje ('Boodschappe / n'). Daarom zetten we zelf zachte
 * afbreekstreepjes (U+00AD) in de lange woorden uit de standaardset en de vaste tegels, en
 * gebruiken de tegels `hyphens-manual`. De naam zelf in de database verandert niet.
 */
const SHY = "\u00AD";

/** Lange woorden met hun lettergrepen. Sleutels in kleine letters. */
const SYLLABLES: Record<string, string[]> = {
  boodschappen: ["Bood", "schap", "pen"],
  abonnementen: ["Abon", "ne", "men", "ten"],
  verzekeringen: ["ver", "ze", "ke", "rin", "gen"],
  verzorging: ["ver", "zor", "ging"],
  terugbetaling: ["Terug", "be", "ta", "ling"],
  voorgeschoten: ["Voor", "ge", "scho", "ten"],
  beleggen: ["be", "leg", "gen"],
  vakantie: ["Va", "kan", "tie"],
  kinderen: ["Kin", "de", "ren"],
  huisdier: ["Huis", "dier"],
};

function hyphenateWord(word: string): string {
  const parts = SYLLABLES[word.toLocaleLowerCase("nl-NL")];
  if (!parts) return word;
  // Behoud de hoofdletters van het origineel; alleen de streepjes komen erbij.
  let index = 0;
  return parts
    .map((part) => {
      const piece = word.slice(index, index + part.length);
      index += part.length;
      return piece;
    })
    .join(SHY);
}

/**
 * Ruwe breedte van een woord in em bij Inter medium. Smalle letters tellen minder, brede meer.
 * Genoeg om te zien of een woord op één tegelregel past; niet bedoeld als exacte meting.
 */
function estimateEm(word: string): number {
  let em = 0;
  for (const ch of word) {
    if ("ijlftrI".includes(ch)) em += 0.3;
    else if ("mwMW".includes(ch)) em += 0.85;
    else if (ch !== ch.toLocaleLowerCase("nl-NL")) em += 0.7;
    else em += 0.57;
  }
  return em;
}

/** Een tegelregel is ±73 px bij 11 px tekst: ruim 6,6 em. */
const LINE_EM = 6.65;

/**
 * Potjesnaam met zachte afbreekstreepjes voor de tegels. Onbekende woorden blijven gelijk.
 *
 * Regel: bij meer woorden breekt de browser eerst op spaties. Een zacht streepje zou hem
 * anders verleiden de eerste regel vol te maken ('Zorg & verze- / keringen'). Daarom krijgt
 * een woord in een naam van meer woorden alleen streepjes als het zelf niet op één regel past.
 * Een naam van één woord krijgt ze altijd; de browser gebruikt ze dan alleen als het moet.
 */
export function tileName(name: string): string {
  const singleWord = !/\s/.test(name.trim());
  return name.replace(/[\p{L}]+/gu, (word) =>
    singleWord || estimateEm(word) > LINE_EM ? hyphenateWord(word) : word,
  );
}

