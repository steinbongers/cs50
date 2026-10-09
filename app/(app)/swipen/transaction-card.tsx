"use client";

import { motion, useIsPresent, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef } from "react";
import { formatEuro, formatLongDay, formatSignedEuro } from "@/lib/format";
import type { OpenTransaction } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";

export type ExitKind = "assign" | "skip" | "none";

const spring = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.8 };

const fullMotion: Variants = {
  enter: { y: 28, opacity: 0, scale: 0.96, rotate: 0 },
  center: { y: 0, opacity: 1, scale: 1, rotate: 0, transition: spring },
  exit: (kind: ExitKind) =>
    kind === "skip"
      ? { x: 140, rotate: 6, opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }
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
}

export const CASH_QUESTION = "Waar heb je dit contant geld aan uitgegeven?";

/**
 * De kaart bovenin: datum, tegenpartij en bedrag groot, omschrijving (of je
 * notitie) en saldo klein. Tik op de kaart voor de volledige banktekst.
 * Bij een pinopname staat onderaan de vraag in plaats van omschrijving en saldo (het saldo staat in de banktekst).
 */
export function TransactionCard({ transaction, onOpenDetails, ownShare = null, cash = false }: TransactionCardProps) {
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
      : (transaction.note ?? transaction.description ?? "");

  return (
    <motion.article
      ref={ref}
      variants={reduce ? reducedMotion : fullMotion}
      initial="enter"
      animate="center"
      exit="exit"
      className="relative flex h-full cursor-pointer [grid-area:1/1] flex-col justify-between overflow-hidden rounded-card-lg bg-surface p-4 text-left shadow-float will-change-transform focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary/60"
      aria-label={`${cash ? "Contant opgenomen bij " : ""}${transaction.counterparty}, ${formatSignedEuro(transaction.amount)}, ${formatLongDay(transaction.bookingDate)}. Tik voor de banktekst.`}
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
            cash && "font-medium text-text",
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
