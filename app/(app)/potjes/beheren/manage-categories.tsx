"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, useTransition } from "react";
import { CategoryBadge } from "@/components/categories/category-badge";
import { CategoryEditor } from "@/components/categories/category-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconPlus } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import type { QuickSuggestionKey } from "@/lib/categories/defaults";
import { DEFAULT_CATEGORY_ICON } from "@/lib/categories/icons";
import { CATEGORY_COLORS } from "@/lib/categories/palette";
import type { CategoryDraft } from "@/lib/categories/types";
import { createPotje, reorderCategories, restoreCategory } from "../actions";

interface Item {
  id: string;
  name: string;
  icon: string;
  color: string;
}


export function ManageCategories({ active, archived }: { active: Item[]; archived: Item[] }) {
  const [order, setOrder] = useState(active);
  const [archivedItems, setArchivedItems] = useState(archived);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryDraft | null>(null);
  const [suggestion, setSuggestion] = useState<QuickSuggestionKey | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCreating, startCreate] = useTransition();

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setDirty(true);
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      const result = await reorderCategories(order.map((c) => c.id));
      setMessage(result.ok ? "Volgorde opgeslagen." : result.error);
      if (result.ok) setDirty(false);
    });
  }

  function restore(item: Item) {
    startTransition(async () => {
      const result = await restoreCategory(item.id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setArchivedItems((prev) => prev.filter((c) => c.id !== item.id));
      setOrder((prev) => [...prev, item]);
      setMessage(`‘${item.name}’ staat weer bij je potjes.`);
    });
  }

  function openEditor() {
    // Lege naam; icoon en kleur zijn alleen een startpunt (eerste kleur die nog vrij is), zoals bij de '+'-tegel.
    const used = new Set(order.map((c) => c.color));
    setDraft({
      name: "",
      icon: DEFAULT_CATEGORY_ICON,
      color: CATEGORY_COLORS.find((c) => !used.has(c)) ?? "grijs",
      isIncome: false,
      isSavings: false,
      enabled: true,
    });
    setSuggestion(null);
    setCreateError(null);
  }

  function create() {
    if (!draft) return;
    const current = draft;
    startCreate(async () => {
      const result = await createPotje(
        { name: current.name, icon: current.icon, color: current.color, isIncome: current.isIncome, isSavings: current.isSavings ?? false },
        suggestion,
      );
      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      setOrder((prev) => [...prev, result.category]);
      setDraft(null);
      setMessage(`‘${result.category.name}’ staat erbij.`);
    });
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <section className="flex flex-col gap-2" aria-labelledby="potjes-volgorde">
        <h2 id="potjes-volgorde" className="px-1 text-[13px] leading-[18px] font-medium text-text-muted">
          Volgorde
        </h2>
        <Card padding="none">
          <ul className="divide-y">
            {order.map((item, index) => (
              <li key={item.id} className="flex min-h-[52px] items-center gap-3 py-1 pr-2 pl-4">
                <CategoryBadge icon={item.icon} color={item.color} size="sm" />
                <span className="line-clamp-2 min-w-0 flex-1 text-[15px] leading-5 font-medium">{item.name}</span>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`${item.name} omhoog`}
                  className="flex size-11 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted disabled:opacity-30"
                >
                  <ArrowUp size={18} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === order.length - 1}
                  aria-label={`${item.name} omlaag`}
                  className="flex size-11 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted disabled:opacity-30"
                >
                  <ArrowDown size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Button variant="secondary" onClick={openEditor} fullWidth>
          <IconPlus size={18} aria-hidden />
          Nieuw potje
        </Button>
      </section>

      <div className="flex flex-col gap-2">
        <p className="min-h-[18px] px-1 text-[13px] leading-[18px] text-text-muted" role="status" aria-live="polite">
          {message}
        </p>
        <Button onClick={save} disabled={!dirty} loading={isPending && dirty} fullWidth>
          Volgorde opslaan
        </Button>
      </div>

      {archivedItems.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="potjes-gearchiveerd">
          <h2 id="potjes-gearchiveerd" className="px-1 text-[13px] leading-[18px] font-medium text-text-muted">
            Gearchiveerd
          </h2>
          <Card padding="none">
            <ul className="divide-y">
              {archivedItems.map((item) => (
                <li key={item.id} className="flex min-h-[52px] items-center gap-3 py-1 pr-2 pl-4">
                  <CategoryBadge icon={item.icon} color={item.color} size="sm" className="opacity-60" />
                  <span className="line-clamp-2 min-w-0 flex-1 text-[15px] leading-5 text-text-muted">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => restore(item)}
                    disabled={isPending}
                    className="min-h-11 rounded-full px-3 text-[15px] font-medium text-primary hover:bg-surface-muted disabled:opacity-50"
                  >
                    Terugzetten
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <Sheet open={draft !== null} onClose={() => setDraft(null)} title="Nieuw potje">
        {draft && (
          <CategoryEditor
            draft={draft}
            onChange={(patch) => {
              setDraft((d) => (d ? { ...d, ...patch } : d));
              setCreateError(null);
            }}
            onDone={create}
            doneLabel="Potje maken"
            pending={isCreating}
            error={createError}
            isNew
            onSuggestionUsed={setSuggestion}
          />
        )}
      </Sheet>
    </div>
  );
}
