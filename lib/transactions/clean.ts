/**
 * Opschonen van banktekst voor de kaart. De ruwe tekst blijft altijd bewaard
 * (raw_counterparty, raw_description) en is op de kaart op te vragen.
 */

/** Woorden die in hoofdletters blijven bij het normaliseren. */
const KEEP_UPPER = new Set([
  "NS", "ING", "ABN", "AMRO", "SNS", "ASN", "KPN", "HEMA", "IKEA", "NL", "BV", "NV", "VOF", "OV",
  "GVB", "RET", "HTM", "DUO", "UWV", "CJIB", "KLM", "TU", "UVA", "VU", "HU", "HAN", "AH",
]);
const KEEP_LOWER = new Set(["de", "het", "een", "van", "en", "op", "in", "aan", "bij", "te", "'t", "der", "den"]);

/** Betaalverwerkers die voor de echte winkelnaam staan. */
const PROCESSOR_PREFIXES = [
  /^CCV\s*\*\s*/i,
  /^CCV\s+/i,
  /^SUMUP\s*\*\s*/i,
  /^ZETTLE_\*?\s*/i,
  /^ZTL\*\s*/i,
  /^SQ\s*\*\s*/i,
  /^IZ\s*\*\s*/i,
  /^PAY\.?NL\s*\*\s*/i,
  /^PAYPAL\s*\*\s*/i,
  /^GOOGLE\s*\*\s*/i,
  /^APPLE\.COM\/BILL\s*/i,
  /^ADYEN\s*\*\s*/i,
  /^MOLLIE\s*\*\s*/i,
  /^BCK\*\s*/i,
  /^WWW\./i,
];

