"use client";

/*
 * Hoogterekensom voor 390 × 844 (iPhone 14/15, ±687 px tussen safe-area en tabbalk):
 *   header 52 + 12 + kaart 168 + 12 + tegels (4 × 80 + 3 × 6) + 12 + actieregel onderaan 44 + 8
 *   = 52+12+168+12+44+12+(4×80+3×6) = 638 px.
 * Blijft 49 px over voor de Ongedaan-maken-pil (40). Compact (≤ 700 px hoog):
 * kaart 136 en tegels 64 zonder bedrag, ±518 px van 583. Met de verdeelregel open (+52)
 * worden de tegels 60, zodat ook 375 × 667 niet scrolt.
 */

import { AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CategoryEditor } from "@/components/categories/category-editor";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ACTION_LABEL, UNDO_WINDOW_MS } from "@/config/app";
import { success, tap, warning } from "@/lib/haptics";
import type { QuickSuggestionKey } from "@/lib/categories/defaults";
import { DEFAULT_CATEGORY_ICON } from "@/lib/categories/icons";
import { CATEGORY_COLORS } from "@/lib/categories/palette";
import { VOORGESCHOTEN_CATEGORY, type CategoryDraft } from "@/lib/categories/types";
import type { CategoryOption, OpenShare, OpenTransaction } from "@/lib/transactions/queries";
import { sameCounterparty } from "@/lib/transactions/same-counterparty";
import { splitEqually } from "@/lib/transactions/split";
import { cn } from "@/lib/utils";
import {
  assignAlways,
  assignCategory,
  assignMany,
  completeCoach,
  completeSession,
  createCategory,
  setCoachStep,
  settleSharesWithTransaction,
  removeRule,
  skipTransaction,
  undoAssign,
  undoMany,
  type SplitInput,
} from "./actions";
import { CategoryTiles, tileCount } from "./category-tiles";
import { COACH_STEPS, CoachTip } from "./coach-tip";
import { RawSheet } from "./raw-sheet";
import { SessionSummary, type Decision } from "./session-summary";
import { SettleSheet } from "./settle-sheet";
import { EMPTY_SPLIT, SplitRow, type SplitState } from "./split-panel";
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

/** Boven dit aantal tegels mag de pagina scrollen; kaart en actieregel blijven dan staan. */
const STICKY_FROM_TILES = 21;
/** Hoe lang het afscheid van de coach blijft staan. */
const COACH_DONE_MS = 2500;
/** Hoe lang een foutmelding in de pil blijft staan. */
const ERROR_MS = 5000;
const METHOD_MISSING = "Kies eerst: via de bank of buiten de bank.";

/** Een groep keuzes die in één keer terug kan; bij een vaste ontvanger gaat ook de regel weg. */
interface UndoGroup {
  decisions: Decision[];
  text: string;
  ruleId?: string;
  /** Alle kaartjes die de regel indeelde, ook die niet op de lokale stapel lagen. */
  revertIds?: string[];
}

/** Hoeveel er bij het potje bijkomt als deze kaart erin gaat (bij een verdeling alleen jouw deel). */
function spentDelta(transaction: OpenTransaction, category: CategoryOption, ownShare?: number): number {
  if (category.isIncome) return Math.max(transaction.amount, 0);
  return transaction.amount < 0 ? (ownShare ?? -transaction.amount) : -transaction.amount;
}

