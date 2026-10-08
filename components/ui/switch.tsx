"use client";

import { cn } from "@/lib/utils";

export type SwitchSize = "md" | "sm";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Toegankelijke naam. Zet de zichtbare tekst ernaast zelf neer (bijvoorbeeld in een ListRow). */
  label: string;
  disabled?: boolean;
  /** "md" is de iOS-maat 51×31 (knop 27), "sm" is 44×26 (knop 22). */
  size?: SwitchSize;
  id?: string;
  className?: string;
}

const trackSize: Record<SwitchSize, string> = {
  md: "w-[51px] h-[31px]",
  sm: "w-[44px] h-[26px]",
};

const thumbSize: Record<SwitchSize, string> = {
  md: "size-[27px]",
  sm: "size-[22px]",
};

/** Verschuiving van de knop als hij aan staat: spoorbreedte − knop − 2 × 2px marge. */
const thumbOn: Record<SwitchSize, string> = {
  md: "translate-x-[20px]",
  sm: "translate-x-[18px]",
};

/**
 * Aan/uit-schakelaar in iOS-stijl. Het tikvlak is altijd minstens 44px hoog,
 * ook als het spoor kleiner is. Staat nooit vanzelf aan: de ouder bepaalt `checked`.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  size = "md",
  id,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group inline-flex min-h-11 shrink-0 items-center rounded-full",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative inline-flex items-center rounded-full p-[2px]",
          "transition-colors duration-200 ease-out-soft",
          trackSize[size],
          checked ? "bg-positive" : "bg-surface-muted",
        )}
      >
        <span
          className={cn(
            "block rounded-full bg-white shadow-card",
            "transition-transform duration-200 ease-out-soft",
            thumbSize[size],
            checked ? thumbOn[size] : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
