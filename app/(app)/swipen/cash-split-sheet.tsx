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
import { cn } from "@/lib/utils";
import { parseEuroInput } from "../potjes/[id]/goal-sheet";
import type { CashSpendInput } from "./actions";

interface CashSplitSheetProps {
  open: boolean;
  onClose: () => void;
  /** Opgenomen bedrag, positief. */
  amountAbs: number;
  /** Gewone uitgavenpotjes, in de vaste volgorde. */
  categories: CategoryOption[];
  pending?: boolean;
  onConfirm: (spends: CashSpendInput[], note: string | null) => void;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Pinopname verdelen: per potje wat je er contant aan uitgaf. Niets is vooraf ingevuld;
 * wat je niet verdeelt, blijft in je portemonnee ("Nog over").
 */
export function CashSplitSheet({ open, onClose, amountAbs, categories, pending = false, onConfirm }: CashSplitSheetProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const noteId = useId();
  const restId = useId();

  const spends: CashSpendInput[] = [];
  const invalid = new Set<string>();
  for (const category of categories) {
    const raw = values[category.id]?.trim() ?? "";
    if (raw === "") continue;
    const amount = parseEuroInput(raw);
    if (amount === null || amount <= 0) invalid.add(category.id);
    else spends.push({ categoryId: category.id, amount: round2(amount) });
  }
  const total = round2(spends.reduce((sum, s) => sum + s.amount, 0));
  const rest = round2(amountAbs - total);
  const tooMuch = rest < 0;
  const canSave = spends.length > 0 && invalid.size === 0 && !tooMuch;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Contant verdelen"
      description={`${formatEuro(amountAbs)} opgenomen. Wat je niet invult, blijft contant.`}
    >
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1.5">
          {categories.map((category) => {
            const inputId = `${restId}-${category.id}`;
            return (
              <li key={category.id} className="flex items-center gap-3">
                <CategoryBadge icon={category.icon} color={category.color} size="sm" />
                <label htmlFor={inputId} className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {category.name}
                </label>
                <EuroInput
                  id={inputId}
                  className="w-28 shrink-0"
                  placeholder="0"
                  value={values[category.id] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setValues((prev) => ({ ...prev, [category.id]: value }));
                  }}
                  aria-invalid={invalid.has(category.id) ? true : undefined}
                  aria-describedby={restId}
                />
              </li>
            );
          })}
        </ul>

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

        <p
          id={restId}
          role="status"
          className={cn("text-[15px] tabular-nums", tooMuch || invalid.size > 0 ? "text-negative" : "font-medium")}
        >
          {invalid.size > 0
            ? "Vul een bedrag boven € 0 in."
            : tooMuch
              ? `${formatEuro(-rest)} te veel`
              : `Nog over: ${formatEuro(rest)}`}
        </p>

        <Button size="lg" fullWidth disabled={!canSave} loading={pending} onClick={() => onConfirm(spends, note.trim() || null)}>
          Opslaan
        </Button>
      </div>
    </Sheet>
  );
}
