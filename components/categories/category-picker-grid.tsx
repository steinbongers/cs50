"use client";

import type { ReactNode } from "react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { IconCheck, IconPlus } from "@/components/ui/icons";
import { categoryColorClasses } from "@/lib/categories/palette";
import { cn } from "@/lib/utils";

export interface CategoryPickerGridItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategoryPickerGridProps {
  categories: CategoryPickerGridItem[];
  /** Het potje dat nu gekozen is (bijvoorbeeld het huidige potje van een kaartje). */
  selectedId?: string | null;
  onPick: (id: string) => void;
  /** Potjes die je hier niet kunt kiezen. */
  disabledIds?: ReadonlySet<string> | readonly string[];
  /**
   * Zet het raster in aan/uit-stand (onboarding). Potjes in deze set staan uit;
   * de rest krijgt een vinkje rechtsboven.
   */
  toggledOff?: ReadonlySet<string>;
  /** Extra tegel aan het eind, bijvoorbeeld `<CategoryAddTile />`. */
  renderAddTile?: ReactNode;
  /** Toegankelijke naam van het raster. */
  label?: string;
  className?: string;
}

/** Basisklassen van een tegel; gedeeld met de '+'-tegel zodat ze precies even groot zijn. */
export const pickerTileBase =
  "relative flex h-20 w-full min-w-11 flex-col items-center gap-0.5 rounded-2xl px-1 pt-2 transition active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";

const nameClasses =
  "w-full text-center text-[11px] leading-[13px] font-medium line-clamp-2 hyphens-auto break-words";

/**
 * Het gedeelde raster van 4 kolommen om een potje te kiezen: in sheets (verplaatsen in het
 * potje-detail en op /transacties) en in de onboarding. Er is nooit iets voorgeselecteerd
 * behalve wat de aanroeper zelf als `selectedId` meegeeft.
 */
export function CategoryPickerGrid({
  categories,
  selectedId,
  onPick,
  disabledIds,
  toggledOff,
  renderAddTile,
  label,
  className,
}: CategoryPickerGridProps) {
  const disabled = new Set(disabledIds ?? []);
  const toggleMode = toggledOff !== undefined;

  return (
    <ul role="list" aria-label={label} className={cn("grid grid-cols-4 gap-1.5", className)}>
      {categories.map((category) => {
        const colors = categoryColorClasses(category.color);
        const isOff = toggleMode && toggledOff.has(category.id);
        const isSelected = !toggleMode && selectedId === category.id;
        return (
          <li key={category.id} className="min-w-0">
            <button
              type="button"
              onClick={() => onPick(category.id)}
              disabled={disabled.has(category.id)}
              aria-label={category.name}
              aria-pressed={toggleMode ? !isOff : undefined}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                pickerTileBase,
                "bg-surface text-text shadow-card",
                isSelected && cn("ring-2 ring-inset", colors.ring),
                isOff && "opacity-40",
              )}
            >
              <span
                className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", colors.bg, colors.text)}
                aria-hidden
              >
                <CategoryIcon icon={category.icon} size={16} strokeWidth={1.75} />
              </span>
              <span className={nameClasses} aria-hidden>
                {category.name}
              </span>
              {toggleMode && !isOff && (
                <span
                  className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-on-primary"
                  aria-hidden
                >
                  <IconCheck size={10} strokeWidth={3} />
                </span>
              )}
            </button>
          </li>
        );
      })}
      {renderAddTile !== undefined && renderAddTile !== null && <li className="min-w-0">{renderAddTile}</li>}
    </ul>
  );
}

/** De '+'-tegel om ter plekke een nieuw potje te maken. Past in `renderAddTile`. */
export function CategoryAddTile({
  onClick,
  label = "Eigen potje",
  disabled = false,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(pickerTileBase, "border border-dashed border-border text-text-muted hover:bg-surface-muted")}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full" aria-hidden>
        <IconPlus size={16} strokeWidth={1.75} />
      </span>
      <span className={nameClasses} aria-hidden>
        {label}
      </span>
    </button>
  );
}
