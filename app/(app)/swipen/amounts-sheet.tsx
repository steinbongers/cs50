"use client";

import { useId, useState } from "react";
import { EuroInput } from "@/components/cash/euro-input";
import { CategoryBadge } from "@/components/categories/category-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { formatEuro } from "@/lib/format";
import { CASH_NOTE_MAX } from "@/lib/transactions/cash";
import type { CategoryOption } from "@/lib/transactions/queries";
import {
  MIN_SPLIT_PARTS,
  SPLIT_NOTE_MAX,
  centsToInput,
  fillRestCents,
  remainingCents,
  toCents,
  type SplitPartInput,
} from "@/lib/transactions/split-parts";
import { cn } from "@/lib/utils";
import { parseEuroInput } from "../potjes/[id]/goal-sheet";

/**
 * Twee soorten verdelen met dezelfde lijst bedragen per potje:
 * - `cash`: een pinopname. Wat je niet verdeelt, blijft in je portemonnee ("Nog over").
 * - `split`: een afschrijving (vaak de creditcard). Het hele bedrag moet verdeeld zijn, met per
 *   regel een knop Rest en per deel een eigen notitie.
 */
export type AmountsMode = "cash" | "split";

interface AmountsSheetProps {
  mode: AmountsMode;
  open: boolean;
  onClose: () => void;
  /** Opgenomen of afgeschreven bedrag, positief. */
  amountAbs: number;
  /** Tegenpartij van de afschrijving, voor de uitleg bij `split`. */
  counterparty?: string;
  /** Gewone uitgavenpotjes, in de vaste volgorde. */
  categories: CategoryOption[];
  pending?: boolean;
  /** De delen (positief) en bij `cash` één notitie; bij `split` staat de notitie per deel. */
  onConfirm: (parts: SplitPartInput[], note: string | null) => void;
}

/**
 * Per potje een bedrag. Niets is vooraf ingevuld; alles wordt in hele centen gerekend,
 * zodat "Nog te verdelen" nooit een cent ernaast zit.
 */
export function AmountsSheet({
  mode,
  open,
  onClose,
  amountAbs,
  counterparty,
  categories,
  pending = false,
  onConfirm,
}: AmountsSheetProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const noteId = useId();
  const restId = useId();
  const isSplit = mode === "split";

  const totalCents = toCents(amountAbs);
  const centsById = new Map<string, number>();
  const invalid = new Set<string>();
  for (const category of categories) {
    const raw = values[category.id]?.trim() ?? "";
    if (raw === "") continue;
    const amount = parseEuroInput(raw);
    if (amount === null || amount <= 0) invalid.add(category.id);
    else centsById.set(category.id, toCents(amount));
  }
  const parts: SplitPartInput[] = categories.flatMap((c) => {
    const cents = centsById.get(c.id);
    if (cents === undefined) return [];
    return [{ categoryId: c.id, amount: cents / 100, ...(isSplit ? { note: notes[c.id]?.trim() || null } : {}) }];
  });
  const rest = remainingCents(totalCents, [...centsById.values()]);
  const tooMuch = rest < 0;
  const tooFew = isSplit && rest === 0 && parts.length < MIN_SPLIT_PARTS;
  const canSave =
    parts.length > 0 && invalid.size === 0 && (isSplit ? rest === 0 && parts.length >= MIN_SPLIT_PARTS : !tooMuch);

  function setValue(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  // Rest: deze regel krijgt precies wat er na de andere regels overblijft.
  function restFor(id: string): number {
    return fillRestCents(
      totalCents,
      [...centsById.entries()].filter(([key]) => key !== id).map(([, cents]) => cents),
    );
  }

  const status =
    invalid.size > 0
      ? "Vul een bedrag boven € 0 in."
      : tooMuch
        ? `${formatEuro(-rest / 100)} te veel`
        : tooFew
          ? "Verdeel over minstens twee potjes."
          : isSplit
            ? `Nog te verdelen: ${formatEuro(rest / 100)}`
            : `Nog over: ${formatEuro(rest / 100)}`;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isSplit ? "Verdelen over potjes" : "Contant verdelen"}
      description={
        isSplit
          ? `${formatEuro(amountAbs)}${counterparty ? ` van ${counterparty}` : ""}. Verdeel het hele bedrag.`
          : `${formatEuro(amountAbs)} opgenomen. Wat je niet invult, blijft contant.`
      }
    >
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1.5">
          {categories.map((category) => {
            const inputId = `${restId}-${category.id}`;
            const filled = centsById.has(category.id);
            const restCents = isSplit ? restFor(category.id) : 0;
            return (
              <li key={category.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <CategoryBadge icon={category.icon} color={category.color} size="sm" />
                  <label htmlFor={inputId} className="min-w-0 flex-1 truncate text-[15px] font-medium">
                    {category.name}
                  </label>
                  <EuroInput
                    id={inputId}
                    className={cn("shrink-0", isSplit ? "w-24" : "w-28")}
                    placeholder="0"
                    value={values[category.id] ?? ""}
                    onChange={(e) => setValue(category.id, e.target.value)}
                    aria-invalid={invalid.has(category.id) ? true : undefined}
                    aria-describedby={restId}
                  />
                  {isSplit && (
                    <Button
                      variant="ghost"
                      onClick={() => setValue(category.id, restCents === 0 ? "" : centsToInput(restCents))}
                      disabled={restCents === 0 || restCents === centsById.get(category.id)}
                      aria-label={`Rest naar ${category.name}`}
                      className="shrink-0 px-2 text-[14px]"
                    >
                      Rest
                    </Button>
                  )}
                </div>
                {isSplit && filled && (
                  <div className="pl-11">
                    <Input
                      value={notes[category.id] ?? ""}
                      maxLength={SPLIT_NOTE_MAX}
                      placeholder="Notitie (mag leeg)"
                      aria-label={`Notitie bij ${category.name}`}
                      autoComplete="off"
                      onChange={(e) => {
                        const value = e.target.value;
                        setNotes((prev) => ({ ...prev, [category.id]: value }));
                      }}
                      className="h-11 text-[15px]"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {!isSplit && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={noteId} className="text-[13px] leading-[18px] font-medium text-text-muted">
              Notitie (mag leeg)
            </label>
            <Input
              id={noteId}
              value={note}
              maxLength={CASH_NOTE_MAX}
              placeholder="Markt, kapper, fooi"
              autoComplete="off"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}

        {/* Bij verdelen blijft de stand in beeld, ook met veel potjes. */}
        <div className={cn("flex flex-col gap-4", isSplit && "sticky bottom-0 -mx-4 bg-surface px-4 pt-2")}>
          <p
            id={restId}
            role="status"
            className={cn(
              "text-[15px] tabular-nums",
              tooMuch || invalid.size > 0 ? "text-negative" : tooFew ? "text-text-muted" : "font-medium",
            )}
          >
            {status}
          </p>

          <Button
            size="lg"
            fullWidth
            disabled={!canSave}
            loading={pending}
            onClick={() => onConfirm(parts, isSplit ? null : note.trim() || null)}
          >
            Opslaan
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