const VOORGESCHOTEN_OPTION: CategoryOption = {
  id: "voorgeschoten",
  name: VOORGESCHOTEN_CATEGORY.name,
  icon: VOORGESCHOTEN_CATEGORY.icon,
  color: VOORGESCHOTEN_CATEGORY.color,
  isIncome: false,
  systemKey: VOORGESCHOTEN_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

/**
 * Het hart van de app. Eén kaart bovenin, alle potjes als tegels eronder.
 * De gebruiker beslist zelf, de app vult niets in en markeert niets vooraf. Alleen een vaste
 * ontvanger (potje ingedrukt gehouden) deelt de app daarna zelf in.
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
  // Na "Ook de andere" of een vaste ontvanger: de groep die in één keer is ingedeeld (en in één keer terug kan).
  const [undoBulk, setUndoBulk] = useState<UndoGroup | null>(null);
  const [pulse, setPulse] = useState<{ id: string | null; key: number }>({ id: null, key: 0 });
  const [error, setError] = useState<string | null>(null);
  // Een ontbrekende keuze is geen fout: die tonen we als rustige hint, niet in rood.
  const [hint, setHint] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Verdeling hoort bij één kaart: wisselt de kaart, dan begint hij schoon.
  const [splitFor, setSplitFor] = useState<{ id: string | null; state: SplitState }>({ id: null, state: EMPTY_SPLIT });
  const [settledShareIds, setSettledShareIds] = useState<Set<string>>(() => new Set());
  const [settleOpen, setSettleOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<CategoryDraft | null>(null);
  const [editorSuggestion, setEditorSuggestion] = useState<QuickSuggestionKey | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [coachStep, setCoach] = useState(initialCoachStep);
  const [coachDone, setCoachDone] = useState(false);
  const [methodMissing, setMethodMissing] = useState(false);
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
  // De stapel zoals hij nu is, voor het antwoord van de server na een vaste ontvanger.
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
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
    if (!undo && !undoBulk) return;
    undoTimer.current = setTimeout(() => {
      setUndo(null);
      setUndoBulk(null);
    }, UNDO_WINDOW_MS);
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [undo, undoBulk]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), ERROR_MS);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(null), ERROR_MS);
    return () => clearTimeout(timer);
  }, [hint]);

  useEffect(() => {
    if (!coachDone) return;
    const timer = setTimeout(() => setCoachDone(false), COACH_DONE_MS);
    return () => clearTimeout(timer);
  }, [coachDone]);

  const assignedCount = decisions.length;
  const remaining = Math.max(totalAtStart - assignedCount, queue.length);
  const finished = current === null;
  // Coachtip bij de eerste drie kaarten, één stap per kaart.
  const showCoach = !finished && coachStep < COACH_STEPS.length && coachStep <= assignedCount;

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
    setUndoBulk(null);
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
      if (useSplit && split.method === null) {
        // We kiezen niet voor de gebruiker: eerst via of buiten de bank.
        warning();
        setMethodMissing(true);
        setError(null);
        setHint(METHOD_MISSING);
        return;
      }
      const method = split.method ?? "bank";
      const ownShare = useSplit ? splitEqually(transaction.amount, split.persons).ownShare : undefined;
      const splitInput: SplitInput | undefined = useSplit
        ? { persons: split.persons, method, names: method === "bank" ? split.names : undefined }
        : undefined;
      const decision: Decision = { transaction, category, ownShare };

      const delta = spentDelta(transaction, category, ownShare);

      setError(null);
      setHint(null);
      setMethodMissing(false);
      setExitKind("assign");
      setQueue((q) => q.slice(1));
      setDecisions((d) => [...d, decision]);
      setUndo(decision);
      setUndoBulk(null);
      setPulse((p) => ({ id: category.id, key: p.key + 1 }));
      bumpCategoryTotal(category.id, delta);
      setAnnouncement(
        useSplit
          ? `${transaction.counterparty}: jouw deel in ${category.name}, de rest in Voorgeschoten`
          : `${transaction.counterparty} in ${category.name}`,
      );

      startTransition(async () => {
        const result = await assignCategory(transaction.id, category.id, durationMs, splitInput, { coach: showCoach });
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
    [current, split, showCoach, startTransition],
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
      setUndoBulk(null);
      setSettledShareIds((prev) => new Set([...prev, ...shareIds]));
      settledByTransaction.current.set(transaction.id, shareIds);
      setAnnouncement(`${transaction.counterparty} verwerkt als terugbetaling`);

      startTransition(async () => {
        const result = await settleSharesWithTransaction(transaction.id, shareIds, durationMs, { coach: showCoach });
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
    [current, showCoach, startTransition],
  );

  const skip = useCallback(() => {
    if (!current || queue.length < 2) return;
    const transaction = current;
    setError(null);
    setHint(null);
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
    warning();
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
      bumpCategoryTotal(category.id, -spentDelta(transaction, category, ownShare));
    }
    setAnnouncement(`${transaction.counterparty} terug uit ${category.name}`);
    startTransition(async () => {
      const result = await undoAssign(transaction.id);
      if (!result.ok) setError(result.error);
    });
  }, [undo, startTransition]);

  // Aanbod na een gewone keuze: dezelfde tegenpartij staat nog vaker op de stapel.
  // Nooit bij een verdeling of terugbetaling; jij tikt zelf op "Ook de andere".
  const sameOffer = useMemo(
    () =>
      undo && !undoBulk && undo.ownShare === undefined && undo.category.id !== VOORGESCHOTEN_OPTION.id
        ? sameCounterparty(undo.transaction, queue)
        : [],
    [undo, undoBulk, queue],
  );

  const assignSame = useCallback(() => {
    if (!undo || sameOffer.length === 0) return;
    const { category } = undo;
    const decisionsSame: Decision[] = sameOffer.map((transaction) => ({ transaction, category }));
    const group: UndoGroup = { decisions: decisionsSame, text: `Nog ${decisionsSame.length} in ${category.name}` };
    const ids = new Set(decisionsSame.map((d) => d.transaction.id));
    tap();
    setError(null);
    setHint(null);
    setExitKind("assign");
    setQueue((q) => q.filter((t) => !ids.has(t.id)));
    setDecisions((d) => [...d, ...decisionsSame]);
    setUndo(null);
    setUndoBulk(group);
    decisionsSame.forEach((d) => bumpCategoryTotal(category.id, spentDelta(d.transaction, category)));
    setAnnouncement(`Nog ${decisionsSame.length} van ${undo.transaction.counterparty} in ${category.name}`);

    startTransition(async () => {
      const result = await assignMany([...ids], category.id);
      if (!result.ok) {
        setQueue((q) => [...decisionsSame.map((d) => d.transaction), ...q.filter((t) => !ids.has(t.id))]);
        setDecisions((d) => d.filter((x) => !ids.has(x.transaction.id)));
        setUndoBulk((u) => (u === group ? null : u));
        decisionsSame.forEach((d) => bumpCategoryTotal(category.id, -spentDelta(d.transaction, category)));
        setError(result.error);
      }
    });
  }, [undo, sameOffer, startTransition]);

  // Potje ingedrukt gehouden: deze ontvanger gaat voortaan altijd hierin (een keuze van de gebruiker zelf).
  const hold = useCallback(
    (category: CategoryOption) => {
      if (!current) return;
      if (split.enabled) {
        warning();
        setHint("Een vaste ontvanger gaat zonder delen. Zet de schakelaar eerst uit.");
        return;
      }
      const transaction = current;
      const durationMs = performance.now() - shownAt.current;
      success();
      setError(null);
      setHint(null);
      setMethodMissing(false);
      setExitKind("assign");
      setQueue((q) => q.slice(1));
      setDecisions((d) => [...d, { transaction, category }]);
      setUndo(null);
      setUndoBulk(null);
      setPulse((p) => ({ id: category.id, key: p.key + 1 }));
      bumpCategoryTotal(category.id, spentDelta(transaction, category));

      startTransition(async () => {
        const result = await assignAlways(transaction.id, category.id, durationMs, { coach: showCoach });
        if (!result.ok) {
          setQueue((q) => [transaction, ...q.filter((t) => t.id !== transaction.id)]);
          setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
          bumpCategoryTotal(category.id, -spentDelta(transaction, category));
          setError(result.error);
          return;
        }
        const otherIds = new Set(result.ids.filter((id) => id !== transaction.id));
        // De andere kaartjes van deze ontvanger die nog op de stapel lagen.
        const others: Decision[] = queueRef.current
          .filter((t) => otherIds.has(t.id))
          .map((t) => ({ transaction: t, category }));
        setQueue((q) => q.filter((t) => !otherIds.has(t.id)));
        setDecisions((d) => [...d, ...others]);
        others.forEach((d) => bumpCategoryTotal(category.id, spentDelta(d.transaction, category)));
        const name = transaction.counterparty;
        const text = `${name} gaat voortaan in ${category.name}`;
        setAnnouncement(otherIds.size > 0 ? `${text}. Nog ${otherIds.size} kaartjes meegenomen.` : text);
        setUndoBulk({
          decisions: [{ transaction, category }, ...others],
          text,
          ruleId: result.ruleId,
          revertIds: [transaction.id, ...otherIds],
        });
      });
    },
    [current, split.enabled, showCoach, startTransition],
  );

  const handleUndoBulk = useCallback(() => {
    if (!undoBulk) return;
    const group = undoBulk.decisions;
    const { ruleId, revertIds } = undoBulk;
    const ids = new Set(group.map((d) => d.transaction.id));
    const category = group[0].category;
    warning();
    setUndoBulk(null);
    setError(null);
    setExitKind("none");
    setQueue((q) => [...group.map((d) => d.transaction), ...q]);
    setDecisions((d) => d.filter((x) => !ids.has(x.transaction.id)));
    setUndone((u) => u + group.length);
    group.forEach((d) => bumpCategoryTotal(category.id, -spentDelta(d.transaction, category)));
    setAnnouncement(group.length === 1 ? "Kaartje terug op de stapel" : `${group.length} kaartjes terug op de stapel`);
    startTransition(async () => {
      const result = ruleId ? await removeRule(ruleId, revertIds ?? [...ids]) : await undoMany([...ids]);
      if (!result.ok) setError(result.error);
    });
  }, [undoBulk, startTransition]);

  function openEditor() {
    const used = new Set(categories.map((c) => c.color));
    setEditorError(null);
    setEditorSuggestion(null);
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
    const suggestion = editorSuggestion;
    startTransition(async () => {
      const result = await createCategory(
        { name: draft.name, icon: draft.icon, color: draft.color, isIncome: draft.isIncome },
        suggestion,
      );
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
    if (next >= COACH_STEPS.length) {
      setCoachDone(true);
      startTransition(() => {
        void completeCoach(next);
      });
      return;
    }
    startTransition(() => {
      void setCoachStep(next);
    });
  }

  function updateNote(transactionId: string, note: string | null) {
    setQueue((q) => q.map((t) => (t.id === transactionId ? { ...t, note } : t)));
  }

  const undoToast = undoBulk ? (
    <UndoToast
      id={`bulk-${undoBulk.decisions[0].transaction.id}`}
      text={undoBulk.text}
      onUndo={handleUndoBulk}
      error={error}
      hint={hint}
    />
  ) : (
    <UndoToast
      id={undo ? undo.transaction.id : null}
      text={
        undo?.category.id === VOORGESCHOTEN_OPTION.id ? "Verwerkt als terugbetaling" : `In ${undo?.category.name ?? ""}`
      }
      onUndo={handleUndo}
      extra={
        undo && sameOffer.length > 0
          ? {
              label: `Ook ${sameOffer.length} andere`,
              ariaLabel: `Ook ${sameOffer.length === 1 ? "het andere kaartje" : `de ${sameOffer.length} andere kaartjes`} van ${undo.transaction.counterparty} in ${undo.category.name}`,
              onClick: assignSame,
            }
          : undefined
      }
      error={error}
      hint={hint}
    />
  );

  if (finished) {
    return (
      <>
        <SessionSummary decisions={decisions} skipped={Math.min(skipped, remaining)} remaining={remaining} />
        {undoToast}
      </>
    );
  }

  const isIncoming = current.amount > 0;
  const splitActive = !isIncoming && split.enabled;
  const ownShare = splitActive ? splitEqually(current.amount, split.persons).ownShare : null;
  const repayment =
    isIncoming && availableShares.length > 0
      ? { total: openSharesTotal, count: availableShares.length, onOpen: () => setSettleOpen(true) }
      : null;
  const sticky = tileCount(categories, repayment !== null) >= STICKY_FROM_TILES;
  const isLast = queue.length < 2;
  const total = assignedCount + remaining;

  return (
    <div className="flex flex-1 flex-col">
      <header className="safe-top-3 px-4">
        <div className="flex h-7 items-center justify-between gap-3">
          <h1 className="text-[17px] font-semibold">{ACTION_LABEL}</h1>
          <p className="text-[13px] text-text-muted tabular-nums">Nog {remaining}</p>
        </div>
        <ProgressBar
          value={assignedCount}
          max={total}
          size="sm"
          className="mt-2 h-1"
          label={`${assignedCount} van ${total} gedaan`}
        />
      </header>

      <div className={cn("px-4", sticky && "sticky top-0 z-10 bg-bg pb-1")}>
        <section className="relative mt-3 grid h-[168px] compact:h-[136px]" aria-label="Kaartje">
          {queue.length > 2 && <GhostCard depth={2} />}
          {queue.length > 1 && <GhostCard depth={1} />}
          <AnimatePresence custom={exitKind} initial={false}>
            <TransactionCard
              key={current.id}
              transaction={current}
              ownShare={ownShare}
              onOpenDetails={() => setRawOpen(true)}
            />
          </AnimatePresence>
        </section>

        <div className="relative">
          {(showCoach || coachDone) && (
            <div className="pointer-events-none absolute inset-x-0 bottom-full z-20 mb-3">
              <AnimatePresence>
                <CoachTip
                  key={coachDone ? "done" : coachStep}
                  step={coachDone ? "done" : coachStep}
                  onDismiss={dismissCoach}
                />
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <section className="px-4" aria-labelledby="potje-kiezen">
        <h2 id="potje-kiezen" className="sr-only">
          {isIncoming ? "Waar hoort dit geld bij?" : splitActive ? "Welk potje voor jouw deel?" : "Welk potje?"}
        </h2>
        <CategoryTiles
          categories={categories}
          onPick={pick}
          onHold={hold}
          onAdd={() => {
            tap();
            openEditor();
          }}
          pulseId={pulse.id}
          pulseKey={pulse.key}
          repayment={repayment}
          tight={splitActive}
        />
      </section>

      {/* Onderaan het scherm, in de duimzone: Ik krijg een deel terug en Later. Het verdeelpaneel klapt erboven open. */}
      <div className="mt-auto px-4 pt-3 pb-2 compact:pt-1">
        {!isIncoming && (
          <SplitRow
            key={current.id}
            open={split.enabled}
            amountAbs={Math.abs(current.amount)}
            knownNames={knownNames}
            state={split}
            methodMissing={methodMissing && split.method === null}
            onChange={(patch) => {
              if (patch.method) {
                setMethodMissing(false);
                setHint(null);
              }
              setSplitFor({ id: current.id, state: { ...split, ...patch } });
            }}
          />
        )}
        <div className="mt-2 flex h-11 items-center gap-2">
          {isIncoming ? (
            // Bij inkomend geld geen schakelaar: de vraag vult de plek (de h2 zegt hetzelfde voor schermlezers).
            <p className="flex min-w-0 flex-1 items-center px-1 text-[15px] text-text-muted" aria-hidden>
              Waar hoort dit geld bij?
            </p>
          ) : (
            <label className="flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-control bg-surface px-3 text-[15px] font-medium shadow-card max-[389px]:text-[14px]">
              <span className="truncate" aria-hidden>
                Ik krijg een deel terug
              </span>
              <Switch
                size="sm"
                label="Ik krijg een deel terug"
                checked={split.enabled}
                onCheckedChange={(enabled) => {
                  setMethodMissing(false);
                  setHint(null);
                  setSplitFor({ id: current.id, state: { ...split, enabled } });
                }}
              />
            </label>
          )}
          <Button
            variant="ghost"
            onClick={skip}
            disabled={isLast}
            aria-describedby={isLast ? "later-laatste" : undefined}
            className="shrink-0 px-3"
          >
            Later
            <ArrowRight size={16} aria-hidden />
          </Button>
          {isLast && (
            <span id="later-laatste" className="sr-only">
              Dit is het laatste kaartje
            </span>
          )}
        </div>
      </div>

      {undoToast}

      <RawSheet open={rawOpen} onClose={() => setRawOpen(false)} transaction={current} onNoteSaved={updateNote} />

      <SettleSheet
        key={current.id}
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        shares={availableShares}
        incomingAmount={current.amount}
        incomingCounterparty={current.counterparty}
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
            isNew
            onSuggestionUsed={setEditorSuggestion}
          />
        )}
      </Sheet>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
