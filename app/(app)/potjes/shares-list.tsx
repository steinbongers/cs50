"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatDay, formatEuro } from "@/lib/format";
import type { OpenShare } from "@/lib/transactions/queries";
import { updateShareStatus } from "./actions";

/** Openstaande delen in Voorgeschoten, met per deel 'Ontvangen' of 'Anders geregeld'. */
export function SharesList({ shares }: { shares: OpenShare[] }) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();
  const visible = shares.filter((s) => !hidden.has(s.id));

  if (visible.length === 0) {
    return <p className="px-4 py-3 text-sm text-text-muted">Niemand is je nog iets schuldig. Mooi zo.</p>;
  }

  function mark(id: string, status: "received" | "settled_elsewhere") {
    setHidden((prev) => new Set([...prev, id]));
    startTransition(async () => {
      const result = await updateShareStatus(id, status);
      if (!result.ok) {
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  }

  const groups = new Map<string, OpenShare[]>();
  for (const share of visible) {
    const list = groups.get(share.transactionId) ?? [];
    list.push(share);
    groups.set(share.transactionId, list);
  }

  return (
    <ul className="divide-y">
      {[...groups.values()].map((group) => (
        <li key={group[0].transactionId} className="px-4 py-3">
          <p className="text-sm font-medium">
            {group[0].counterparty}
            {group[0].bookingDate && <span className="font-normal text-text-muted"> · {formatDay(group[0].bookingDate)}</span>}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {group.map((share, index) => (
              <li key={share.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{share.personName || `Persoon ${index + 1}`}</span>
                <span className="text-sm font-medium tabular-nums">{formatEuro(share.amount)}</span>
                <Button variant="secondary" className="min-h-11 px-3 text-xs" onClick={() => mark(share.id, "received")}>
                  Ontvangen
                </Button>
                <Button variant="ghost" className="min-h-11 px-2 text-xs" onClick={() => mark(share.id, "settled_elsewhere")}>
                  Anders
                </Button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
