"use client";

import { useState, useTransition } from "react";
import { refreshConnection } from "@/app/bank/actions";
import { Spinner } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** "Ververs": haalt nieuwe transacties op, hoogstens eens per 15 minuten. */
export function RefreshButton({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await refreshConnection();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(
        result.inserted === 0
          ? "Niets nieuws. Je bent helemaal bij."
          : result.inserted === 1
            ? "1 nieuwe transactie opgehaald."
            : `${result.inserted} nieuwe transacties opgehaald.`,
      );
    });
  }

  const synced = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex items-center justify-between gap-3 px-1 text-xs text-text-muted">
      <span className="min-w-0 truncate">{message ?? (synced ? `Bijgewerkt ${synced}` : "Nog niet bijgewerkt")}</span>
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className={cn("flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 font-medium text-primary hover:bg-primary-soft", isPending && "opacity-60")}
      >
        {isPending && <Spinner className="size-3.5" />}
        Ververs
      </button>
    </div>
  );
}
