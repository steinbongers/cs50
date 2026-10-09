/**
 * Vaste groepen om mee te delen ("Huisgenoten"). Puur rekenwerk en controles,
 * zodat server, UI en tests dezelfde regels gebruiken. Een groep bevat alleen
 * de namen van de anderen; jij telt niet mee.
 */
export const MAX_GROUP_NAME_LENGTH = 40;
export const MAX_MEMBER_NAME_LENGTH = 60;
export const MIN_GROUP_MEMBERS = 1;
/** Plus jijzelf is dat 12 personen, ruim binnen MAX_SPLIT_PERSONS. */
export const MAX_GROUP_MEMBERS = 11;
export const MAX_GROUPS = 20;

export interface ShareGroup {
  id: string;
  name: string;
  members: string[];
}

export type GroupInput = { ok: true; name: string; members: string[] } | { ok: false; error: string };

/** Sleutel om namen te vergelijken: zonder hoofdletters en dubbele spaties. */
export function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl");
}

/** Eén naam opschonen: spaties weg aan de randen, dubbele spaties enkel, maximaal 60 tekens. */
export function cleanName(name: string, max = MAX_MEMBER_NAME_LENGTH): string {
  return name.trim().replace(/\s+/g, " ").slice(0, max).trim();
}

/** Lege namen eruit, dubbele (ook met andere hoofdletters) eruit; de eerste schrijfwijze blijft. */
export function cleanMembers(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const name = cleanName(raw);
    const key = nameKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Controleert naam en leden van een groep en geeft de opgeschoonde versie terug. */
export function validateGroup(name: unknown, members: unknown): GroupInput {
  const cleanGroupName = typeof name === "string" ? cleanName(name, MAX_GROUP_NAME_LENGTH) : "";
  if (!cleanGroupName) return { ok: false, error: "Geef de groep een naam." };
  const list = cleanMembers(members);
  if (list.length < MIN_GROUP_MEMBERS) return { ok: false, error: "Zet minstens één naam in de groep." };
  if (list.length > MAX_GROUP_MEMBERS) return { ok: false, error: `Een groep heeft maximaal ${MAX_GROUP_MEMBERS} namen.` };
  return { ok: true, name: cleanGroupName, members: list };
}

/** Dezelfde mensen, ongeacht volgorde en hoofdletters. */
export function sameMembers(a: string[], b: string[]): boolean {
  const left = new Set(a.map(nameKey).filter(Boolean));
  const right = new Set(b.map(nameKey).filter(Boolean));
  return left.size === right.size && [...left].every((k) => right.has(k));
}

/**
 * Mag "Bewaar als groep" verschijnen? Alleen als er zelf namen zijn ingevuld,
 * het er niet te veel zijn en er nog geen groep met precies deze mensen is.
 */
export function canSaveAsGroup(names: string[], groups: Pick<ShareGroup, "members">[]): boolean {
  const list = cleanMembers(names);
  if (list.length < MIN_GROUP_MEMBERS || list.length > MAX_GROUP_MEMBERS) return false;
  return !groups.some((g) => sameMembers(g.members, list));
}

export interface MemberTotal {
  name: string;
  /** Openstaand bedrag, positief, op hele centen. */
  total: number;
  count: number;
}

/**
 * Per lid wat er nog openstaat: delen met status 'open' waarvan de naam
 * (zonder hoofdletters) gelijk is aan het lid. Leden zonder open delen staan
 * er met 0 in, zodat de volgorde van de groep blijft.
 */
export function openTotalsByMember(
  members: string[],
  shares: { person_name: string | null; amount: number }[],
): MemberTotal[] {
  const cents = new Map<string, { cents: number; count: number }>();
  for (const share of shares) {
    if (!share.person_name) continue;
    const key = nameKey(share.person_name);
    const entry = cents.get(key) ?? { cents: 0, count: 0 };
    entry.cents += Math.round(Math.abs(share.amount) * 100);
    entry.count += 1;
    cents.set(key, entry);
  }
  return members.map((name) => {
    const entry = cents.get(nameKey(name));
    return { name, total: (entry?.cents ?? 0) / 100, count: entry?.count ?? 0 };
  });
}
