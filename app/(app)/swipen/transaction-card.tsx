"use client";

import { motion, useIsPresent, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef } from "react";
import { formatEuro, formatLongDay, formatSignedEuro } from "@/lib/format";
import type { OpenTransaction } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";

export type ExitKind = "assign" | "skip" | "none";

/** Hoe de kaart weggaat; bij een tik op een tegel vliegt hij naar die tegel (verschuiving in px). */
export interface CardExit {
  kind: ExitKind;
  target: { x: number; y: number } | null;
}

const spring = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.9 };

const fullMotion: Variants = {
  enter: { y: 28, opacity: 0, scale: 0.96, rotate: 0 },
  // Het volgende kaartje wacht heel even, zodat het vliegende kaartje eerst vrij kan wegspringen.
  center: { y: 0, opacity: 1, scale: 1, rotate: 0, transition: { ...spring, delay: 0.12 } },
  exit: ({ kind, target }: CardExit) =>
    kind === "skip"
      ? { x: 140, rotate: 6, opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }
      : kind === "assign" && target
        ? {
            // Eén doorlopende beweging, zonder knikken: x en y elk met een eigen curve. De y-curve
            // gaat eerst iets terug (omhoog) en duikt dan het potje in; zo ontstaat een zachte boog.
            x: target.x,
            y: target.y,
            scale: 0.06,
            rotate: target.x >= 0 ? 12 : -12,
            opacity: [1, 1, 0],
            transition: {
              x: { duration: 0.56, ease: [0.33, 0, 0.45, 1] },
              y: { duration: 0.56, ease: [0.42, -0.32, 0.62, 0.92] },
              scale: { duration: 0.56, ease: [0.4, 0, 0.7, 0.6] },
              rotate: { duration: 0.56, ease: [0.4, 0, 0.6, 1] },
              opacity: { duration: 0.56, times: [0, 0.88, 1], ease: "linear" },
            },
          }
        : { y: -90, rotate: -4, scale: 0.9, opacity: 0, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } },
};

const reducedMotion: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
};

interface TransactionCardProps {
  transaction: OpenTransaction;
  onOpenDetails: () => void;
  /** In de verdeelmodus: jouw deel, in plaats van de omschrijving. */
  ownShare?: number | null;
  /** Pinopname: label "Contant opgenomen" en onderaan de vraag waar het geld heen ging. */
  cash?: boolean;
  /** Herkende creditcard-afrekening: een hint dat je hem over je potjes kunt verdelen. */
  creditCard?: boolean;
}

export const CASH_QUESTION = "Waar heb je dit contant geld aan uitgegeven?";
/** Onderaan een herkende creditcard-afrekening (in plaats van de omschrijving, die zegt dan weinig). */
export const CREDIT_CARD_HINT = "Verdeel over je potjes met Verdelen";

/**
 * De kaart bovenin: datum, tegenpartij en bedrag groot, omschrijving (of je
 * notitie) en saldo klein. Tik op de kaart voor de volledige banktekst.
 * Bij een pinopname staat onderaan de vraag in plaats van omschrijving en saldo (het saldo staat in de banktekst).
 * Bij een herkende creditcard staat onderaan de hint om hem te verdelen (je eigen notitie gaat voor).
 */
export function TransactionCard({
  transaction,
  onOpenDetails,
  ownShare = null,
  cash = false,
  creditCard = false,
}: TransactionCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const isPresent = useIsPresent();
  // Na het sluiten van de banktekst-sheet krijgt de kaart de focus terug (met ring bij toetsenbord).
  // Bij een kaartwissel laten we die focus los zodra deze kaart wegschuift, zodat de ring niet
  // over de kaartwissel heen blijft hangen. Elke kaart is een eigen element (key = kaart-id).
  useEffect(() => {
    if (!isPresent && ref.current && ref.current === document.activeElement) ref.current.blur();
  }, [isPresent]);
  const isIncoming = transaction.amount > 0;
  const footer = cash
    ? CASH_QUESTION
    : ownShare !== null
      ? `Jouw deel ${formatEuro(ownShare)}`
      : creditCard
        ? (transaction.note ?? CREDIT_CARD_HINT)
        : (transaction.note ?? transaction.description ?? "");

  return (
    <motion.article
      ref={ref}
      variants={reduce ? reducedMotion : fullMotion}
      initial="enter"
      animate="center"
      exit="exit"
      className="relative flex h-full cursor-pointer [grid-area:1/1] flex-col justify-between overflow-hidden rounded-card-lg bg-surface p-4 text-left shadow-float will-change-transform focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary/60"
      aria-label={`${cash ? "Contant opgenomen bij " : ""}${transaction.counterparty}, ${formatSignedEuro(transaction.amount)}, ${formatLongDay(transaction.bookingDate)}.${creditCard ? " Creditcard, verdeel hem over je potjes." : ""} Tik voor de banktekst.`}
      role="button"
      tabIndex={0}
      onClick={onOpenDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[15px] leading-5 font-medium">
          {formatLongDay(transaction.bookingDate)}
          {transaction.bookingTime && <span className="text-text-muted"> · {transaction.bookingTime}</span>}
        </p>
        {cash ? (
          <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] leading-[13px] font-medium text-primary">
            Contant opgenomen
          </span>
        ) : creditCard ? (
          <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] leading-[13px] font-medium text-primary">
            Creditcard
          </span>
        ) : transaction.skippedCount > 0 && (
          <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] leading-[13px] font-medium text-text-muted">
            Al eens op Later
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="line-clamp-1 text-[22px] leading-[28px] font-semibold tracking-[-0.02em] break-words">
          {/* ABN AMRO stuurt bij een opname vaak geen tegenpartij mee; dan is "Geldautomaat" duidelijker. */}
          {cash && transaction.counterparty === "Onbekende tegenpartij" ? "Geldautomaat" : transaction.counterparty}
        </p>
        <p
          className={cn(
            "text-[28px] leading-[34px] font-semibold tabular-nums tracking-[-0.02em]",
            isIncoming ? "text-positive" : "text-text",
          )}
        >
          {formatSignedEuro(transaction.amount)}
        </p>
      </div>

      <div className="flex items-end justify-between gap-3 text-[13px] leading-[18px] text-text-muted">
        <p
          className={cn(
            "line-clamp-1 min-w-0 flex-1 break-words",
            ownShare !== null && "font-medium text-text tabular-nums",
            (cash || (creditCard && !transaction.note)) && "font-medium text-text",
          )}
        >
          {footer}
        </p>
        {!cash && transaction.balanceAfter !== null && (
          <p className="shrink-0 tabular-nums">Saldo daarna {formatEuro(transaction.balanceAfter)}</p>
        )}
      </div>
    </motion.article>
  );
}

/** Kaart erachter, zodat je ziet dat er meer op de stapel ligt. Steekt hooguit 8 px uit. */
export function GhostCard({ depth = 1 }: { depth?: 1 | 2 }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 rounded-card-lg bg-surface shadow-card",
        // Zichtbaar deel = verschuiving − (1 − schaal) × hoogte / 2: hooguit 8 px, ook bij 136 px.
        depth === 1 ? "translate-y-1.5 scale-[0.97] opacity-70" : "translate-y-[11px] scale-[0.95] opacity-40",
      )}
    />
  );
}
