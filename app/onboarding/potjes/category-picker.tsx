"use client";

import { useMemo, useState, useTransition } from "react";
import { CategoryEditor } from "@/components/categories/category-editor";
import { CategoryAddTile, CategoryPickerGrid } from "@/components/categories/category-picker-grid";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { hintForName, MAX_CATEGORIES, type QuickSuggestionKey } from "@/lib/categories/defaults";
import { DEFAULT_CATEGORY_ICON } from "@/lib/categories/icons";
import { CATEGORY_COLORS } from "@/lib/categories/palette";
import type { CategoryDraft } from "@/lib/categories/types";
import { saveOnboardingCategories, type OnboardingCategoryDraft } from "../actions";

type PickerDraft = CategoryDraft & {
  key: string;
  isCustom: boolean;
  suggestion: QuickSuggestionKey | null;
};

function isOverig(draft: CategoryDraft) {
  return draft.name.trim().toLocaleLowerCase("nl-NL") === "overig";
}

export function CategoryPicker({ initialDrafts }: { initialDrafts: CategoryDraft[] }) {
  const [drafts, setDrafts] = useState<PickerDraft[]>(() =>
    initialDrafts.map((d, i) => ({ ...d, key: d.id ?? `start-${i}`, isCustom: false, suggestion: null })),
  );
  const [newDraft, setNewDraft] = useState<PickerDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Het laatst aangetikte potje: daarvan tonen we de hulpregel onder het raster.
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const enabled = drafts.filter((d) => d.enabled);
  const enabledCount = enabled.length;
  const hasExpense = enabled.some((d) => !d.isIncome);
  const atMax = enabledCount >= MAX_CATEGORIES;

  const toggledOff = useMemo(() => new Set(drafts.filter((d) => !d.enabled).map((d) => d.key)), [drafts]);
  const tiles = useMemo(
    () => drafts.map((d) => ({ id: d.key, name: d.name, icon: d.icon, color: d.color })),
    [drafts],
  );

  const lastDraft = drafts.find((d) => d.key === lastKey) ?? null;
  const lastHint = lastDraft ? hintForName(lastDraft.name) : null;

  function toggle(key: string) {
    setLastKey(key);
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        // Bij het maximum kun je niets meer aanzetten, wel uitzetten.
        if (!d.enabled && atMax) return d;
        return { ...d, enabled: !d.enabled };
      }),
    );
  }

  function openNew() {
    if (atMax) return;
    const usedColors = new Set(drafts.map((d) => d.color));
    const color = CATEGORY_COLORS.find((c) => !usedColors.has(c)) ?? "grijs";
    setNewDraft({
      key: `eigen-${Date.now()}`,
      name: "",
      icon: DEFAULT_CATEGORY_ICON,
      color,
      isIncome: false,
      enabled: true,
      isCustom: true,
      suggestion: null,
    });
  }

  function addNew() {
    if (!newDraft || newDraft.name.trim() === "") return;
    const added = { ...newDraft, name: newDraft.name.trim() };
    setDrafts((prev) => {
      // Eigen potjes komen vóór Overig; Overig blijft als laatste staan.
      const overigIndex = prev.findIndex(isOverig);
      if (overigIndex === -1) return [...prev, added];
      return [...prev.slice(0, overigIndex), added, ...prev.slice(overigIndex)];
    });
    setNewDraft(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const payload: OnboardingCategoryDraft[] = drafts.map((d) => ({
        id: d.id,
        name: d.name,
        icon: d.icon,
        color: d.color,
        isIncome: d.isIncome,
        enabled: d.enabled,
        isCustom: d.isCustom,
        suggestion: d.suggestion,
      }));
      const result = await saveOnboardingCategories(payload);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4">
        <CategoryPickerGrid
          label="Potjes"
          categories={tiles}
          onPick={toggle}
          toggledOff={toggledOff}
          renderAddTile={<CategoryAddTile onClick={openNew} disabled={atMax} />}
        />
        <p className="mt-3 min-h-[18px] px-1 text-[13px] leading-[18px]" aria-live="polite">
          {lastDraft && lastHint && (
            <>
              <span className="font-medium">{lastDraft.name}:</span> <span className="text-text-muted">{lastHint}</span>
            </>
          )}
        </p>
        <p className="mt-3 px-1 text-[13px] leading-[18px] text-text-muted">
          Voorgeschoten zit er altijd bij. Daar houden we bij wat je nog terugkrijgt.
        </p>
      </div>

      <div className="sticky bottom-0 mt-auto bg-bg/95 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur">
        {error && (
          <p className="mb-3 rounded-control bg-negative-soft px-4 py-3 text-[13px] leading-[18px] text-negative" role="alert">
            {error}
          </p>
        )}
        {!hasExpense && (
          <p className="mb-3 text-center text-[13px] leading-[18px] text-text-muted" role="status">
            Zet minstens één potje voor je uitgaven aan.
          </p>
        )}
        <Button size="lg" fullWidth onClick={save} loading={isPending} disabled={!hasExpense}>
          {enabledCount === 1 ? "Verder met 1 potje" : `Verder met ${enabledCount} potjes`}
        </Button>
      </div>

      <Sheet open={newDraft !== null} onClose={() => setNewDraft(null)} title="Nieuw potje">
        {newDraft && (
          <CategoryEditor
            isNew
            draft={newDraft}
            onChange={(patch) => setNewDraft((d) => (d ? { ...d, ...patch } : d))}
            onSuggestionUsed={(suggestion) => setNewDraft((d) => (d ? { ...d, suggestion } : d))}
            onDone={addNew}
            doneLabel="Potje toevoegen"
          />
        )}
      </Sheet>
    </div>
  );
}
