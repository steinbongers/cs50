import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Rijen staan in een kaart met overflow-hidden; daarom tekenen we de focusring
 * naar binnen, anders valt hij aan de randen weg.
 */
export const ROW_FOCUS = "focus-visible:-outline-offset-2";

/** Label met een kleine, gedempte hint eronder, voor in een ListRow. */
export function RowLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="block py-2">
      <span className="block">{label}</span>
      {hint && <span className="block truncate text-[13px] leading-[18px] text-text-muted">{hint}</span>}
    </span>
  );
}

interface AnchorRowProps {
  href: string;
  icon: LucideIcon;
  iconClass: string;
  label: string;
  hint?: string;
  value?: string;
  download?: boolean;
}

/**
 * Rij als gewone link, voor bestemmingen buiten de router om: een download of mailto.
 * Zelfde maten als ListRow (min 52 hoog, icoontegel 30, ingesprongen scheidingslijn).
 */
export function AnchorRow({ href, icon: Icon, iconClass, label, hint, value, download }: AnchorRowProps) {
  return (
    <a
      href={href}
      download={download || undefined}
      className={cn(
        "group/row flex min-h-[52px] w-full items-center gap-3 pl-4 text-left",
        "transition-colors duration-150 active:bg-surface-muted",
        ROW_FOCUS,
      )}
    >
      <span aria-hidden className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-[8px]", iconClass)}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <span className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border pr-3 group-last/row:border-b-0">
        <span className="min-w-0 flex-1 text-[16px] text-text">
          <RowLabel label={label} hint={hint} />
        </span>
        {value && <span className="max-w-[45%] truncate text-[15px] text-text-muted">{value}</span>}
        <ChevronRight aria-hidden size={16} className="shrink-0 text-text-muted/60" />
      </span>
    </a>
  );
}

/** Kleine uitlegregel onder een rij, binnen dezelfde kaart. */
export function RowNote({ children }: { children: ReactNode }) {
  return <p className="px-4 pt-1 pb-3 text-[13px] leading-[18px] text-text-muted">{children}</p>;
}
