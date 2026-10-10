"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Plus } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { formatEuroWhole } from "@/lib/format";
import { tap } from "@/lib/haptics";
import { tileName } from "@/lib/categories/display";
import { categoryColorClasses } from "@/lib/categories/palette";
import { GELD_TERUG_CATEGORY, VOORGESCHOTEN_CATEGORY } from "@/lib/categories/types";
import type { CategoryOption } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";

interface CategoryTilesProps {
  categories: CategoryOption[];
  /** Inkomend kaartje: spaarpotjes krijgen dan klein "Uit je spaarpot" in plaats van hun bedrag. */
  incoming?: boolean;
  onPick: (category: CategoryOption) => void;
  /** Ingedrukt houden: deze ontvanger gaat voortaan altijd in dit potje. */
  onHold?: (category: CategoryOption) => void;
  onAdd: () => void;
  pulseId: string | null;
  pulseKey: number;
  /** Altijd bij inkomend geld: de tegel 'Geld terug' (retour, refund, iets terugbetaald). */
  refund?: { onOpen: () => void } | null;
  /**
   * Alleen bij inkomend geld met openstaande delen of uitgaven die op geld terug wachten: de tegel
   * 'Terugbetaling'. `total` is het bedrag van de open delen; `awaiting` het aantal wachtende uitgaven.
   */
  repayment?: { total: number; count: number; awaiting: number; onOpen: () => void } | null;
  /** De bijhoudregel staat open (52 px extra): in de compacte stand dan 4 px lagere tegels. */
  tight?: boolean;
}

/** Zo lang ingedrukt houden maakt een vaste ontvanger. */
export const HOLD_MS = 550;
/** Wie verder schuift dan dit, scrolt: dan geen vaste ontvanger. */
const HOLD_SLOP_PX = 10;

/** Vanaf dit aantal tegels worden ze iets lager (72 px). */
const DENSE_FROM = 17;

/** Aantal tegels inclusief Geld terug, Terugbetaling en '+', voor de keuze van de tegelhoogte en sticky kaart. */
export function tileCount(categories: CategoryOption[], withRepayment: boolean, withRefund = false): number {
  return categories.filter((c) => c.systemKey === null).length + (withRepayment ? 1 : 0) + (withRefund ? 1 : 0) + 1;
}

