import type { Metadata } from "next";
import Link from "next/link";
import { capitalize, periodMonthName } from "@/components/overview/overview-copy";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronLeft } from "@/components/ui/icons";
import { ensureProfile, requireUser } from "@/lib/auth";
import { previousPeriods } from "@/lib/insights/compute";
import { amsterdamToday, currentPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { groupByDay, sanitizeQuery, searchTransactions, SEARCH_LIMIT, type SearchResult } from "@/lib/transactions/search";
import { SearchClient, type FilterChip } from "./search-client";
import { TransactionList, type ListCategory } from "./transaction-list";

export const metadata: Metadata = { title: "Alle kaartjes" };

/** Zoveel maanden terug (naast de lopende) kun je kiezen; gelijk aan Overzicht. */
const MAX_BACK = 3;
/** Zonder zoekterm en zonder filters: de nieuwste zoveel. */
const DEFAULT_LIMIT = 50;

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TransactiesPage({ searchParams }: PageProps<"/transacties">) {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();
  const params = await searchParams;
  const today = amsterdamToday();

  // Zoekterm: alleen geldig vanaf twee tekens (na opschonen).
  const typed = (first(params.q) ?? "").slice(0, 100);
  const q = sanitizeQuery(typed);

  // Maand: 0 = lopend, 1..3 terug; leeg = alles binnen die vier maanden.
  const maandRaw = first(params.maand);
  const maandNum = Number(maandRaw);
  const maand = maandRaw !== undefined && maandRaw !== "" && Number.isInteger(maandNum) && maandNum >= 0 && maandNum <= MAX_BACK ? maandNum : null;

  const current = currentPeriod(profile.salary_day, today);
  const periods = [current, ...previousPeriods(profile.salary_day, today, MAX_BACK)];
  const range =
    maand === null
      ? { from: periods[MAX_BACK].startISO, to: current.endISO }
      : { from: periods[maand].startISO, to: periods[maand].endISO };

  const { data: categoryRows } = await supabase
    .from("categories")
    .select("id, name, icon, color, system_key, archived")
    .order("sort_order", { ascending: true });
  const categories: ListCategory[] = (categoryRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    isSystem: c.system_key !== null,
    archived: c.archived,
  }));

  const potjeRaw = first(params.potje);
  const potje = isUuid(potjeRaw) && categories.some((c) => c.id === potjeRaw) ? potjeRaw : null;
  const hasFilters = q !== null || potje !== null || maand !== null;
  const limit = hasFilters ? SEARCH_LIMIT : DEFAULT_LIMIT;

  let results: SearchResult[] = [];
  let failed = false;
  try {
    results = await searchTransactions(supabase, { q, categoryId: potje, ...range, limit });
  } catch {
    failed = true;
  }

  const monthChips: FilterChip[] = [
    { value: null, label: "Alles" },
    ...periods.map((p, i) => ({ value: String(i), label: capitalize(periodMonthName(p)) })),
  ];
  // Gearchiveerde potjes alleen als je er al op filterde (bijvoorbeeld via een oude link).
  const potjeChips: FilterChip[] = categories
    .filter((c) => !c.archived || c.id === potje)
    .map((c) => ({ value: c.id, label: c.name }));

  const groups = groupByDay(results);

  return (
    <>
      <header className="safe-top-2 px-4">
        <div className="flex items-center gap-1">
          <Link
            href="/overzicht"
            aria-label="Terug naar Overzicht"
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text transition-colors duration-150 hover:bg-surface-muted"
          >
            <IconChevronLeft size={22} />
          </Link>
          <h1 className="truncate text-[22px] leading-7 font-semibold">Alle kaartjes</h1>
        </div>
      </header>

      <SearchClient
        initialQuery={typed}
        q={q}
        maand={maand === null ? null : String(maand)}
        potje={potje}
        monthChips={monthChips}
        potjeChips={potjeChips}
        resultCount={failed ? null : results.length}
      />

      {failed ? (
        <div className="px-4 pt-4">
          <Card padding="none">
            <EmptyState title="Zoeken lukte nu niet" description="Probeer het zo nog eens. Je gegevens zijn veilig." />
          </Card>
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 pt-4">
          <Card padding="none">
            {q !== null ? (
              <EmptyState title={`Niets gevonden voor ‘${q}’`} description="Probeer een deel van de naam." />
            ) : hasFilters ? (
              <EmptyState title="Hier staat niets" description="Kies een andere maand of een ander potje." />
            ) : (
              <EmptyState title="Nog geen betalingen" description="Zodra je bank iets stuurt, vind je het hier terug." />
            )}
          </Card>
        </div>
      ) : (
        <>
          <TransactionList groups={groups} categories={categories} />
          {results.length >= limit && (
            <p className="px-4 pt-3 text-center text-[13px] text-text-muted">
              {hasFilters
                ? `Je ziet de nieuwste ${limit}. Zoek specifieker voor oudere.`
                : "Je ziet de nieuwste 50. Zoek of kies een maand voor meer."}
            </p>
          )}
        </>
      )}
    </>
  );
}
