"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { fetchPreviousMonth, saveFixedItems } from "@/app/bank/actions";
import { EuroInput } from "@/components/cash/euro-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { formatEuro } from "@/lib/format";
import { fixedTotals, type Direction, type FixedItem, type MonthGroup } from "@/lib/insights/fixed-month";
import { counterpartyKey } from "@/lib/transactions/same-counterparty";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  direction: Direction;
  key: string;
  name: string;
  amount: number;
  /** "2 keer", of leeg voor een post die je zelf toevoegde. */
  detail: string;
}

const idOf = (direction: Direction, key: string) => `${direction}:${key}`;
/** Zoveel regels per lijst, tot je "Toon alles" tikt. */
const SHOWN = 12;

export interface FixedPickerProps {
  /** De lopende salarismaand tot nu toe (of de vorige, als de lopende net begon), per verkoper. */
  groups: MonthGroup[];
  /** Wat eerder is opgeslagen. */
  saved: FixedItem[];
  /** "20 oktober tot vandaag". Staat niet meer in beeld; blijft voor de bestaande aanroepen. */
  periodText: string;
  hasBank: boolean;
  /** Waar je na opslaan heen gaat. */
  next: string;
  saveLabel: string;
  /** Tekstknop om over te slaan (alleen in de onboarding). */
  skipLabel?: string;
}

/**
 * Je vaste maand: tik aan wat elke maand terugkomt. Niets staat vooraf aan; wat er het meest
 * als vast uitziet staat alleen bovenaan. Onderaan loopt mee wat er per maand over blijft.
 */
