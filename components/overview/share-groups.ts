/**
 * Pure helpers voor "Nog te krijgen": openstaande delen per persoon.
 * Geen React, geen database.
 */

export interface ShareLike {
  id: string;
  personName: string | null;
  amount: number;
  createdAt: string;
}

export interface PersonGroup<T extends ShareLike> {
  /** Sleutel: naam in kleine letters, of "" voor delen zonder naam. */
  key: string;
  /** Weergavenaam (zoals hij het eerst is ingevuld), of null voor "Zonder naam". */
  name: string | null;
  total: number;
  shares: T[];
}

/** Vanaf zoveel dagen open tonen we de leeftijd van een deel. */
export const SHARE_AGE_VISIBLE_DAYS = 14;

const DAY_MS = 864e5;

/**
 * Groepeert per persoon (hoofdletterongevoelig), grootste totaal eerst.
 * Delen zonder naam staan altijd achteraan, als één groep.
 */
export function groupSharesByPerson<T extends ShareLike>(shares: T[]): PersonGroup<T>[] {
  const groups = new Map<string, PersonGroup<T>>();
  for (const share of shares) {
    const name = share.personName?.trim() || null;
    const key = name ? name.toLocaleLowerCase("nl-NL") : "";
    const group = groups.get(key) ?? { key, name, total: 0, shares: [] };
    group.total = Math.round((group.total + share.amount) * 100) / 100;
    group.shares.push(share);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.key === "" || b.key === "") return a.key === "" ? 1 : -1;
    return b.total - a.total || a.key.localeCompare(b.key, "nl-NL");
  });
}

/** Hele dagen dat een deel openstaat. */
export function shareAgeDays(createdAt: string, nowMs: number): number {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((nowMs - created) / DAY_MS));
}

/** "sinds 23 dagen" vanaf 14 dagen, anders null. */
export function shareAgeLabel(createdAt: string, nowMs: number): string | null {
  const days = shareAgeDays(createdAt, nowMs);
  return days >= SHARE_AGE_VISIBLE_DAYS ? `sinds ${days} dagen` : null;
}

/** "3 delen bij Sam, Noor" of "1 deel bij Sam"; bij meer dan drie namen "en 2 anderen". */
export function sharesSummary(shares: ShareLike[]): string {
  const count = `${shares.length} ${shares.length === 1 ? "deel" : "delen"}`;
  const names = groupSharesByPerson(shares)
    .filter((g) => g.name !== null)
    .map((g) => g.name as string);
  if (names.length === 0) return count;
  if (names.length <= 3) return `${count} bij ${names.join(", ")}`;
  const rest = names.length - 2;
  return `${count} bij ${names.slice(0, 2).join(", ")} en ${rest} ${rest === 1 ? "ander" : "anderen"}`;
}