function tileClasses(dense: boolean, tight: boolean) {
  return cn(
    // Inhoud verticaal gecentreerd: zonder bedrag oogt een tegel anders topzwaar.
    "relative flex w-full flex-col items-center justify-center overflow-visible rounded-2xl px-1 py-1 select-none",
    // Compact: 6 + 28 + 26 = 60 past precies, dus bij een open bijhoudregel kan het 4 px lager.
    tight ? "compact:h-[60px]" : "compact:h-16",
    dense ? "h-[72px]" : "h-20",
    "transition-[transform,background-color] duration-100 ease-out-soft active:scale-[0.96]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  );
}

// shrink-0: een naam van twee regels mag nooit door flexbox worden ingedrukt.
// hyphens-manual met zachte streepjes uit tileName() (bij meer woorden eerst op spaties breken);
// break-words alleen als laatste redmiddel.
const nameClasses =
  "line-clamp-2 w-full shrink-0 text-center text-[11px] leading-[13px] font-medium hyphens-manual break-words max-[389px]:text-[10.5px] max-[389px]:tracking-[-0.01em]";
// Op 375 px brede toestellen (SE, mini) is een tegel ±73 px: iets kleinere letter zodat 'verzekeringen' heel blijft.
const amountClasses = "mt-0.5 text-[10px] leading-3 tabular-nums compact:hidden";
// "Uit je spaarpot" is ±68 px bij 10 px: past op één regel, ook op 375 px met iets kleinere letter.
const SAVINGS_OUT_LABEL = "Uit je spaarpot";

/**
 * Onder Terugbetaling: het bedrag van de open delen, of zonder delen het aantal uitgaven dat
 * op geld terug wacht (daar is geen afgesproken bedrag, dus ook geen bedrag om te tonen).
 */
function repaymentLabel({ total, count, awaiting }: { total: number; count: number; awaiting: number }): string {
  if (count > 0 && total > 0) return `${formatEuroWhole(total)} open`;
  return awaiting === 1 ? "1 uitgave" : `${awaiting} uitgaven`;
}

/** Bedrag deze maand in hele euro's; leeg bij € 0. */
function wholeAmount(value: number): string | null {
  const rounded = Math.round(value);
  return rounded === 0 ? null : formatEuroWhole(rounded);
}

/**
 * Alle potjes als gelijke tegels, vier per rij, in de vaste volgorde van de
 * gebruiker. Terugbetaling (alleen bij inkomend geld) staat achteraan, vóór '+',
 * zodat elk potje altijd op dezelfde plek blijft (spiergeheugen). Niets is voorgeselecteerd
 * of gemarkeerd: de gebruiker beslist blanco.
 * Het bedrag van deze maand staat klein op de tegel (besluit van Stein). Bij inkomend geld
 * staan de spaarpotjes tussen de inkomstenpotjes, met klein "Uit je spaarpot" eronder.
 */
export function CategoryTiles({
  categories,
  incoming = false,
  onPick,
  onHold,
  onAdd,
  pulseId,
  pulseKey,
  refund,
  repayment,
  tight = false,
}: CategoryTilesProps) {
  const reduce = useReducedMotion();
  const visible = categories.filter((c) => c.systemKey === null);
  const dense = tileCount(categories, Boolean(repayment), Boolean(refund)) >= DENSE_FROM;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStart = useRef<{ x: number; y: number } | null>(null);
  // Na een geslaagde ingedrukte tik volgt nog een click: die slaan we over.
  const held = useRef(false);

  function cancelHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    holdStart.current = null;
  }

  function fireHold(category: CategoryOption) {
    cancelHold();
    if (held.current || !onHold) return;
    held.current = true;
    onHold(category);
  }

  return (
    <ul role="list" className="mt-3 grid grid-cols-4 gap-1.5">
      {visible.map((category) => {
        const colors = categoryColorClasses(category.color);
        const pulsing = pulseId === category.id;
        const amount = wholeAmount(category.spentThisPeriod);
        // Geld uit je spaarpot halen is geen inkomen: de tegel zegt dat klein, zonder kleur.
        const savingsOut = incoming && category.isSavings;
        const ariaLabel = savingsOut
          ? `${category.name}, uit je spaarpot`
          : amount
            ? `${category.name}, ${amount} deze maand`
            : category.name;
        return (
          <motion.li
            // Bij elke keuze opnieuw afspelen: de key wisselt met pulseKey.
            key={pulsing ? `${category.id}-${pulseKey}` : category.id}
            // Het potje "slikt" het kaartje: eerst even in, dan veert het op als het kaartje aankomt.
            animate={pulsing && !reduce ? { scale: [1, 0.92, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.5, times: [0, 0.5, 0.78, 1], ease: "easeOut" }}
          >
            <button
              type="button"
              data-tile={category.id}
              onClick={() => {
                if (held.current) {
                  held.current = false;
                  return;
                }
                tap();
                onPick(category);
              }}
              onPointerDown={(e) => {
                if (!onHold || e.button !== 0) return;
                held.current = false;
                cancelHold();
                holdStart.current = { x: e.clientX, y: e.clientY };
                holdTimer.current = setTimeout(() => fireHold(category), HOLD_MS);
              }}
              onPointerMove={(e) => {
                const start = holdStart.current;
                if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > HOLD_SLOP_PX) cancelHold();
              }}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
              // Lang drukken op een telefoon (en rechtsklikken) opent anders een menu.
              onContextMenu={(e) => {
                if (!onHold) return;
                e.preventDefault();
                fireHold(category);
              }}
              aria-label={ariaLabel}
              className={cn(
                tileClasses(dense, tight),
                "bg-surface shadow-card [-webkit-touch-callout:none] active:bg-surface-muted",
              )}
            >
              {pulsing && (
                <motion.span
                  aria-hidden
                  className={cn("pointer-events-none absolute inset-0 rounded-2xl", colors.bg)}
                  initial={{ opacity: 0 }}
                  // Kleurt op zodra het kaartje binnen is (na ±0,3 s vliegen).
                  animate={{ opacity: [0, 0, 1, 0] }}
                  transition={{ duration: 0.6, times: [0, 0.5, 0.65, 1], ease: "easeOut" }}
                />
              )}
              <span
                className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-full", colors.bg, colors.text)}
                aria-hidden
              >
                <CategoryIcon icon={category.icon} size={16} strokeWidth={1.75} />
              </span>
              <span className={cn("relative", nameClasses)} aria-hidden>
                {tileName(category.name)}
              </span>
              {savingsOut ? (
                <span
                  className={cn("relative whitespace-nowrap text-text-muted max-[389px]:text-[9.5px]", amountClasses)}
                  aria-hidden
                >
                  {SAVINGS_OUT_LABEL}
                </span>
              ) : (
                <span className={cn("relative text-text-muted", amountClasses)} aria-hidden>
                  {amount ?? ""}
                </span>
              )}
            </button>
          </motion.li>
        );
      })}

      {refund && (
        <li>
          <button
            type="button"
            onClick={() => {
              tap();
              refund.onOpen();
            }}
            aria-label="Geld terug gekregen"
            className={cn(tileClasses(dense, tight), "bg-surface shadow-card active:bg-surface-muted")}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full",
                categoryColorClasses(GELD_TERUG_CATEGORY.color).bg,
                categoryColorClasses(GELD_TERUG_CATEGORY.color).text,
              )}
              aria-hidden
            >
              <CategoryIcon icon={GELD_TERUG_CATEGORY.icon} size={16} strokeWidth={1.75} />
            </span>
            <span className={nameClasses} aria-hidden>
              {tileName(GELD_TERUG_CATEGORY.name)}
            </span>
          </button>
        </li>
      )}

      {repayment && (
        <li>
          <button
            type="button"
            onClick={() => {
              tap();
              repayment.onOpen();
            }}
            aria-label={`Terugbetaling, ${repaymentLabel(repayment)}`}
            className={cn(tileClasses(dense, tight), "bg-accent-soft ring-1 ring-accent/40 ring-inset active:bg-accent-soft")}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-accent" aria-hidden>
              <CategoryIcon icon={VOORGESCHOTEN_CATEGORY.icon} size={16} strokeWidth={1.75} />
            </span>
            <span className={nameClasses}>{tileName("Terugbetaling")}</span>
            <span className={cn(amountClasses, "text-accent-strong")}>{repaymentLabel(repayment)}</span>
          </button>
        </li>
      )}

      <li>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Nieuw potje maken"
          className={cn(tileClasses(dense, tight), "border border-dashed border-border bg-transparent text-text-muted active:bg-surface-muted")}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted" aria-hidden>
            <Plus size={16} strokeWidth={1.75} />
          </span>
          <span className={nameClasses} aria-hidden>
            Nieuw potje
          </span>
        </button>
      </li>
    </ul>
  );
}
