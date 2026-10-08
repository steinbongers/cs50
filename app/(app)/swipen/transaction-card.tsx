"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
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
}

/**
 * De transactiekaart bovenin: datum groot, tegenpartij groot, bedrag eronder,
 * omschrijving en saldo klein. Tik op de kaart voor de volledige banktekst.
 */
export function TransactionCard({ transaction, onOpenDetails }: TransactionCardProps) {
  const reduce = useReducedMotion();
  const isIncoming = transaction.amount > 0;

  return (
    <motion.article
      variants={reduce ? reducedMotion : fullMotion}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 flex cursor-pointer flex-col justify-between rounded-card-lg bg-surface p-5 text-left shadow-float will-change-transform"
      aria-label={`${transaction.counterparty}, ${formatSignedEuro(transaction.amount)}, ${formatLongDay(transaction.bookingDate)}. Tik voor de banktekst.`}
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
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-medium">
          {formatLongDay(transaction.bookingDate)}
          {transaction.bookingTime && <span className="text-text-muted"> · {transaction.bookingTime}</span>}
        </p>
        {transaction.skippedCount > 0 && (
          <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-text-muted">
            Eerder op later
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h2 className="line-clamp-2 text-2xl font-semibold leading-tight tracking-tight">{transaction.counterparty}</h2>
        <p
          className={cn(
            "mt-1.5 text-3xl font-semibold tabular-nums tracking-tight",
            isIncoming ? "text-positive" : "text-text",
          )}
        >
          {formatSignedEuro(transaction.amount)}
        </p>
      </div>

      <div className="flex min-h-5 items-end justify-between gap-3 text-sm text-text-muted">
        <p className="line-clamp-2 min-w-0 flex-1">{transaction.description ?? ""}</p>
        {transaction.balanceAfter !== null && (
          <p className="shrink-0 tabular-nums">Saldo erna {formatEuro(transaction.balanceAfter)}</p>
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
