"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ACTION_LABEL, UNDO_WINDOW_MS } from "@/config/app";
import type { CategoryOption, OpenTransaction } from "@/lib/transactions/queries";
import { assignCategory, completeSession, skipTransaction, undoAssign } from "./actions";
import { CategoryButtons } from "./category-buttons";
import { SessionSummary, type Decision } from "./session-summary";
import { GhostCard, TransactionCard, type ExitKind } from "./transaction-card";
import { UndoToast } from "./undo-toast";

interface SortScreenProps {
  categories: CategoryOption[];
  transactions: OpenTransaction[];
  totalOpen: number;
}

/**
 * Het hart van de app. Eén kaart bovenin, alle potjes als knoppen eronder.
 * De gebruiker beslist zelf, de app vult niets in en markeert niets vooraf.
 */
export function SortScreen({ categories, transactions, totalOpen }: SortScreenProps) {
  const [queue, setQueue] = useState<OpenTransaction[]>(transactions);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [undone, setUndone] = useState(0);
  const [exitKind, setExitKind] = useState<ExitKind>("assign");
  const [undo, setUndo] = useState<Decision | null>(null);
  const [pulse, setPulse] = useState<{ id: string | null; key: number }>({ id: null, key: 0 });
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [, startTransition] = useTransition();

  const shownAt = useRef<number>(0);
  const sessionStart = useRef<number | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = useRef(false);

  const current = queue[0] ?? null;
  const hasIncomeCategory = categories.some((c) => c.isIncome);

  // Starttijd van de ronde en per kaart, voor de meting "duur van kaart tot beslissing".
  useEffect(() => {
    sessionStart.current ??= Date.now();
  }, []);

  useEffect(() => {
    shownAt.current = performance.now();
  }, [current?.id]);

  // Undo-knop verdwijnt na UNDO_WINDOW_MS.
  useEffect(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (!undo) return;
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_WINDOW_MS);
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [undo]);

  const assignedCount = decisions.length;
  const remaining = Math.max(totalOpen - assignedCount, queue.length);
  const finished = current === null;

  // Einde van de ronde registreren (één keer).
  useEffect(() => {
    if (!finished || completed.current) return;
    completed.current = true;
    const summary = {
      assigned: assignedCount,
      skipped,
      undone,
      durationMs: Date.now() - (sessionStart.current ?? Date.now()),
    };
    startTransition(() => {
      void completeSession(summary);
    });
  }, [finished, assignedCount, skipped, undone, startTransition]);

  const pick = useCallback(
    (category: CategoryOption) => {
      if (!current) return;
      const transaction = current;
      const durationMs = performance.now() - shownAt.current;
      const decision: Decision = { transaction, category };

      setError(null);
      setExitKind("assign");
      setQueue((q) => q.slice(1));
      setDecisions((d) => [...d, decision]);
      setUndo(decision);
      setPulse((p) => ({ id: category.id, key: p.key + 1 }));
      setAnnouncement(`${transaction.counterparty} in ${category.name}`);

      startTransition(async () => {
        const result = await assignCategory(transaction.id, category.id, durationMs);
        if (!result.ok) {
          // Terugdraaien: kaart terug vooraan, keuze weg.
          setQueue((q) => [transaction, ...q.filter((t) => t.id !== transaction.id)]);
          setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
          setUndo((u) => (u?.transaction.id === transaction.id ? null : u));
          setError(result.error);
        }
      });
    },
    [current, startTransition],
  );

  const skip = useCallback(() => {
    if (!current || queue.length < 2) return;
    const transaction = current;
    setError(null);
    setExitKind("skip");
    setQueue((q) => [...q.slice(1), { ...transaction, skippedCount: transaction.skippedCount + 1 }]);
    setSkipped((s) => s + 1);
    setAnnouncement(`${transaction.counterparty} op later gezet`);
    startTransition(async () => {
      const result = await skipTransaction(transaction.id);
      if (!result.ok) setError(result.error);
    });
  }, [current, queue.length, startTransition]);

  const handleUndo = useCallback(() => {
    if (!undo) return;
    const { transaction, category } = undo;
    setUndo(null);
    setError(null);
    setExitKind("none");
    setQueue((q) => [transaction, ...q]);
    setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
    setUndone((u) => u + 1);
    setAnnouncement(`${transaction.counterparty} terug uit ${category.name}`);
    startTransition(async () => {
      const result = await undoAssign(transaction.id);
      if (!result.ok) setError(result.error);
    });
  }, [undo, startTransition]);

  if (finished) {
    return (
      <>
        <SessionSummary decisions={decisions} skipped={skipped} remaining={remaining} />
        <UndoToast
          id={undo ? undo.transaction.id : null}
          counterparty={undo?.transaction.counterparty ?? ""}
          categoryName={undo?.category.name ?? ""}
          onUndo={handleUndo}
        />
      </>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="safe-top flex flex-col gap-2 px-4 pt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{ACTION_LABEL}</h1>
          <p className="text-sm text-text-muted tabular-nums">
            Nog {remaining} te gaan
          </p>
        </div>
        <ProgressBar
          value={assignedCount}
          max={assignedCount + remaining}
          label={`${assignedCount} van ${assignedCount + remaining} gedaan`}
        />
      </header>

      <section className="px-4 pt-5" aria-label="Transactie">
        <div className="relative h-52">
          {queue.length > 2 && <GhostCard depth={2} />}
          {queue.length > 1 && <GhostCard depth={1} />}
          <AnimatePresence custom={exitKind} initial={false}>
            <TransactionCard key={current.id} transaction={current} incomeHint={hasIncomeCategory} />
          </AnimatePresence>
        </div>
      </section>

      <section className="flex flex-1 flex-col px-4 pt-6" aria-label="Potje kiezen">
        <p className="mb-3 text-sm font-medium text-text-muted">
          {current.amount > 0 ? "Waar hoort dit inkomende geld?" : "In welk potje hoort dit?"}
        </p>
        <CategoryButtons categories={categories} onPick={pick} pulseId={pulse.id} pulseKey={pulse.key} />

        {error && (
          <p className="mt-4 rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
            {error}
          </p>
        )}

        <div className="mt-auto pt-6">
          <Button variant="ghost" fullWidth onClick={skip} disabled={queue.length < 2}>
            {queue.length < 2 ? "Dit is de laatste" : "Later"}
          </Button>
        </div>
      </section>

      <UndoToast
        id={undo ? undo.transaction.id : null}
        counterparty={undo?.transaction.counterparty ?? ""}
        categoryName={undo?.category.name ?? ""}
        onUndo={handleUndo}
      />

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
