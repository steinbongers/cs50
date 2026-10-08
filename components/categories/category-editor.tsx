"use client";

import { CategoryBadge } from "@/components/categories/category-badge";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { MAX_CATEGORY_NAME_LENGTH } from "@/lib/categories/defaults";
import { CATEGORY_ICON_KEYS, CATEGORY_ICON_LABELS } from "@/lib/categories/icons";
import { CATEGORY_COLORS, categoryColorClasses, type CategoryColor } from "@/lib/categories/palette";
import type { CategoryDraft } from "@/lib/categories/types";
import { cn } from "@/lib/utils";

interface CategoryEditorProps {
  draft: CategoryDraft;
  onChange: (patch: Partial<CategoryDraft>) => void;
  onDone: () => void;
  onRemove?: () => void;
  doneLabel?: string;
  pending?: boolean;
  error?: string | null;
}

/** Naam, icoon, kleur en inkomend-geld van één potje. Gebruikt in onboarding en hoofdscherm. */
export function CategoryEditor({
  draft,
  onChange,
  onDone,
  onRemove,
  doneLabel = "Klaar",
  pending = false,
  error = null,
}: CategoryEditorProps) {
  const canSave = draft.name.trim().length > 0;
  const colors = categoryColorClasses(draft.color);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <CategoryBadge icon={draft.icon} color={draft.color} size="lg" />
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
        <legend className="text-sm font-medium">Icoon</legend>
        <div className="grid grid-cols-6 gap-1.5">
          {CATEGORY_ICON_KEYS.map((key) => {
            const selected = draft.icon === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ icon: key })}
                aria-label={`Icoon ${CATEGORY_ICON_LABELS[key]}`}
                aria-pressed={selected}
                className={cn(
                  "flex aspect-square min-h-11 items-center justify-center rounded-xl transition-colors duration-150",
                  selected
                    ? cn(colors.bg, colors.text, "ring-2", colors.ring)
                    : "text-text-muted hover:bg-surface-muted hover:text-text",
                )}
              >
                <CategoryIcon icon={key} size={22} />
              </button>
            );
          })}
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

      {error && (
        <p className="rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {onRemove && (
          <Button variant="ghost" onClick={onRemove}>
            Verwijderen
          </Button>
        )}
        <Button fullWidth onClick={onDone} disabled={!canSave} loading={pending}>
          {doneLabel}
        </Button>
      </div>
    </div>
  );
}
