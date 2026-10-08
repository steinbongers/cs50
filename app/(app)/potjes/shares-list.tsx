"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { settlePersonShares } from "@/app/(app)/overzicht/actions";
import { groupSharesByPerson, shareAgeLabel } from "@/components/overview/share-groups";
import { formatDayShort, formatEuro, formatEuroWhole } from "@/lib/format";
import type { OpenShare } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";
import { updateShareStatus } from "./actions";

interface SharesListProps {
  shares: OpenShare[];
  /** Wordt aangeroepen nadat het laatste deel is afgevinkt (na het korte succesbericht). */
  onAllSettled?: () => void;
}

const smallButton =
  "inline-flex min-h-11 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-colors duration-150 disabled:opacity-50";

/**
 * Openstaande delen in Voorgeschoten, per persoon (zoals Splitwise). Tik op een persoon
 * om de losse delen te zien; per deel "Betaald" of "Anders geregeld", per persoon
 * "Alles van Sanne ontvangen". Delen zonder naam staan samen onder "Zonder naam".
 */
export function SharesList({ shares, onAllSettled }: SharesListProps) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settledAny, setSettledAny] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();
  const doneCalled = useRef(false);

  const visible = shares.filter((s) => !hidden.has(s.id));
  const groups = groupSharesByPerson(visible);
  const allDone = visible.length === 0 && settledAny;

  useEffect(() => {
    if (!allDone || doneCalled.current || !onAllSettled) return;
    doneCalled.current = true;
    const timer = window.setTimeout(onAllSettled, 1600);
    return () => window.clearTimeout(timer);
  }, [allDone, onAllSettled]);

  if (visible.length === 0) {
    return (
      <p className="py-6 text-center text-[15px] font-medium" role="status">
        {settledAny ? "Alles terug. Netjes." : "Niemand is je nog iets schuldig. Mooi zo."}
      </p>
    );
  }

  function hide(ids: string[]) {
    setError(null);
    setSettledAny(true);
    setHidden((prev) => new Set([...prev, ...ids]));
  }

  function unhide(ids: string[]) {
    setHidden((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    setError("Dat lukte niet. Probeer het nog eens.");
  }

  function markOne(id: string, status: "received" | "settled_elsewhere") {
    hide([id]);
    startTransition(async () => {
      const result = await updateShareStatus(id, status);
      if (!result.ok) unhide([id]);
    });
  }

  function markAll(ids: string[]) {
    hide(ids);
    startTransition(async () => {
      const result = await settlePersonShares(ids);
      if (!result.ok) unhide(ids);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-[13px] text-text-muted" role="alert">
          {error}
        </p>
      )}
      <ul className="-mx-5 divide-y">
        {groups.map((group) => {
          const label = group.name ?? "Zonder naam";
          const open = expanded === group.key;
          const panelId = `deel-${group.key || "zonder-naam"}`.replace(/\s+/g, "-");
          return (
            <li key={group.key || "__zonder-naam"}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setExpanded((cur) => (cur === group.key ? null : group.key))}
                className="flex min-h-14 w-full items-center gap-3 px-5 py-2 text-left transition-colors duration-150 hover:bg-surface-muted"
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
                >
                  {group.name ? group.name.charAt(0).toLocaleUpperCase("nl-NL") : "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{label}</span>
                  <span className="block text-[13px] text-text-muted">
                    {group.shares.length} {group.shares.length === 1 ? "deel" : "delen"}
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums">{formatEuroWhole(group.total)}</span>
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={cn("shrink-0 text-text-muted transition-transform duration-200", open && "rotate-180")}
                />
              </button>

              {open && (
                <div id={panelId} className="flex flex-col gap-1 px-5 pb-3">
                  <ul className="flex flex-col divide-y rounded-control bg-surface-muted/60">
                    {group.shares.map((share) => {
                      const age = shareAgeLabel(share.createdAt, nowMs);
                      return (
                        <li key={share.id} className="flex flex-col gap-1 px-3 py-2">
                          <div className="flex items-baseline gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm">
                              {share.bookingDate && (
                                <span className="text-text-muted">{formatDayShort(share.bookingDate)} · </span>
                              )}
                              {share.counterparty}
                            </span>
                            <span className="text-sm font-medium tabular-nums">{formatEuro(share.amount)}</span>
                          </div>
                          {age && <p className="text-[12px] text-accent">{age}</p>}
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => markOne(share.id, "settled_elsewhere")}
                              className={cn(smallButton, "text-text-muted hover:bg-surface")}
                            >
                              Anders geregeld
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => markOne(share.id, "received")}
                              className={cn(smallButton, "bg-surface text-text shadow-card hover:bg-surface-muted")}
                            >
                              Betaald
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {group.name && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => markAll(group.shares.map((s) => s.id))}
                      className={cn(smallButton, "mt-1 w-full bg-accent-soft text-accent hover:opacity-90")}
                    >
                      Alles van {group.name} ontvangen
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