function titleCase(text: string): string {
  return text
    .split(/(\s+|-|\/)/)
    .map((part, index) => {
      if (/^(\s+|-|\/)$/.test(part) || part === "") return part;
      const upper = part.toUpperCase();
      const alpha = upper.replace(/[^A-Z']/g, "");
      if (KEEP_UPPER.has(alpha)) return alpha + part.slice(alpha.length).toLowerCase();
      const lower = part.toLowerCase();
      if (index > 0 && KEEP_LOWER.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

/**
 * Tegenpartij: betaalverwerker-prefix, filiaalnummers, landcodes en dubbele
 * spaties weg; hoofdletters fatsoeneren. Plaatsnamen blijven staan.
 *
 * "ALBERT HEIJN 1234 AMSTERDAM NLD" -> "Albert Heijn Amsterdam"
 * "CCV*Cafe De Zwart"               -> "Cafe de Zwart"
 */
export function cleanCounterparty(raw: string | null | undefined): string {
  let text = (raw ?? "").trim();
  if (!text) return "Onbekende tegenpartij";

  for (const prefix of PROCESSOR_PREFIXES) text = text.replace(prefix, "");

  text = text
    // filiaal- of terminalnummers: losse getallen van 3 of meer cijfers
    .replace(/\b\d{3,}\b/g, " ")
    // "FIL 12", "#12", "NR 12"
    .replace(/\b(FIL|FILIAAL|NR|STORE|WINKEL)\.?\s*\d+\b/gi, " ")
    .replace(/#\d+/g, " ")
    // landcodes achteraan
    .replace(/\s+(NLD|NL|BEL|DEU|GBR|FRA|ESP|ITA|USA|LUX)\.?$/i, "")
    // rechtsvormen achteraan
    .replace(/\s+(B\.?V\.?|N\.?V\.?|V\.?O\.?F\.?)\.?$/i, "")
    // losse tekens
    .replace(/[*_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!text) return titleCase((raw ?? "").trim()) || "Onbekende tegenpartij";

  // Alleen hoofdletters fatsoeneren als de tekst (bijna) helemaal in kapitalen staat.
  const letters = text.replace(/[^A-Za-z]/g, "");
  const upperRatio = letters ? letters.replace(/[^A-Z]/g, "").length / letters.length : 0;
  return upperRatio > 0.8 ? titleCase(text) : text;
}

/**
 * Omschrijving: pasvolgnummers, transactiecodes, datums, tijden en andere
 * ruis weg. Blijft er niets over, dan null.
 */
export function cleanDescription(raw: string | null | undefined): string | null {
  let text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;

  const noise: RegExp[] = [
    /\b(BEA|GEA|NR|CCV|TRTP|IDEAL|SEPA|GEA\s+NR)\s*[:,]?\s*[A-Z0-9]{4,}\b/gi,
    /\bPasvolgnr\.?:?\s*\d+/gi,
    /\bPas(nr|nummer)\.?:?\s*\d+/gi,
    /\bTerm(inal)?\.?:?\s*[A-Z0-9]+/gi,
    /\bTransactie:?\s*[A-Z0-9]+/gi,
    /\bKenmerk:?\s*[A-Z0-9\-\/]+/gi,
    /\bMachtiging(skenmerk| ID)?:?\s*[A-Z0-9\-\/]+/gi,
    /\bIncassant(\s*ID)?:?\s*[A-Z0-9]+/gi,
    /\bCrediteur(\s*ID)?:?\s*[A-Z0-9]+/gi,
    /\bIBAN:?\s*[A-Z]{2}\d{2}[A-Z0-9]{4,}\s*/gi,
    /\b[A-Z]{2}\d{2}[A-Z]{4}\d{10}\b/g,
    /\bBIC:?\s*[A-Z0-9]{8,11}\b/gi,
    /\b(Valutadatum|Datum\/Tijd|Datum|Boekdatum|Transactiedatum):?\s*\d{1,2}[-./]\d{1,2}[-./]\d{2,4}(\s+\d{1,2}[:.]\d{2}(:\d{2})?)?/gi,
    /\b\d{1,2}[-./]\d{1,2}[-./]\d{2,4}(\/|\s+)\d{1,2}[:.]\d{2}(:\d{2})?\b/g,
    /\b\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?\b/g,
    /\b\d{1,2}[-./]\d{1,2}[-./]\d{2,4}\b/g,
    /\b([01]\d|2[0-3])[:.][0-5]\d(:[0-5]\d)?\b/g,
    /\b(Betaalpas|Apple Pay|Google Pay|Contactloos|Debit card|Card)\b[,:]?/gi,
    /\bOmschrijving:?\s*/gi,
    /\bNaam:?\s*/gi,
    /\bValuta:?\s*EUR\b/gi,
    /\bEUR\b/g,
  ];
  for (const pattern of noise) text = text.replace(pattern, " ");

  text = text
    .replace(/\s*[,;|]+\s*/g, ", ")
    .replace(/(,\s*)+/g, ", ")
    .replace(/^[\s,.:;/-]+|[\s,.:;/-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (text.length < 3) return null;
  // Alleen een herhaling van de tegenpartij of alleen cijfers zegt niets.
  if (/^[\d\s.,-]+$/.test(text)) return null;
  return text;
}

/**
 * Tijd uit de banktekst, als die erin staat.
 * ING:  "Datum/Tijd: 08-10-2026 14:32"  -> "14:32"
 * ABN:  "08.10.26/14.32"                 -> "14:32"
 * Rabo: "2026-10-08 14:32:11"            -> "14:32"
 */
export function extractTime(raw: string | null | undefined): string | null {
  const text = raw ?? "";
  const patterns = [
    /\d{1,2}[-./]\d{1,2}[-./]\d{2,4}\s+([01]?\d|2[0-3])[:.]([0-5]\d)/,
    /\d{1,2}\.\d{1,2}\.\d{2,4}\/([01]?\d|2[0-3])\.([0-5]\d)/,
    /\d{4}-\d{2}-\d{2}[ T]([01]?\d|2[0-3]):([0-5]\d)/,
    /\b([01]\d|2[0-3]):([0-5]\d)\b/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return null;
}