export function FixedPicker({ groups, saved, hasBank, next, saveLabel, skipLabel }: FixedPickerProps) {
  const router = useRouter();
  const [extra, setExtra] = useState<Row[]>(() => {
    // Eerder opgeslagen posten die niet in de vorige maand zitten (zelf toegevoegd, of een oudere maand).
    const inMonth = new Set(groups.map((g) => idOf(g.direction, g.key)));
    return saved
      .filter((s) => !inMonth.has(idOf(s.direction, s.key)))
      .map((s) => ({ id: idOf(s.direction, s.key), direction: s.direction, key: s.key, name: s.name, amount: s.amount, detail: "" }));
  });
  const [selected, setSelected] = useState<Set<string>>(() => new Set(saved.map((s) => idOf(s.direction, s.key))));
  const [showAll, setShowAll] = useState<Record<Direction, boolean>>({ uit: false, in: false });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ direction: Direction; name: string; amount: string }>({ direction: "uit", name: "", amount: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [fetching, startFetch] = useTransition();

  const rows = useMemo<Row[]>(() => {
    const savedAmount = new Map(saved.map((s) => [idOf(s.direction, s.key), s.amount]));
    const fromMonth = groups.map((g) => {
      const id = idOf(g.direction, g.key);
      return {
        id,
        direction: g.direction,
        key: g.key,
        name: g.name,
        // Een eerder opgeslagen bedrag gaat voor het totaal van die ene maand.
        amount: savedAmount.get(id) ?? g.total,
        detail: g.count === 1 ? "1 keer" : `${g.count} keer`,
      };
    });
    return [...extra, ...fromMonth];
  }, [groups, saved, extra]);

  const chosen = rows.filter((r) => selected.has(r.id));
  const totals = fixedTotals(chosen);

  function toggle(id: string) {
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  }

  function addOwn() {
    const name = draft.name.replace(/\s+/g, " ").trim();
    const amount = Number(draft.amount.replace(/\./g, "").replace(",", "."));
    const key = counterpartyKey(name);
    if (!key || !Number.isFinite(amount) || amount <= 0) {
      setError("Vul een naam en een bedrag boven € 0 in.");
      return;
    }
    const id = idOf(draft.direction, key);
    if (rows.some((r) => r.id === id)) {
      setError("Deze staat al in de lijst.");
      return;
    }
    setError(null);
    setExtra((prev) => [{ id, direction: draft.direction, key, name, amount: Math.round(amount * 100) / 100, detail: "" }, ...prev]);
    setSelected((prev) => new Set(prev).add(id));
    setDraft({ direction: draft.direction, name: "", amount: "" });
    setAdding(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveFixedItems(chosen.map((r) => ({ direction: r.direction, name: r.name, amount: r.amount })));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(next);
    });
  }

  function fetchMonth() {
    setError(null);
    startFetch(async () => {
      const result = await fetchPreviousMonth();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  const section = (direction: Direction, title: string, empty: string) => {
    const all = rows.filter((r) => r.direction === direction);
    // Wat aan staat blijft altijd in beeld, ook buiten de eerste regels.
    const visible = showAll[direction] ? all : all.filter((r, i) => i < SHOWN || selected.has(r.id));
    return (
      <section className="flex flex-col gap-2" aria-label={title}>
        <h2 className="px-1 text-[13px] font-medium text-text-muted">{title}</h2>
        {all.length === 0 ? (
          <p className="px-1 text-[13px] leading-[18px] text-text-muted">{empty}</p>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <ul>
              {visible.map((row) => {
                const on = selected.has(row.id);
                return (
                  <li key={row.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(row.id)}
                      className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors duration-150 active:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                          on ? "border-primary bg-primary text-on-primary" : "border-border bg-surface",
                        )}
                      >
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 py-2">
                        <span className="block truncate text-[15px] leading-5">{row.name}</span>
                        {row.detail && <span className="block text-[13px] leading-[18px] text-text-muted">{row.detail}</span>}
                      </span>
                      <span className="shrink-0 text-[15px] tabular-nums">{formatEuro(row.amount)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {!showAll[direction] && all.length > visible.length && (
              <button
                type="button"
                onClick={() => setShowAll((s) => ({ ...s, [direction]: true }))}
                className="flex min-h-11 w-full items-center justify-center border-t border-border text-[13px] font-medium text-primary active:bg-surface-muted"
              >
                Toon alle {all.length}
              </button>
            )}
          </Card>
        )}
      </section>
    );
  };

  const noMonth = groups.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-5 px-4 pb-6">
        {noMonth && (
          <Card className="flex flex-col gap-3">
            <p className="text-[15px] leading-[22px]">
              {hasBank
                ? "Haal eerst je kaartjes op."
                : "Koppel eerst je bank, of voeg zelf iets toe."}
            </p>
            {hasBank && (
              <Button variant="secondary" onClick={fetchMonth} disabled={fetching}>
                {fetching ? "Bezig met ophalen" : "Kaartjes ophalen"}
              </Button>
            )}
          </Card>
        )}

        {section("uit", "Vaste kosten", noMonth ? "Nog niets om uit te kiezen." : "Geen uitgaven gevonden in die periode.")}
        {section("in", "Vaste inkomsten", noMonth ? "Nog niets om uit te kiezen." : "Geen inkomsten gevonden in die periode.")}

        {adding ? (
          <Card className="flex flex-col gap-3">
            <Segmented
              ariaLabel="Soort"
              value={draft.direction}
              onChange={(direction) => setDraft((d) => ({ ...d, direction }))}
              options={[
                { value: "uit", label: "Vaste kosten" },
                { value: "in", label: "Vaste inkomsten" },
              ]}
            />
            <Input
              placeholder="Naam, bijvoorbeeld Zorgverzekering"
              aria-label="Naam"
              maxLength={80}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <EuroInput
              placeholder="Bedrag per maand"
              aria-label="Bedrag per maand"
              value={draft.amount}
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button variant="ghost" fullWidth onClick={() => setAdding(false)}>
                Annuleer
              </Button>
              <Button variant="secondary" fullWidth onClick={addOwn}>
                Toevoegen
              </Button>
            </div>
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-11 items-center justify-center gap-1.5 text-[15px] font-medium text-primary"
          >
            <Plus size={16} aria-hidden /> Zelf toevoegen
          </button>
        )}

        <p className="px-1 text-[13px] leading-[18px] text-text-muted">
          Mist er iets? Voeg het zelf toe.
        </p>
      </div>

      <div className="sticky bottom-0 mt-auto bg-bg/95 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mb-2 flex items-baseline justify-end px-1" aria-live="polite">
          <span className="text-[15px] font-semibold tabular-nums">Over per maand {formatEuro(totals.freePerMonth)}</span>
        </div>
        {error && (
          <p role="alert" className="mb-2 px-1 text-[13px] text-negative">
            {error}
          </p>
        )}
        <Button size="lg" fullWidth onClick={save} disabled={pending}>
          {pending ? "Bezig met opslaan" : saveLabel}
        </Button>
        {skipLabel && (
          <button
            type="button"
            onClick={() => router.push(next)}
            className="mt-1 flex min-h-11 w-full items-center justify-center text-[13px] font-medium text-text-muted"
          >
            {skipLabel}
          </button>
        )}
      </div>
    </div>
  );
}
