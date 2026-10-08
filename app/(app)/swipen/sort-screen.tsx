"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CategoryEditor } from "@/components/categories/category-editor";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { ACTION_LABEL, UNDO_WINDOW_MS } from "@/config/app";
import { DEFAULT_CATEGORY_ICON } from "@/lib/categories/icons";
import { CATEGORY_COLORS } from "@/lib/categories/palette";
import { VOORGESCHOTEN_CATEGORY, type CategoryDraft } from "@/lib/categories/types";
import type { CategoryOption, OpenShare, OpenTransaction } from "@/lib/transactions/queries";
import { splitEqually } from "@/lib/transactions/split";
import {
  assignCategory,
  completeSession,
  createCategory,
  setCoachStep,
  settleSharesWithTransaction,
  skipTransaction,
  undoAssign,
  type SplitInput,
} from "./actions";
import { CategoryTiles } from "./category-tiles";
import { COACH_STEPS, CoachTip } from "./coach-tip";
import { RawSheet } from "./raw-sheet";
import { SessionSummary, type Decision } from "./session-summary";
import { SettleSheet } from "./settle-sheet";
import { EMPTY_SPLIT, SplitPanel, type SplitState } from "./split-panel";
import { GhostCard, TransactionCard, type ExitKind } from "./transaction-card";
import { UndoToast } from "./undo-toast";

interface SortScreenProps {
  categories: CategoryOption[];
  transactions: OpenTransaction[];
  totalOpen: number;
  openShares: OpenShare[];
  /** Eerder gebruikte namen, als suggesties bij het verdelen. */
  knownNames?: string[];
  coachStep: number;
}

const VOORGESCHOTEN_OPTION: CategoryOption = {
  id: "voorgeschoten",
  name: VOORGESCHOTEN_CATEGORY.name,
  icon: VOORGESCHOTEN_CATEGORY.icon,
  color: VOORGESCHOTEN_CATEGORY.color,
  isIncome: false,
  systemKey: VOORGESCHOTEN_CATEGORY.systemKey,
  spentThisPeriod: 0,
};

/**
 * Het hart van de app. Eén kaart bovenin, alle potjes als tegels eronder.
 * De gebruiker beslist zelf, de app vult niets in en markeert niets vooraf.
 */
