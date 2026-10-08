import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export interface ListGroupProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Groep rijen in iOS-stijl (Instellingen): kleine kop, daaronder één kaart. */
export function ListGroup({ title, children, className }: ListGroupProps) {
  return (
    <section className={className}>
      {title && <h2 className="px-4 pb-1.5 text-[13px] font-medium text-text-muted">{title}</h2>}
      <Card padding="none" className="overflow-hidden">
        {children}
      </Card>
    </section>
  );
}

export interface ListRowProps {
  /** Lucide-icoon; wordt op 18px getekend in een tegel van 30px. */
  icon?: LucideIcon;
  /** Kleuren van de icoontegel, bijvoorbeeld `bg-cat-groen-soft text-cat-groen`. */
  iconClass?: string;
  label: ReactNode;
  /** Waarde rechts, gedempt en afgekapt (bijvoorbeeld "ING" of "25e"). */
  value?: ReactNode;
  /** Maakt de rij een link, met chevron. */
  href?: string;
  /** Maakt de rij een knop (zonder chevron). */
  onClick?: () => void;
  /** Label in de negatieve kleur, voor "Uitloggen" of "Account verwijderen". */
  danger?: boolean;
  /** Eigen element rechts, bijvoorbeeld een Switch. Vervangt de chevron. */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Rij binnen een ListGroup. Minimaal 52px hoog. De scheidingslijn begint bij het label
 * (ingesprongen, zoals iOS) en valt weg bij de laatste rij.
 */
export function ListRow({
  icon: Icon,
  iconClass,
  label,
  value,
  href,
  onClick,
  danger = false,
  trailing,
  className,
}: ListRowProps) {
  const interactive = Boolean(href || onClick);
  const rowClass = cn(
    "group/row flex min-h-[52px] w-full items-center gap-3 pl-4 text-left",
    interactive && "transition-colors duration-150 active:bg-surface-muted focus-visible:-outline-offset-2",
    className,
  );

  const content = (
    <>
      {Icon && (
        <span
          aria-hidden
          className={cn(
            "flex size-[30px] shrink-0 items-center justify-center rounded-[8px]",
            iconClass ?? "bg-primary-soft text-primary",
          )}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
      )}
      <span className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border pr-3 group-last/row:border-b-0">
        <span className={cn("min-w-0 flex-1 text-[15px] leading-5", danger ? "text-negative" : "text-text")}>
          {label}
        </span>
        {value !== undefined && value !== null && (
          <span className="max-w-[45%] truncate text-[15px] text-text-muted">{value}</span>
        )}
        {trailing}
        {href && !trailing && (
          <ChevronRight aria-hidden size={16} className="shrink-0 text-text-muted/60" />
        )}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {content}
      </button>
    );
  }
  return <div className={rowClass}>{content}</div>;
}
