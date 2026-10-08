import type { ReactNode } from "react";
import { formatEuro, formatLongDay, formatSignedEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface KaartjeDetailsData {
  bookingDate: string;
  /** "14:32" als de bank een tijd meestuurde, anders null. */
  bookingTime: string | null;
  amount: number;
  /** Jouw deel bij een gedeelde uitgave (positief), anders null. */
  ownShare: number | null;
  /** Tegenpartij zoals de bank hem stuurde. */
  counterparty: string;
  /** Omschrijving zoals de bank hem stuurde. */
  description: string | null;
}

/**
 * De vaste gegevens van één kaartje, gedeeld door de sheets op het potje-detail en
 * op /transacties: datum, bedrag, tegenpartij en de banktekst. Daarna volgen in de sheet
 * de notitie en "Naar ander potje".
 */
export function KaartjeDetails({ transaction, children }: { transaction: KaartjeDetailsData; children?: ReactNode }) {
  return (
    <dl className="flex flex-col gap-4 text-[15px] leading-5">
      <div>
        <dt className="text-[13px] leading-[18px] text-text-muted">Datum</dt>
        <dd className="font-medium">
          {formatLongDay(transaction.bookingDate)}
          {transaction.bookingTime && ` · ${transaction.bookingTime}`}
        </dd>
      </div>
      <div>
        <dt className="text-[13px] leading-[18px] text-text-muted">Bedrag</dt>
        <dd className={cn("font-semibold tabular-nums", transaction.amount > 0 && "text-positive")}>
          {formatSignedEuro(transaction.amount)}
          {transaction.ownShare !== null && (
            <span className="font-normal text-text-muted"> · jouw deel {formatEuro(transaction.ownShare)}</span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-[13px] leading-[18px] text-text-muted">Tegenpartij</dt>
        <dd className="font-medium break-words">{transaction.counterparty}</dd>
      </div>
      <div>
        <dt className="text-[13px] leading-[18px] text-text-muted">Zoals de bank het stuurde</dt>
        <dd className="break-words">{transaction.description || "Geen omschrijving"}</dd>
      </div>
      {children}
    </dl>
  );
}
