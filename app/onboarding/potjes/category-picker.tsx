"use client";

import { useState, useTransition } from "react";
import { CategoryBadge } from "@/components/categories/category-badge";
import { Button } from "@/components/ui/button";
import { IconCheck, IconPencil, IconPlus } from "@/components/ui/icons";
import { Field, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { CATEGORY_EMOJI_OPTIONS, MAX_CATEGORIES, MAX_CATEGORY_NAME_LENGTH } from "@/lib/categories/defaults";
import { CATEGORY_COLORS, categoryColorClasses, type CategoryColor } from "@/lib/categories/palette";
import { cn } from "@/lib/utils";
import { saveOnboardingCategories, type CategoryDraft } from "../actions";

type DraftWithKey = CategoryDraft & { key: string };

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
      { key, name: "", emoji: "🏷️", color, isIncome: false, enabled: true },
    ]);
    setEditingKey(key);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
    setEditingKey(null);
  }

  function closeEditor() {
    // Een nieuw potje zonder naam heeft geen zin: gooi het weg.
    if (editing && editing.id === undefined && editing.name.trim() === "") {
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
        emoji: d.emoji,
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
                <CategoryBadge emoji={draft.emoji} color={draft.color} />
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
        title={editing?.id || (editing && editing.name) ? "Potje bewerken" : "Nieuw potje"}
      >
        {editing && (
          <CategoryEditor
            draft={editing}
            onChange={(patch) => update(editing.key, patch)}
            onDone={closeEditor}
            onRemove={editing.id === undefined ? () => removeDraft(editing.key) : undefined}
          />
        )}
      </Sheet>
    </div>
  );
}

function CategoryEditor({
  draft,
  onChange,
  onDone,
  onRemove,
}: {
  draft: DraftWithKey;
  onChange: (patch: Partial<CategoryDraft>) => void;
  onDone: () => void;
  onRemove?: () => void;
}) {
  const canSave = draft.name.trim().length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <CategoryBadge emoji={draft.emoji} color={draft.color} size="lg" />
        <div className="flex-1">
          <Field label="Naam" htmlFor="category-name">
            <Input
              id="category-name"
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
              maxLength={MAX_CATEGORY_NAME_LENGTH}
              placeholder="Bijvoorbeeld Huisdier"
              autoFocus={draft.name === ""}
              autoComplete="off"
            />
          </Field>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Emoji</legend>
        <div className="grid grid-cols-8 gap-1">
          {CATEGORY_EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange({ emoji })}
              aria-label={`Emoji ${emoji}`}
              aria-pressed={draft.emoji === emoji}
              className={cn(
                "flex aspect-square min-h-11 items-center justify-center rounded-xl text-xl transition-colors duration-150",
                draft.emoji === emoji ? "bg-primary-soft ring-2 ring-primary" : "hover:bg-surface-muted",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Kleur</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((color: CategoryColor) => {
            const classes = categoryColorClasses(color);
            const selected = draft.color === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ color })}
                aria-label={`Kleur ${color}`}
                aria-pressed={selected}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full transition-transform duration-150",
                  classes.bg,
                  selected && cn("ring-2 ring-offset-2 ring-offset-surface", classes.ring),
                )}
              >
                <span className={cn("size-5 rounded-full", classes.solid)} aria-hidden />
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block font-medium">Inkomend geld</span>
          <span className="block text-sm text-text-muted">Bijvoorbeeld salaris of toeslagen</span>
        </span>
        <input
          type="checkbox"
          checked={draft.isIncome}
          onChange={(e) => onChange({ isIncome: e.target.checked })}
          className="size-5 accent-primary"
        />
      </label>

      <div className="flex gap-2">
        {onRemove && (
          <Button variant="ghost" onClick={onRemove}>
            Verwijderen
          </Button>
        )}
        <Button fullWidth onClick={onDone} disabled={!canSave}>
          Klaar
        </Button>
      </div>
    </div>
  );
}