export function SortScreen({
  categories: initialCategories,
  transactions,
  totalOpen,
  openShares: initialOpenShares,
  knownNames = [],
  coachStep: initialCoachStep,
}: SortScreenProps) {
  const [queue, setQueue] = useState<OpenTransaction[]>(transactions);
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  // Openstaande delen houden we lokaal bij: nieuwe delen komen terug uit assignCategory,
  // zodat er geen refresh (en dus geen verlies van ongedaan maken) nodig is.
  const [openShares, setOpenShares] = useState<OpenShare[]>(initialOpenShares);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [undone, setUndone] = useState(0);
  const [exitKind, setExitKind] = useState<ExitKind>("assign");
  const [undo, setUndo] = useState<Decision | null>(null);
  const [pulse, setPulse] = useState<{ id: string | null; key: number }>({ id: null, key: 0 });
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Verdeling hoort bij één kaart: wisselt de kaart, dan begint hij schoon.
  const [splitFor, setSplitFor] = useState<{ id: string | null; state: SplitState }>({ id: null, state: EMPTY_SPLIT });
  const [settledShareIds, setSettledShareIds] = useState<Set<string>>(() => new Set());
  const [settleOpen, setSettleOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<CategoryDraft | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [coachStep, setCoach] = useState(initialCoachStep);
  const [totalAtStart, setTotalAtStart] = useState(totalOpen);
  const [isPending, startTransition] = useTransition();

  const shownAt = useRef<number>(0);
  const sessionStart = useRef<number | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Voor welke stapel de ronde al als afgerond is gemeld.
  const completedFor = useRef<OpenTransaction[] | null>(null);
  // Per Terugbetaling: welke delen ermee betaald zijn, zodat ongedaan maken ze lokaal terugzet.
  const settledByTransaction = useRef(new Map<string, string[]>());
  // De stapel waarmee de lokale staat is gevuld.
  const [adoptedBatch, setAdoptedBatch] = useState(transactions);

  const current = queue[0] ?? null;
  const split = splitFor.id === current?.id ? splitFor.state : EMPTY_SPLIT;
  const availableShares = openShares.filter((s) => !settledShareIds.has(s.id));
  const openSharesTotal = availableShares.reduce((a, s) => a + s.amount, 0);

  useEffect(() => {
    sessionStart.current = Date.now();
  }, [adoptedBatch]);

  // Per kaart: starttijd voor de meting "duur van kaart tot beslissing".
  useEffect(() => {
    shownAt.current = performance.now();
  }, [current?.id]);

  useEffect(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (!undo) return;
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_WINDOW_MS);
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [undo]);

  const assignedCount = decisions.length;
  const remaining = Math.max(totalAtStart - assignedCount, queue.length);
  const finished = current === null;

  // Nieuwe stapel uit de server (na "Volgende stapel" in de samenvatting) overnemen,
  // maar alleen als de ronde af is: tijdens het sorteren blijft de lokale staat leidend.
  // Props van een refresh halverwege de ronde bevatten kaarten die inmiddels een potje
  // hebben; die nemen we niet over. Staat aanpassen tijdens het renderen is hier de
  // aangeraden vorm (geen effect nodig).
  const isFreshBatch =
    adoptedBatch !== transactions &&
    transactions.length > 0 &&
    !transactions.some((t) => decisions.some((d) => d.transaction.id === t.id));
  if (finished && isFreshBatch) {
    setAdoptedBatch(transactions);
    setQueue(transactions);
    setCategories(initialCategories);
    setOpenShares(initialOpenShares);
    setDecisions([]);
    setSkipped(0);
    setUndone(0);
    setUndo(null);
    setError(null);
    setSettledShareIds(new Set());
    setTotalAtStart(totalOpen);
  }

  useEffect(() => {
    if (!finished || completedFor.current === adoptedBatch) return;
    completedFor.current = adoptedBatch;
    const summary = {
      assigned: assignedCount,
      skipped,
      undone,
      durationMs: Date.now() - (sessionStart.current ?? Date.now()),
    };
    startTransition(() => {
      void completeSession(summary);
    });
  }, [finished, adoptedBatch, assignedCount, skipped, undone, startTransition]);

  function bumpCategoryTotal(categoryId: string, delta: number) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, spentThisPeriod: Math.round((c.spentThisPeriod + delta) * 100) / 100 } : c,
      ),
    );
  }

  const pick = useCallback(
    (category: CategoryOption) => {
      if (!current) return;
      const transaction = current;
      const durationMs = performance.now() - shownAt.current;
      const useSplit = split.enabled && transaction.amount < 0;
      const ownShare = useSplit ? splitEqually(transaction.amount, split.persons).ownShare : undefined;
      const splitInput: SplitInput | undefined = useSplit
        ? { persons: split.persons, method: split.method, names: split.method === "bank" ? split.names : undefined }
        : undefined;
      const decision: Decision = { transaction, category, ownShare };

      const delta = category.isIncome
        ? Math.max(transaction.amount, 0)
        : transaction.amount < 0
          ? (ownShare ?? -transaction.amount)
          : -transaction.amount;

      setError(null);
      setExitKind("assign");
      setQueue((q) => q.slice(1));
      setDecisions((d) => [...d, decision]);
      setUndo(decision);
      setPulse((p) => ({ id: category.id, key: p.key + 1 }));
      bumpCategoryTotal(category.id, delta);
      setAnnouncement(
        useSplit
          ? `${transaction.counterparty}: jouw deel in ${category.name}, de rest in Voorgeschoten`
          : `${transaction.counterparty} in ${category.name}`,
      );

      startTransition(async () => {
        const result = await assignCategory(transaction.id, category.id, durationMs, splitInput);
        if (!result.ok) {
          setQueue((q) => [transaction, ...q.filter((t) => t.id !== transaction.id)]);
          setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
          setUndo((u) => (u?.transaction.id === transaction.id ? null : u));
          bumpCategoryTotal(category.id, -delta);
          setError(result.error);
          return;
        }
        // Nieuwe openstaande delen meteen beschikbaar voor de tegel Terugbetaling.
        if (result.shares.length > 0) {
          setOpenShares((prev) => [...prev.filter((s) => s.transactionId !== transaction.id), ...result.shares]);
        }
      });
    },
    [current, split, startTransition],
  );

  const settle = useCallback(
    (shareIds: string[]) => {
      if (!current || current.amount <= 0) return;
      const transaction = current;
      const durationMs = performance.now() - shownAt.current;
      const decision: Decision = { transaction, category: VOORGESCHOTEN_OPTION, ownShare: 0 };

      setSettleOpen(false);
      setError(null);
      setExitKind("assign");
      setQueue((q) => q.slice(1));
      setDecisions((d) => [...d, decision]);
      setUndo(decision);
      setSettledShareIds((prev) => new Set([...prev, ...shareIds]));
      settledByTransaction.current.set(transaction.id, shareIds);
      setAnnouncement(`${transaction.counterparty} verwerkt als terugbetaling`);

      startTransition(async () => {
        const result = await settleSharesWithTransaction(transaction.id, shareIds, durationMs);
        if (!result.ok) {
          setQueue((q) => [transaction, ...q.filter((t) => t.id !== transaction.id)]);
          setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
          setUndo((u) => (u?.transaction.id === transaction.id ? null : u));
          setSettledShareIds((prev) => {
            const next = new Set(prev);
            shareIds.forEach((id) => next.delete(id));
            return next;
          });
          settledByTransaction.current.delete(transaction.id);
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
    setAnnouncement(`${transaction.counterparty} op Later gezet`);
    startTransition(async () => {
      const result = await skipTransaction(transaction.id);
      if (!result.ok) setError(result.error);
    });
  }, [current, queue.length, startTransition]);

  const handleUndo = useCallback(() => {
    if (!undo) return;
    const { transaction, category, ownShare } = undo;
    setUndo(null);
    setError(null);
    setExitKind("none");
    setQueue((q) => [transaction, ...q]);
    setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
    setUndone((u) => u + 1);
    if (category.id === VOORGESCHOTEN_OPTION.id) {
      // De delen die deze Tikkie afbetaalde komen lokaal weer open te staan.
      const shareIds = settledByTransaction.current.get(transaction.id) ?? [];
      settledByTransaction.current.delete(transaction.id);
      setSettledShareIds((prev) => {
        const next = new Set(prev);
        shareIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Delen die bij deze uitgave hoorden verdwijnen weer (de server verwijdert ze ook).
      if (ownShare !== undefined) setOpenShares((prev) => prev.filter((s) => s.transactionId !== transaction.id));
      const delta = category.isIncome
        ? Math.max(transaction.amount, 0)
        : transaction.amount < 0
          ? (ownShare ?? -transaction.amount)
          : -transaction.amount;
      bumpCategoryTotal(category.id, -delta);
    }
    setAnnouncement(`${transaction.counterparty} terug uit ${category.name}`);
    startTransition(async () => {
      const result = await undoAssign(transaction.id);
      if (!result.ok) setError(result.error);
    });
  }, [undo, startTransition]);

  function openEditor() {
    const used = new Set(categories.map((c) => c.color));
    setEditorError(null);
    setEditorDraft({
      name: "",
      icon: DEFAULT_CATEGORY_ICON,
      color: CATEGORY_COLORS.find((c) => !used.has(c)) ?? "grijs",
      isIncome: false,
      enabled: true,
    });
  }

  function saveEditor() {
    if (!editorDraft) return;
    const draft = editorDraft;
    startTransition(async () => {
      const result = await createCategory({ name: draft.name, icon: draft.icon, color: draft.color, isIncome: draft.isIncome });
      if (!result.ok) {
        setEditorError(result.error);
        return;
      }
      setCategories((prev) => [...prev, result.category]);
      setEditorDraft(null);
    });
  }

  function dismissCoach() {
    const next = coachStep + 1;
    setCoach(next);
    startTransition(() => {
      void setCoachStep(next);
    });
  }

  const undoToast = (
    <UndoToast
      id={undo ? undo.transaction.id : null}
      counterparty={undo?.transaction.counterparty ?? ""}
      categoryName={undo?.category.name ?? ""}
      label={undo?.category.id === VOORGESCHOTEN_OPTION.id ? "verwerkt als terugbetaling" : undefined}
      onUndo={handleUndo}
    />
  );

  if (finished) {
    return (
      <>
        <SessionSummary decisions={decisions} skipped={skipped} remaining={remaining} />
        {undoToast}
      </>
    );
  }

  const isIncoming = current.amount > 0;
  const showCoach = coachStep < COACH_STEPS.length && coachStep <= assignedCount;

  return (
    <div className="flex flex-1 flex-col">
      <header className="safe-top flex flex-col gap-2 px-4 pt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{ACTION_LABEL}</h1>
          <p className="text-sm text-text-muted tabular-nums">Nog {remaining} te gaan</p>
        </div>
        <ProgressBar
          value={assignedCount}
          max={assignedCount + remaining}
          label={`${assignedCount} van ${assignedCount + remaining} gedaan`}
        />
      </header>

      <section className="px-4 pt-5" aria-label="Transactie">
        <div className="relative grid min-h-56">
          {queue.length > 2 && <GhostCard depth={2} />}
          {queue.length > 1 && <GhostCard depth={1} />}
          <AnimatePresence custom={exitKind} initial={false}>
            <TransactionCard key={current.id} transaction={current} onOpenDetails={() => setRawOpen(true)} />
          </AnimatePresence>
        </div>
      </section>

      <section className="flex flex-1 flex-col gap-3 px-4 pt-4" aria-label="Potje kiezen">
        {showCoach && <CoachTip step={coachStep} onDismiss={dismissCoach} />}

        {!isIncoming && (
          <SplitPanel
            amountAbs={Math.abs(current.amount)}
            knownNames={knownNames}
            state={split}
            onChange={(patch) => setSplitFor({ id: current.id, state: { ...split, ...patch } })}
          />
        )}

        <p className="text-sm font-medium text-text-muted">
          {isIncoming
            ? "Waar hoort dit inkomende geld?"
            : split.enabled
              ? "In welk potje hoort jouw deel?"
              : "In welk potje hoort dit?"}
        </p>

        <CategoryTiles
          categories={categories}
          onPick={pick}
          onAdd={openEditor}
          pulseId={pulse.id}
          pulseKey={pulse.key}
          repayment={
            isIncoming && availableShares.length > 0
              ? { total: openSharesTotal, count: availableShares.length, onOpen: () => setSettleOpen(true) }
              : null
          }
        />

        {error && (
          <p className="rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
            {error}
          </p>
        )}

        <div className="mt-auto pt-4">
          <Button variant="ghost" fullWidth onClick={skip} disabled={queue.length < 2}>
            {queue.length < 2 ? "Dit is de laatste" : "Later"}
          </Button>
        </div>
      </section>

      {undoToast}

      <RawSheet open={rawOpen} onClose={() => setRawOpen(false)} transaction={current} />

      <SettleSheet
        key={current.id}
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        shares={availableShares}
        incomingAmount={current.amount}
        pending={isPending}
        onConfirm={settle}
      />

      <Sheet open={editorDraft !== null} onClose={() => setEditorDraft(null)} title="Nieuw potje">
        {editorDraft && (
          <CategoryEditor
            draft={editorDraft}
            onChange={(patch) => setEditorDraft((d) => (d ? { ...d, ...patch } : d))}
            onDone={saveEditor}
            doneLabel="Potje maken"
            pending={isPending}
            error={editorError}
          />
        )}
      </Sheet>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
