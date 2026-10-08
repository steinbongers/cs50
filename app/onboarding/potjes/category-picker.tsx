"use client";

import { useState, useTransition } from "react";
import { CategoryBadge } from "@/components/categories/category-badge";
import { CategoryEditor } from "@/components/categories/category-editor";
import { Button } from "@/components/ui/button";
import { IconCheck, IconPencil, IconPlus } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { MAX_CATEGORIES } from "@/lib/categories/defaults";
import { DEFAULT_CATEGORY_ICON } from "@/lib/categories/icons";
import { CATEGORY_COLORS, categoryColorClasses } from "@/lib/categories/palette";
import type { CategoryDraft } from "@/lib/categories/types";
import { cn } from "@/lib/utils";
import { saveOnboardingCategories } from "../actions";

type DraftWithKey = CategoryDraft & { key: string; isCustom?: boolean };

export function CategoryPicker({ initialDrafts }: { initialDrafts: CategoryDraft[] }) {
  const [drafts, setDrafts] = useState<DraftWithKey[]>(() =>
    initialDrafts.map((d, i) => ({ ...d, key: d.id ?? `new-${i}` })),
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const enabledCount = drafts.filter((d) => d.enabled).length;
  const editing = drafts.find((d) => d.key === editingKey) ?? null;

  function update(key: string, patch: Partial<CategoryDraft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function toggle(key: string) {
    const current = drafts.find((d) => d.key === key);
    if (!current) return;
    update(key, { enabled: !current.enabled });
  }

  function addCategory() {
    if (enabledCount >= MAX_CATEGORIES) return;
    const key = `new-${Date.now()}`;
    const usedColors = new Set(drafts.map((d) => d.color));
    const color = CATEGORY_COLORS.find((c) => !usedColors.has(c)) ?? "grijs";
    setDrafts((prev) => [
      ...prev,
      { key, name: "", icon: DEFAULT_CATEGORY_ICON, color, isIncome: false, enabled: true, isCustom: true },
    ]);
    setEditingKey(key);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
    setEditingKey(null);
  }

  function closeEditor() {
    // Een nieuw potje zonder naam heeft geen zin: gooi het weg.
    if (editing && editing.isCustom && editing.name.trim() === "") {
      removeDraft(editing.key);
      return;
    }
    setEditingKey(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const payload: CategoryDraft[] = drafts.map((d) => ({
        id: d.id,
        name: d.name,
        icon: d.icon,
        color: d.color,
        isIncome: d.isIncome,
        enabled: d.enabled,
      }));
      const result = await saveOnboardingCategories(payload);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <ul className="flex flex-col gap-2 px-4">
        {drafts.map((draft) => {
          const colors = categoryColorClasses(draft.color);
          return (
            <li
              key={draft.key}
              className={cn(
                "flex items-center gap-2 rounded-card bg-surface pr-1 shadow-card transition-opacity duration-150",
                !draft.enabled && "opacity-60",
              )}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={draft.enabled}
                onClick={() => toggle(draft.key)}
                className="flex min-h-14 flex-1 items-center gap-3 rounded-card py-2 pl-3 text-left"
              >
                <CategoryBadge icon={draft.icon} color={draft.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {draft.name || <span className="text-text-muted">Naam ontbreekt</span>}
                  </span>
                  {draft.isIncome && (
                    <span className="block text-xs text-text-muted">Inkomend geld</span>
                  )}
                </span>
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border-2 transition-colors duration-150",
                    draft.enabled ? cn("border-transparent", colors.solid, "text-white") : "border-border",
                  )}
                  aria-hidden
                >
                  {draft.enabled && <IconCheck size={14} strokeWidth={3} />}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditingKey(draft.key)}
                aria-label={`${draft.name || "Potje"} bewerken`}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted hover:text-text"
              >
                <IconPencil size={18} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="px-4 pt-3">
        <Button variant="ghost" fullWidth onClick={addCategory} disabled={enabledCount >= MAX_CATEGORIES}>
          <IconPlus size={20} />
          Eigen potje toevoegen
        </Button>
      </div>

      <div className="safe-bottom sticky bottom-0 mt-auto bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-5">
        {error && (
          <p className="mb-3 rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
            {error}
          </p>
        )}
        <Button size="lg" fullWidth onClick={save} loading={isPending} disabled={enabledCount === 0}>
          {enabledCount === 1 ? "Verder met 1 potje" : `Verder met ${enabledCount} potjes`}
        </Button>
      </div>

      <Sheet
        open={editing !== null}
        onClose={closeEditor}
        title={editing?.isCustom && editing.name.trim() === "" ? "Nieuw potje" : "Potje bewerken"}
      >
        {editing && (
          <CategoryEditor
            draft={editing}
            onChange={(patch) => update(editing.key, patch)}
            onDone={closeEditor}
            onRemove={editing.isCustom ? () => removeDraft(editing.key) : undefined}
          />
        )}
      </Sheet>
    </div>
  );
}
