import type { ShareGroup } from "./groups";

/**
 * Groepen in het geheugen van de browser, zodat het verdeelpaneel ze niet bij elk
 * kaartje opnieuw ophaalt (het paneel krijgt per kaartje een nieuwe key). De
 * groepenpagina wist de cache na opslaan of verwijderen.
 */
let cached: ShareGroup[] | null = null;

export function getCachedGroups(): ShareGroup[] | null {
  return cached;
}

export function setCachedGroups(groups: ShareGroup[]): void {
  cached = groups;
}

export function clearCachedGroups(): void {
  cached = null;
}
