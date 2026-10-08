import "server-only";

/** Supabase (PostgREST) geeft standaard hoogstens 1000 rijen per verzoek. */
const PAGE_SIZE = 1000;
/** Vangnet tegen een onbedoeld eindeloze lus. */
const MAX_ROWS = 100_000;

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * Haalt alle rijen op door in blokken van 1000 te pagineren.
 * `page(from, to)` moet de query met `.range(from, to)` teruggeven, met een vaste
 * sortering (bijvoorbeeld op id), anders kunnen rijen dubbel of niet meekomen.
 */
export async function fetchAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("Gegevens konden niet worden geladen.");
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
  }
  return rows;
}
