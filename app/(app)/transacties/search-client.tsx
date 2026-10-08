"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { sanitizeQuery } from "@/lib/transactions/search";
import { cn } from "@/lib/utils";
import { logSearchUsed } from "./actions";

/** Wacht zo lang na de laatste toets voordat we zoeken. */
const DEBOUNCE_MS = 250;

export interface FilterChip {
  /** Waarde in de URL; null = filter uit ("Alles"). */
  value: string | null;
  label: string;
}

interface SearchClientProps {
  /** Wat er in de URL stond, zodat het veld na herladen gevuld is. */
  initialQuery: string;
  /** De opgeschoonde zoekterm waarmee de server zocht, of null. */
  q: string | null;
  maand: string | null;
  potje: string | null;
  monthChips: FilterChip[];
  potjeChips: FilterChip[];
  /** Aantal resultaten van deze zoekopdracht; null als zoeken mislukte. */
  resultCount: number | null;
}

interface Filters {
  q: string | null;
  maand: string | null;
  potje: string | null;
}

function hrefFor({ q, maand, potje }: Filters): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (maand !== null) params.set("maand", maand);
  if (potje) params.set("potje", potje);
  const qs = params.toString();
  return qs ? `/transacties?${qs}` : "/transacties";
}

/** Zoekveld met vertraging en de filterchips (maand en potje). Er staat nooit iets voorgeselecteerd behalve "Alles". */
export function SearchClient({ initialQuery, q, maand, potje, monthChips, potjeChips, resultCount }: SearchClientProps) {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // De laatst gekozen filters; chips en typen kunnen elkaar binnen de vertraging inhalen.
  const filters = useRef<Filters>({ q, maand, potje });
  const lastLogged = useRef<string | null>(null);

  useEffect(() => {
    filters.current = { q, maand, potje };
  }, [q, maand, potje]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Meten dat er gezocht is: één keer per zoekopdracht, alleen een bucket van het aantal.
  useEffect(() => {
    if (q === null || resultCount === null) return;
    const key = `${q}|${maand ?? ""}|${potje ?? ""}`;
    if (lastLogged.current === key) return;
    lastLogged.current = key;
    void logSearchUsed(resultCount);
  }, [q, maand, potje, resultCount]);

  function navigate(next: Partial<Filters>) {
    if (timer.current) clearTimeout(timer.current);
    const merged: Filters = { ...filters.current, ...next };
    filters.current = merged;
    startTransition(() => {
      router.replace(hrefFor(merged), { scroll: false });
    });
  }

  function onType(text: string) {
    setValue(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const clean = sanitizeQuery(text);
      if (clean === filters.current.q) return;
      navigate({ q: clean });
    }, DEBOUNCE_MS);
  }

  function clear() {
    setValue("");
    navigate({ q: null });
    document.getElementById(inputId)?.focus();
  }

  /** Bij een chip ook meteen de getypte tekst meenemen, ook als de vertraging nog loopt. */
  function pick(next: Partial<Filters>) {
    navigate({ q: sanitizeQuery(value), ...next });
  }

  return (
    <div className="flex flex-col gap-1 pt-3">
      <form
        role="search"
        className="px-4"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ q: sanitizeQuery(value) });
          (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Zoeken
        </label>
        <div className="relative">
          <Search size={18} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-muted" />
          <input
            id={inputId}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={100}
            value={value}
            onChange={(e) => onType(e.target.value)}
            placeholder="Zoek op winkel, omschrijving of notitie"
            aria-busy={isPending || undefined}
            className={cn(
              "h-11 w-full rounded-control border bg-surface pr-11 pl-10 text-base text-text",
              "placeholder:text-text-muted",
              "transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none",
              "focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none",
              "[&::-webkit-search-cancel-button]:appearance-none",
            )}
          />
          {isPending ? (
            <span className="absolute top-0 right-0 flex size-11 items-center justify-center text-text-muted" aria-hidden>
              <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" />
            </span>
          ) : (
            value !== "" && (
              <button
                type="button"
                onClick={clear}
                aria-label="Zoekveld leegmaken"
                className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-full text-text-muted hover:text-text"
              >
                <X size={18} aria-hidden />
              </button>
            )
          )}
        </div>
      </form>

      <div
        className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filteren op maand en potje"
      >
        {monthChips.map((chip) => (
          <Chip key={`m-${chip.value ?? "alles"}`} active={maand === chip.value} onClick={() => pick({ maand: chip.value })}>
            {chip.label}
          </Chip>
        ))}
        {potjeChips.length > 0 && <span aria-hidden className="my-3 w-px shrink-0 bg-border" />}
        {potjeChips.map((chip) => (
          <Chip
            key={`p-${chip.value}`}
            active={potje === chip.value}
            // Nog eens tikken op het actieve potje zet het filter weer uit.
            onClick={() => pick({ potje: potje === chip.value ? null : chip.value })}
          >
            {chip.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/** Chip van 32 px hoog in een tikvlak van 44 px. */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group flex h-11 shrink-0 items-center focus-visible:outline-none"
    >
      <span
        className={cn(
          "flex h-8 items-center rounded-full px-3 text-[13px] font-medium whitespace-nowrap",
          "transition-[background-color,color,transform] duration-150 group-active:scale-[0.96] motion-reduce:transition-none motion-reduce:group-active:scale-100",
          "group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-primary",
          active ? "bg-primary text-on-primary" : "bg-surface-muted text-text",
        )}
      >
        {children}
      </span>
    </button>
  );
}
