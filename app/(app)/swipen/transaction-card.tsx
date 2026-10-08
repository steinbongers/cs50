"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { formatDay, formatSignedEuro } from "@/lib/format";
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
  incomeHint?: boolean;
}

/** De transactiekaart bovenin: tegenpartij groot, bedrag eronder, datum en omschrijving klein. */
export function TransactionCard({ transaction, incomeHint = false }: TransactionCardProps) {
  const reduce = useReducedMotion();
  const isIncoming = transaction.amount > 0;

  return (
    <motion.article
      variants={reduce ? reducedMotion : fullMotion}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 flex flex-col justify-between rounded-card-lg bg-surface p-5 shadow-float will-change-transform"
      aria-label={`${transaction.counterparty}, ${formatSignedEuro(transaction.amount)}, ${formatDay(transaction.bookingDate)}`}
    >
      <div className="flex items-center justify-between gap-3 text-sm text-text-muted">
        <span>{formatDay(transaction.bookingDate)}</span>
        {transaction.skippedCount > 0 && (
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium">
            Eerder op later gezet
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h2 className="line-clamp-2 text-2xl font-semibold leading-tight tracking-tight">
          {transaction.counterparty}
        </h2>
        <p
          className={cn(
            "mt-1.5 text-3xl font-semibold tabular-nums tracking-tight",
            isIncoming ? "text-positive" : "text-negative",
          )}
        >
          {formatSignedEuro(transaction.amount)}
        </p>
      </div>

      <div className="min-h-5 text-sm text-text-muted">
        {incomeHint && isIncoming ? (
          <p>Inkomend geld. Kies Inkomen, of het potje waarvan dit een terugbetaling is.</p>
        ) : (
          transaction.description && <p className="line-clamp-2">{transaction.description}</p>
        )}
      </div>
    </motion.article>
  );
}

/** Vage kaart erachter, zodat je ziet dat er meer op de stapel ligt. */
export function GhostCard({ depth = 1 }: { depth?: 1 | 2 }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 rounded-card-lg bg-surface shadow-card",
        depth === 1 ? "translate-y-2.5 scale-[0.96] opacity-70" : "translate-y-5 scale-[0.92] opacity-40",
      )}
    />
  );
}
