"use client";

import { CategoryBadge } from "@/components/categories/category-badge";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  hintForName,
  MAX_CATEGORY_NAME_LENGTH,
  QUICK_SUGGESTIONS,
  type QuickSuggestion,
  type QuickSuggestionKey,
} from "@/lib/categories/defaults";
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
  /**
   * Nieuw potje: toont bovenaan "Snel toevoegen" met de snelle suggesties.
   * Niet zetten bij het bewerken van een bestaand potje.
   */
  isNew?: boolean;
  /**
   * Meldt welke snelle suggestie de naam nu levert (of null als de gebruiker de naam
   * daarna veranderde), zodat de aanroeper `potje_created { suggestion }` kan loggen.
   */
  onSuggestionUsed?: (suggestion: QuickSuggestionKey | null) => void;
}

/** De suggestie waar dit concept nog precies op lijkt, anders null. */
export function suggestionForDraft(draft: Pick<CategoryDraft, "name">): QuickSuggestionKey | null {
  const name = draft.name.trim().toLocaleLowerCase("nl-NL");
  return QUICK_SUGGESTIONS.find((s) => s.name.toLocaleLowerCase("nl-NL") === name)?.key ?? null;
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
  isNew = false,
  onSuggestionUsed,
}: CategoryEditorProps) {
  const canSave = draft.name.trim().length > 0;
  const colors = categoryColorClasses(draft.color);
  const hint = hintForName(draft.name);
  const activeSuggestion = isNew ? suggestionForDraft(draft) : null;

  function applySuggestion(suggestion: QuickSuggestion) {
    // Vult alleen het formulier in; opslaan doet de gebruiker zelf.
    onChange({ name: suggestion.name, icon: suggestion.icon, color: suggestion.color });
    onSuggestionUsed?.(suggestion.key);
  }

  function changeName(name: string) {
    onChange({ name });
    if (onSuggestionUsed && activeSuggestion !== null) {
      const next = suggestionForDraft({ name });
      if (next !== activeSuggestion) onSuggestionUsed(next);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {isNew && (
        <section className="flex flex-col gap-1" aria-labelledby="category-suggestions">
          <h3 id="category-suggestions" className="text-[13px] leading-[18px] font-medium">
            Snel toevoegen
          </h3>
          <div className="flex flex-wrap gap-x-2">
            {QUICK_SUGGESTIONS.map((suggestion) => {
              const pressed = activeSuggestion === suggestion.key;
              const chipColors = categoryColorClasses(suggestion.color);
              return (
                <button
                  key={suggestion.key}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  aria-pressed={pressed}
                  className="group flex min-h-11 items-center rounded-full focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-full bg-surface-muted px-3 text-[13px] leading-[18px] font-medium transition-colors duration-150 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-primary",
                      pressed && cn("ring-2 ring-inset", chipColors.ring),
                    )}
                  >
                    <CategoryIcon icon={suggestion.icon} size={16} className={chipColors.text} />
                    {suggestion.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex items-center gap-3">
        <CategoryBadge icon={draft.icon} color={draft.color} size="lg" />
        <div className="flex-1">
          <Field label="Naam" htmlFor="category-name">
            <Input
              id="category-name"
              value={draft.name}
              onChange={(e) => changeName(e.target.value)}
              maxLength={MAX_CATEGORY_NAME_LENGTH}
              placeholder="Bijvoorbeeld Sport"
              aria-describedby={hint ? "category-name-hint" : undefined}
              autoFocus={draft.name === ""}
              autoComplete="off"
            />
          </Field>
          {hint && (
            <p id="category-name-hint" className="mt-1 text-[13px] leading-[18px] text-text-muted">
              {hint}
            </p>
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[13px] leading-[18px] font-medium">Icoon</legend>
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
        <legend className="text-[13px] leading-[18px] font-medium">Kleur</legend>
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
        <span aria-hidden>
          <span className="block text-[15px] leading-5 font-medium">Inkomend geld</span>
          <span className="block text-[13px] leading-[18px] text-text-muted">Bijvoorbeeld salaris of toeslagen</span>
        </span>
        <Switch label="Inkomend geld" checked={draft.isIncome} onCheckedChange={(isIncome) => onChange({ isIncome })} />
      </label>

      {error && (
        <p className="rounded-control bg-negative-soft px-4 py-3 text-[13px] leading-[18px] text-negative" role="alert">
          {error}
        </p>
      )}

      {/* Altijd in beeld, ook met de hele lijst icoontjes erboven: niet eerst naar beneden scrollen.
          De negatieve bottom en marge heffen de onderpadding van de sheet op, zodat er niets onder doorschemert. */}
      <div className="sticky bottom-[calc(-1*(env(safe-area-inset-bottom)+1.25rem))] z-10 -mx-4 -mb-[calc(env(safe-area-inset-bottom)+1.25rem)] flex gap-2 border-t border-border bg-surface px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
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
