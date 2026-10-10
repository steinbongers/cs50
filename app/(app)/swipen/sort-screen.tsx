"use client";

/*
 * Hoogterekensom voor 390 × 844 (iPhone 14/15, ±687 px tussen safe-area en tabbalk):
 *   header 52 + 12 + kaart 168 + 12 + tegels (4 × 80 + 3 × 6) + 12 + actieregel onderaan 44 + 8
 *   = 52+12+168+12+44+12+(4×80+3×6) = 638 px.
 * Blijft 49 px over voor de Ongedaan-maken-pil (40). Compact (≤ 700 px hoog):
 * kaart 136 en tegels 64 zonder bedrag, ±518 px van 583. Met "Ik krijg een deel terug" aan
 * schuift er één regel in (+52); dan worden de tegels 60, zodat ook 375 × 667 niet scrolt.
 */

import { AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Split, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CategoryEditor } from "@/components/categories/category-editor";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { ACTION_LABEL, UNDO_WINDOW_MS } from "@/config/app";
import { success, tap, warning } from "@/lib/haptics";
import type { QuickSuggestionKey } from "@/lib/categories/defaults";
import { DEFAULT_CATEGORY_ICON } from "@/lib/categories/icons";
import { CATEGORY_COLORS } from "@/lib/categories/palette";
import {
  CONTANT_CATEGORY,
  GELD_TERUG_CATEGORY,
  NIET_MEETELLEN_CATEGORY,
  VERDEELD_CATEGORY,
  VOORGESCHOTEN_CATEGORY,
  type CategoryDraft,
} from "@/lib/categories/types";
import { formatEuro } from "@/lib/format";
import { isCashWithdrawal } from "@/lib/transactions/cash";
import { isCreditCardSettlement } from "@/lib/transactions/credit-card";
import type { AwaitingRefund, CategoryOption, OpenShare, OpenTransaction } from "@/lib/transactions/queries";
import { refundOutcome, refundUndoText } from "@/lib/transactions/refunds";
import { sameCounterparty } from "@/lib/transactions/same-counterparty";
import { splitSummary, type SplitPartInput } from "@/lib/transactions/split-parts";
import { cn } from "@/lib/utils";
import {
  assignAlways,
  assignCategory,
  assignMany,
  assignRefund,
  assignRefundFor,
  completeCoach,
  completeSession,
  createCategory,
  setCoachStep,
  settleSharesWithTransaction,
  removeRule,
  skipTransaction,
  splitCash,
  splitTransaction,
  undoAssign,
  undoMany,
  type CashSpendInput,
} from "./actions";
import { setCounted } from "../potjes/actions";
import { AmountsSheet } from "./amounts-sheet";
import { CategoryTiles, tileCount } from "./category-tiles";
import { COACH_STEPS, CoachTip } from "./coach-tip";
import { RawSheet } from "./raw-sheet";
import { SessionSummary, type Decision } from "./session-summary";
import { RefundSheet } from "./refund-sheet";
import { SettleSheet } from "./settle-sheet";
import { EMPTY_SPLIT, type SplitState } from "./split-panel";
import { CASH_QUESTION, GhostCard, TransactionCard, type CardExit } from "./transaction-card";
import { UndoToast } from "./undo-toast";

interface SortScreenProps {
  categories: CategoryOption[];
  transactions: OpenTransaction[];
  totalOpen: number;
  openShares: OpenShare[];
  /** Uitgaven die nog op geld terug wachten (bijhouden), voor de tegel Terugbetaling. */
  awaitingRefunds?: AwaitingRefund[];
  coachStep: number;
}

/** Boven dit aantal tegels mag de pagina scrollen; kaart en actieregel blijven dan staan. */
const STICKY_FROM_TILES = 21;
/** Hoe lang het afscheid van de coach blijft staan. */
const COACH_DONE_MS = 2500;
/** Hoe lang een foutmelding in de pil blijft staan. */
const ERROR_MS = 5000;

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
  isSavings: false,
  systemKey: VOORGESCHOTEN_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

/** Telt niet mee: buiten maand, Overzicht en potjes. Het echte id kent alleen de server. */
const NIET_MEETELLEN_OPTION: CategoryOption = {
  id: "negeer",
  name: NIET_MEETELLEN_CATEGORY.name,
  icon: NIET_MEETELLEN_CATEGORY.icon,
  color: NIET_MEETELLEN_CATEGORY.color,
  isIncome: false,
  isSavings: false,
  systemKey: NIET_MEETELLEN_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

/** Geld terug zonder potje: gaat van het totaal af. Het echte id kent alleen de server. */
const GELD_TERUG_OPTION: CategoryOption = {
  id: "terug",
  name: GELD_TERUG_CATEGORY.name,
  icon: GELD_TERUG_CATEGORY.icon,
  color: GELD_TERUG_CATEGORY.color,
  isIncome: false,
  isSavings: false,
  systemKey: GELD_TERUG_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

const CONTANT_OPTION: CategoryOption = {
  id: "contant",
  name: CONTANT_CATEGORY.name,
  icon: CONTANT_CATEGORY.icon,
  color: CONTANT_CATEGORY.color,
  isIncome: false,
  isSavings: false,
  systemKey: CONTANT_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

/** Afschrijving verdeeld over potjes. Het echte id kent alleen de server. */
const VERDEELD_OPTION: CategoryOption = {
  id: "verdeeld",
  name: VERDEELD_CATEGORY.name,
  icon: VERDEELD_CATEGORY.icon,
  color: VERDEELD_CATEGORY.color,
  isIncome: false,
  isSavings: false,
  systemKey: VERDEELD_CATEGORY.systemKey,
  spentThisPeriod: 0,
  monthlyBudget: null,
  goalAmount: null,
};

/**
 * Een verdeelde (of bewaarde) pinopname of een verdeelde afschrijving: wat er per potje bijkwam,
 * voor ongedaan maken.
 */
interface PartsLocal {
  parts: { category: CategoryOption; amount: number }[];
  text: string;
}

/** Tekst in de pil na het verdelen van een pinopname. */
function cashUndoText(parts: PartsLocal["parts"], amountAbs: number): string {
  if (parts.length === 0) return "Bewaard als contant";
  const rest = Math.round((amountAbs - parts.reduce((sum, p) => sum + p.amount, 0)) * 100) / 100;
  const where = parts.length === 1 ? `In ${parts[0].category.name}` : `In ${parts.length} potjes`;
  return rest > 0 ? `${where}, ${formatEuro(rest)} contant over` : where;
}

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
  awaitingRefunds: initialAwaiting = [],
  coachStep: initialCoachStep,
}: SortScreenProps) {
  const [queue, setQueue] = useState<OpenTransaction[]>(transactions);
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  // Openstaande delen (van vroeger verdelen) houden we lokaal bij, zodat afstrepen zonder
  // refresh (en dus zonder verlies van ongedaan maken) kan. Nieuwe delen ontstaan hier niet meer.
  const [openShares, setOpenShares] = useState<OpenShare[]>(initialOpenShares);
  // Zo ook de uitgaven die op geld terug wachten: nieuwe komen erbij na "Ik krijg een deel terug",
  // een terugbetaling telt lokaal op (en haalt hem weg als alles binnen is).
  const [awaiting, setAwaiting] = useState<AwaitingRefund[]>(initialAwaiting);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [undone, setUndone] = useState(0);
  const [cardExit, setCardExit] = useState<CardExit>({ kind: "assign", target: null });
  const cardAreaRef = useRef<HTMLElement>(null);
  // Elke keuze zet hoe de kaart weggaat; alleen een tik op een tegel richt hem op die tegel (aimAt).
  const aimAt = useCallback((categoryId: string) => {
    const card = cardAreaRef.current?.getBoundingClientRect();
    const tile = document.querySelector<HTMLElement>(`[data-tile="${CSS.escape(categoryId)}"]`)?.getBoundingClientRect();
    if (!card || !tile) return;
    setCardExit({
      kind: "assign",
      target: {
        x: Math.round(tile.left + tile.width / 2 - (card.left + card.width / 2)),
        y: Math.round(tile.top + tile.height / 2 - (card.top + card.height / 2)),
      },
    });
  }, []);
  const [undo, setUndo] = useState<Decision | null>(null);
  // Na "Ook de andere" of een vaste ontvanger: de groep die in één keer is ingedeeld (en in één keer terug kan).
  const [undoBulk, setUndoBulk] = useState<UndoGroup | null>(null);
  const [pulse, setPulse] = useState<{ id: string | null; key: number }>({ id: null, key: 0 });
  const [error, setError] = useState<string | null>(null);
  // Een ontbrekende keuze is geen fout: die tonen we als rustige hint, niet in rood.
  const [hint, setHint] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // "Ik krijg een deel terug" hoort bij één kaart: wisselt de kaart, dan begint hij weer uit.
  const [splitFor, setSplitFor] = useState<{ id: string | null; state: SplitState }>({ id: null, state: EMPTY_SPLIT });
  const [settledShareIds, setSettledShareIds] = useState<Set<string>>(() => new Set());
  const [settleOpen, setSettleOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [partsOpen, setPartsOpen] = useState(false);
  // Per verdeelde pinopname of afschrijving wat er in welk potje kwam, zodat ongedaan maken het lokaal terugzet.
  const [partSplits, setPartSplits] = useState<Map<string, PartsLocal>>(() => new Map());
  const [rawOpen, setRawOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<CategoryDraft | null>(null);
  const [editorSuggestion, setEditorSuggestion] = useState<QuickSuggestionKey | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [coachStep, setCoach] = useState(initialCoachStep);
  const [coachDone, setCoachDone] = useState(false);
  const [totalAtStart, setTotalAtStart] = useState(totalOpen);
  const [isPending, startTransition] = useTransition();

  const shownAt = useRef<number>(0);
  const sessionStart = useRef<number | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Voor welke stapel de ronde al als afgerond is gemeld.
  const completedFor = useRef<OpenTransaction[] | null>(null);
  // Per Terugbetaling: welke delen ermee betaald zijn, zodat ongedaan maken ze lokaal terugzet.
  const settledByTransaction = useRef(new Map<string, string[]>());
  // Per terugbetaling voor een uitgave: hoe die uitgave ervoor stond en of hij nu klaar is.
  const refundForByTransaction = useRef(new Map<string, { before: AwaitingRefund; complete: boolean }>());
  // De stapel waarmee de lokale staat is gevuld.
  const [adoptedBatch, setAdoptedBatch] = useState(transactions);

  const current = queue[0] ?? null;
  // De rij onderin (Ik krijg een deel terug, Later): de pil Ongedaan maken komt erboven, niet eroverheen.
  const bottomRowRef = useRef<HTMLDivElement>(null);
  const [bottomRowHeight, setBottomRowHeight] = useState(0);
  useEffect(() => {
    const el = bottomRowRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setBottomRowHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [current?.id]);
  // De stapel zoals hij nu is, voor het antwoord van de server na een vaste ontvanger.
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  const split = splitFor.id === current?.id ? splitFor.state : EMPTY_SPLIT;
  const availableShares = openShares.filter((s) => !settledShareIds.has(s.id));
  const openSharesTotal = availableShares.reduce((a, s) => a + s.amount, 0);
  // Alleen uitgaven in een potje dat er nog is: daar gaat de terugbetaling heen.
  const availableAwaiting = awaiting.filter((a) => categories.some((c) => c.id === a.categoryId));

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
    setAwaiting(initialAwaiting);
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
      // Ik krijg een deel terug: de hele uitgave in het potje, de app houdt bij wat er terugkomt.
      // Sparen wacht nooit op geld terug: daar geldt de schakelaar niet.
      const track = split.enabled && transaction.amount < 0 && !category.isIncome && !category.isSavings;
      const decision: Decision = { transaction, category, track: track || undefined };

      const delta = spentDelta(transaction, category);

      setError(null);
      setHint(null);
      setCardExit({ kind: "assign", target: null });
      aimAt(category.id);
      setQueue((q) => q.slice(1));
      setDecisions((d) => [...d, decision]);
      setUndo(decision);
      setUndoBulk(null);
      setPulse((p) => ({ id: category.id, key: p.key + 1 }));
      bumpCategoryTotal(category.id, delta);
      if (track) {
        // Meteen beschikbaar voor de tegel Terugbetaling, zonder refresh.
        setAwaiting((prev) => [
          {
            id: transaction.id,
            counterparty: transaction.counterparty,
            bookingDate: transaction.bookingDate,
            amount: Math.abs(transaction.amount),
            categoryId: category.id,
            categoryName: category.name,
            received: 0,
          },
          ...prev.filter((a) => a.id !== transaction.id),
        ]);
      }
      setAnnouncement(
        track
          ? `${transaction.counterparty} in ${category.name}, je houdt bij wat terugkomt`
          : `${transaction.counterparty} in ${category.name}`,
      );

      startTransition(async () => {
        const result = await assignCategory(transaction.id, category.id, durationMs, track ? { track: true } : undefined, {
          coach: showCoach,
        });
        if (!result.ok) {
          setQueue((q) => [transaction, ...q.filter((t) => t.id !== transaction.id)]);
          setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
          setUndo((u) => (u?.transaction.id === transaction.id ? null : u));
          bumpCategoryTotal(category.id, -delta);
          if (track) setAwaiting((prev) => prev.filter((a) => a.id !== transaction.id));
          setError(result.error);
        }
      });
    },
    [aimAt, current, split, showCoach, startTransition],
  );

  // Geld terug gekregen: van een uitgavepotje af, of zonder potje alleen van het totaal.
  const refund = useCallback(
    (category: CategoryOption | null) => {
      if (!current || current.amount <= 0) return;
      const transaction = current;
      const durationMs = performance.now() - shownAt.current;
      const target = category ?? GELD_TERUG_OPTION;
      const decision: Decision = { transaction, category: target };
      const delta = category ? spentDelta(transaction, category) : 0;

      setRefundOpen(false);
      setError(null);
      setHint(null);
      setCardExit({ kind: "assign", target: null });
      setQueue((q) => q.slice(1));
      setDecisions((d) => [...d, decision]);
      setUndo(decision);
      setUndoBulk(null);
      if (category) {
        setPulse((p) => ({ id: category.id, key: p.key + 1 }));
        bumpCategoryTotal(category.id, delta);
      }
      setAnnouncement(
        category ? `${transaction.counterparty}: geld terug, van ${category.name} af` : `${transaction.counterparty}: geld terug`,
      );

      startTransition(async () => {
        const result = await assignRefund(transaction.id, category?.id ?? null, durationMs, { coach: showCoach });
        if (!result.ok) {
          setQueue((q) => [transaction, ...q.filter((t) => t.id !== transaction.id)]);
          setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
          setUndo((u) => (u?.transaction.id === transaction.id ? null : u));
          if (category) bumpCategoryTotal(category.id, -delta);
          setError(result.error);
        }
      });
    },
    [current, showCoach, startTransition],
  );

  // Niet meetellen: weg van de stapel, telt nergens mee. Ongedaan maken zet hem terug.
  const exclude = useCallback(() => {
    if (!current) return;
    const transaction = current;
    const decision: Decision = { transaction, category: NIET_MEETELLEN_OPTION };
    tap();
    setError(null);
    setHint(null);
    setCardExit({ kind: "assign", target: null });
    setQueue((q) => q.slice(1));
    setDecisions((d) => [...d, decision]);
    setUndo(decision);
    setUndoBulk(null);
    setAnnouncement(`${transaction.counterparty} telt niet mee`);
    startTransition(async () => {
      const result = await setCounted(transaction.id, false);
      if (!result.ok) {
        setQueue((q) => [transaction, ...q.filter((t) => t.id !== transaction.id)]);
        setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
        setUndo((u) => (u?.transaction.id === transaction.id ? null : u));
        setError(result.error);
      }
    });
  }, [current, startTransition]);

  const settle = useCallback(
    (shareIds: string[]) => {
      if (!current || current.amount <= 0) return;
      const transaction = current;
      const durationMs = performance.now() - shownAt.current;
      const decision: Decision = { transaction, category: VOORGESCHOTEN_OPTION, ownShare: 0 };

      setSettleOpen(false);
      setError(null);
      setCardExit({ kind: "assign", target: null });
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

  // Inkomend geld hoort bij een uitgave die op geld terug wacht: van hetzelfde potje af.
  const refundFor = useCallback(
    (expenseId: string, complete: boolean, estimate?: number) => {
      if (!current || current.amount <= 0) return;
      const expense = awaiting.find((a) => a.id === expenseId);
      const category = expense ? categories.find((c) => c.id === expense.categoryId) : undefined;
      if (!expense || !category) return;
      const transaction = current;
      const durationMs = performance.now() - shownAt.current;
      const decision: Decision = { transaction, category, refund: { complete, estimate } };
      const delta = spentDelta(transaction, category);
      const received = refundOutcome(expense.amount, expense.received, transaction.amount).received;

      setSettleOpen(false);
      setError(null);
      setHint(null);
      setCardExit({ kind: "assign", target: null });
      setQueue((q) => q.slice(1));
      setDecisions((d) => [...d, decision]);
      setUndo(decision);
      setUndoBulk(null);
      setPulse((p) => ({ id: category.id, key: p.key + 1 }));
      bumpCategoryTotal(category.id, delta);
      refundForByTransaction.current.set(transaction.id, { before: expense, complete });
      setAwaiting((prev) =>
        complete ? prev.filter((a) => a.id !== expense.id) : prev.map((a) => (a.id === expense.id ? { ...a, received } : a)),
      );
      setAnnouncement(refundUndoText(transaction.amount, category.name, complete, estimate));

      startTransition(async () => {
        const result = await assignRefundFor(
          transaction.id,
          expense.id,
          complete,
          durationMs,
          { coach: showCoach },
          estimate ?? null,
        );
        if (!result.ok) {
          setQueue((q) => [transaction, ...q.filter((t) => t.id !== transaction.id)]);
          setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
          setUndo((u) => (u?.transaction.id === transaction.id ? null : u));
          bumpCategoryTotal(category.id, -delta);
          refundForByTransaction.current.delete(transaction.id);
          setAwaiting((prev) => [expense, ...prev.filter((a) => a.id !== expense.id)]);
          setError(result.error);
        }
      });
    },
    [current, awaiting, categories, showCoach, startTransition],
  );

  // Pinopname verdeeld over potjes, of helemaal bewaard als contant (geen uitgaven).
  const cashSplit = useCallback(
    (spends: CashSpendInput[], note: string | null) => {
      if (!current || !isCashWithdrawal(current)) return;
      const transaction = current;
      const durationMs = performance.now() - shownAt.current;
      const parts = spends.flatMap((s) => {
        const category = categories.find((c) => c.id === s.categoryId);
        return category ? [{ category, amount: s.amount }] : [];
      });
      const local: PartsLocal = { parts, text: cashUndoText(parts, Math.abs(transaction.amount)) };
      const decision: Decision = { transaction, category: CONTANT_OPTION, ownShare: 0 };

      setCashOpen(false);
      setError(null);
      setHint(null);
      setCardExit({ kind: "assign", target: null });
      setQueue((q) => q.slice(1));
      setDecisions((d) => [...d, decision]);
      setUndo(decision);
      setUndoBulk(null);
      setPartSplits((prev) => new Map(prev).set(transaction.id, local));
      if (parts.length === 1) setPulse((p) => ({ id: parts[0].category.id, key: p.key + 1 }));
      parts.forEach((p) => bumpCategoryTotal(p.category.id, p.amount));
      setAnnouncement(local.text);

      startTransition(async () => {
        const result = await splitCash(transaction.id, spends, note, durationMs, { coach: showCoach });
        if (!result.ok) {
          setQueue((q) => [transaction, ...q.filter((t) => t.id !== transaction.id)]);
          setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
          setUndo((u) => (u?.transaction.id === transaction.id ? null : u));
          setPartSplits((prev) => {
            const next = new Map(prev);
            next.delete(transaction.id);
            return next;
          });
          parts.forEach((p) => bumpCategoryTotal(p.category.id, -p.amount));
          setError(result.error);
        }
      });
    },
    [current, categories, showCoach, startTransition],
  );

  // Afschrijving (vaak de creditcard) verdeeld over potjes; samen precies het hele bedrag.
  const splitParts = useCallback(
    (input: SplitPartInput[]) => {
      if (!current || isCashWithdrawal(current)) return;
      const transaction = current;
      const durationMs = performance.now() - shownAt.current;
      // Een uitgave telt per deel op in het potje; inkomend geld gaat er per deel van af.
      const sign = transaction.amount < 0 ? 1 : -1;
      const parts = input.flatMap((s) => {
        const category = categories.find((c) => c.id === s.categoryId);
        return category ? [{ category, amount: sign * s.amount }] : [];
      });
      const local: PartsLocal = { parts, text: splitSummary(parts.length) };
      const decision: Decision = { transaction, category: VERDEELD_OPTION, ownShare: 0 };

      setPartsOpen(false);
      setError(null);
      setHint(null);
      setCardExit({ kind: "assign", target: null });
      setQueue((q) => q.slice(1));
      setDecisions((d) => [...d, decision]);
      setUndo(decision);
      setUndoBulk(null);
      setPartSplits((prev) => new Map(prev).set(transaction.id, local));
      parts.forEach((p) => bumpCategoryTotal(p.category.id, p.amount));
      setAnnouncement(`${transaction.counterparty}: ${local.text.toLowerCase()}`);

      startTransition(async () => {
        const result = await splitTransaction(transaction.id, input, durationMs, { coach: showCoach });
        if (!result.ok) {
          setQueue((q) => [transaction, ...q.filter((t) => t.id !== transaction.id)]);
          setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
          setUndo((u) => (u?.transaction.id === transaction.id ? null : u));
          setPartSplits((prev) => {
            const next = new Map(prev);
            next.delete(transaction.id);
            return next;
          });
          parts.forEach((p) => bumpCategoryTotal(p.category.id, -p.amount));
          setError(result.error);
        }
      });
    },
    [current, categories, showCoach, startTransition],
  );

  const skip = useCallback(() => {
    if (!current || queue.length < 2) return;
    const transaction = current;
    setError(null);
    setHint(null);
    setCardExit({ kind: "skip", target: null });
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
    setCardExit({ kind: "none", target: null });
    setQueue((q) => [transaction, ...q]);
    setDecisions((d) => d.filter((x) => x.transaction.id !== transaction.id));
    setUndone((u) => u + 1);
    if (category.id === CONTANT_OPTION.id || category.id === VERDEELD_OPTION.id) {
      // De contante uitgaven of delen gaan weer uit de potjes (de server verwijdert ze).
      partSplits.get(transaction.id)?.parts.forEach((p) => bumpCategoryTotal(p.category.id, -p.amount));
      setPartSplits((prev) => {
        const next = new Map(prev);
        next.delete(transaction.id);
        return next;
      });
    } else if (category.id === VOORGESCHOTEN_OPTION.id) {
      // De delen die deze Tikkie afbetaalde komen lokaal weer open te staan.
      const shareIds = settledByTransaction.current.get(transaction.id) ?? [];
      settledByTransaction.current.delete(transaction.id);
      setSettledShareIds((prev) => {
        const next = new Set(prev);
        shareIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Bijgehouden uitgave: wacht niet meer. Terugbetaling voor een uitgave: die uitgave staat weer zoals hij stond.
      if (undo.track) setAwaiting((prev) => prev.filter((a) => a.id !== transaction.id));
      const refundFor = refundForByTransaction.current.get(transaction.id);
      if (refundFor) {
        refundForByTransaction.current.delete(transaction.id);
        setAwaiting((prev) => [refundFor.before, ...prev.filter((a) => a.id !== refundFor.before.id)]);
      }
      bumpCategoryTotal(category.id, -spentDelta(transaction, category, ownShare));
    }
    setAnnouncement(`${transaction.counterparty} terug uit ${category.name}`);
    startTransition(async () => {
      const result = await undoAssign(transaction.id);
      if (!result.ok) setError(result.error);
    });
  }, [undo, partSplits, startTransition]);

  // Aanbod na een gewone keuze: dezelfde tegenpartij staat nog vaker op de stapel.
  // Nooit bij een verdeling, terugbetaling of pinopname; jij tikt zelf op "Ook de andere".
  const sameOffer = useMemo(
    () =>
      undo &&
      !undoBulk &&
      undo.ownShare === undefined &&
      !undo.track &&
      !undo.refund &&
      undo.category.systemKey === null &&
      !isCashWithdrawal(undo.transaction)
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
    setCardExit({ kind: "assign", target: null });
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
      // Een geldautomaat wordt nooit een vaste ontvanger (de tegels geven dan ook geen onHold door).
      if (!current || isCashWithdrawal(current)) return;
      if (split.enabled) {
        warning();
        setHint("Een vaste ontvanger gaat zonder geld terug. Zet de schakelaar eerst uit.");
        return;
      }
      const transaction = current;
      const durationMs = performance.now() - shownAt.current;
      success();
      setError(null);
      setHint(null);
      setCardExit({ kind: "assign", target: null });
      aimAt(category.id);
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
    [aimAt, current, split.enabled, showCoach, startTransition],
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
    setCardExit({ kind: "none", target: null });
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

  function openEditor(isIncome = false) {
    const used = new Set(categories.map((c) => c.color));
    setEditorError(null);
    setEditorSuggestion(null);
    setEditorDraft({
      name: "",
      icon: DEFAULT_CATEGORY_ICON,
      color: CATEGORY_COLORS.find((c) => !used.has(c)) ?? "grijs",
      // Een nieuw potje bij inkomend geld is meteen een inkomstenpotje.
      isIncome,
      isSavings: false,
      enabled: true,
    });
  }

  function saveEditor() {
    if (!editorDraft) return;
    const draft = editorDraft;
    const suggestion = editorSuggestion;
    startTransition(async () => {
      const result = await createCategory(
        { name: draft.name, icon: draft.icon, color: draft.color, isIncome: draft.isIncome, isSavings: draft.isSavings ?? false },
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

  /** Tekst in de pil na een keuze. */
  function decisionText({ transaction, category, track, refund }: Decision): string {
    if (refund) return refundUndoText(transaction.amount, category.name, refund.complete, refund.estimate);
    if (track) return `In ${category.name}, je houdt bij wat terugkomt`;
    if (category.id === VOORGESCHOTEN_OPTION.id) return "Verwerkt als terugbetaling";
    if (category.id === CONTANT_OPTION.id) return partSplits.get(transaction.id)?.text ?? "Bewaard als contant";
    if (category.id === VERDEELD_OPTION.id) return partSplits.get(transaction.id)?.text ?? "Verdeeld over je potjes";
    if (category.id === GELD_TERUG_OPTION.id) return "Geld terug, van je totaal af";
    if (category.id === NIET_MEETELLEN_OPTION.id) return "Telt niet mee in je maand en potjes";
    if (category.isSavings) return transaction.amount > 0 ? `Uit je spaarpot: ${category.name}` : `Gespaard in ${category.name}`;
    if (transaction.amount > 0 && !category.isIncome) return `Geld terug, van ${category.name} af`;
    return `In ${category.name}`;
  }

  const undoToast = undoBulk ? (
    <UndoToast
      id={`bulk-${undoBulk.decisions[0].transaction.id}`}
      text={undoBulk.text}
      onUndo={handleUndoBulk}
      aboveBottom={current ? bottomRowHeight : 0}
      error={error}
      hint={hint}
    />
  ) : (
    <UndoToast
      id={undo ? undo.transaction.id : null}
      text={undo ? decisionText(undo) : ""}
      onUndo={handleUndo}
      aboveBottom={current ? bottomRowHeight : 0}
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
  // Pinopname: de app herkent hem aan de banktekst en vraagt waar het geld heen ging. Geen delen, geen vaste ontvanger.
  const isCash = isCashWithdrawal(current);
  // Verdelen over potjes kan bij elke uitgave; bij een herkende creditcard staat er een hint op de kaart.
  const canSplit = !isIncoming && !isCash;
  const isCreditCard = canSplit && isCreditCardSettlement(current);
  // Terugbetaling bij open delen (van vroeger verdelen) én bij uitgaven die op geld terug wachten.
  const repayment =
    isIncoming && (availableShares.length > 0 || availableAwaiting.length > 0)
      ? {
          total: openSharesTotal,
          count: availableShares.length,
          awaiting: availableAwaiting.length,
          onOpen: () => setSettleOpen(true),
        }
      : null;
  // Inkomend geld: de inkomstenpotjes (besluit van Stein) plus de spaarpotjes, zodat geld uit je
  // spaarpot nooit inkomen wordt. Gewoon gefilterd, dus in de vaste volgorde van de gebruiker.
  // Zonder inkomstenpotje toch alles, anders kun je het kaartje nergens kwijt.
  const incomeCategories = categories.filter((c) => (c.isIncome || c.isSavings) && c.systemKey === null);
  const hasIncomePotje = incomeCategories.some((c) => c.isIncome);
  const tileCategories = isIncoming && hasIncomePotje ? incomeCategories : categories;
  const sticky = tileCount(tileCategories, repayment !== null, isIncoming) >= STICKY_FROM_TILES;
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
        <section ref={cardAreaRef} className="relative mt-3 grid h-[168px] compact:h-[136px]" aria-label="Kaartje">
          {queue.length > 2 && <GhostCard depth={2} />}
          {queue.length > 1 && <GhostCard depth={1} />}
          <AnimatePresence custom={cardExit} initial={false}>
            <TransactionCard
              key={current.id}
              transaction={current}
              cash={isCash}
              creditCard={isCreditCard}
              onOpenDetails={() => setRawOpen(true)}
            />
          </AnimatePresence>
        </section>

        {/* Direct onder de kaart, klein: Ik krijg een deel terug (besluit van Stein, niet meer onderin).
            De regel is er altijd, ook bij inkomend geld en pinopnames, zodat de tegels nooit verspringen. */}
        <div className="mt-2 flex h-8 items-center gap-2">
          {!isIncoming && !isCash ? (
            <>
              <button
                type="button"
                role="switch"
                aria-checked={split.enabled}
                onClick={() => {
                  tap();
                  setHint(null);
                  setSplitFor({ id: current.id, state: { ...split, enabled: !split.enabled } });
                }}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  split.enabled ? "bg-primary text-on-primary" : "bg-surface text-text shadow-card active:bg-surface-muted",
                )}
              >
                {split.enabled ? <Check size={14} strokeWidth={2.5} aria-hidden /> : <Undo2 size={14} aria-hidden />}
                Ik krijg een deel terug
              </button>
              {split.enabled && (
                <span className="min-w-0 truncate text-[12px] leading-4 text-text-muted max-[389px]:hidden">Je houdt bij wat terugkomt</span>
              )}
            </>
          ) : isIncoming ? (
            <p className="min-w-0 truncate px-1 text-[13px] text-text-muted" aria-hidden>
              Waar hoort dit geld bij?
            </p>
          ) : null}
          {/* Telt niet mee: buiten je maand, Overzicht en potjes (een borg, iets zakelijks). */}
          <button
            type="button"
            onClick={exclude}
            className="ml-auto inline-flex h-8 shrink-0 items-center rounded-full px-2.5 text-[13px] font-medium text-text-muted transition-colors duration-150 active:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Niet meetellen
          </button>
        </div>

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
          {isIncoming
            ? "Waar hoort dit geld bij?"
            : isCash
              ? CASH_QUESTION
              : "Welk potje?"}
        </h2>
        <CategoryTiles
          categories={tileCategories}
          incoming={isIncoming}
          onPick={pick}
          onHold={isCash ? undefined : hold}
          onAdd={() => {
            tap();
            openEditor(isIncoming);
          }}
          pulseId={pulse.id}
          pulseKey={pulse.key}
          refund={isIncoming ? { onOpen: () => setRefundOpen(true) } : null}
          repayment={repayment}
        />
      </section>

      {/* Onderaan het scherm, in de duimzone: Later. Bij een uitgave ook Verdelen (over meerdere potjes),
          bij een pinopname Verdelen en Nog contant (nog niet uitgegeven); een tik op een potje = alles daarin. */}
      <div ref={bottomRowRef} className="mt-auto px-4 pt-3 pb-2 compact:pt-1">
        <div className={cn("flex h-11 items-center justify-end", isCash ? "gap-1.5" : "gap-2")}>
          {isCash ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  tap();
                  setCashOpen(true);
                }}
                className="shrink-0 px-2.5 max-[389px]:text-[14px]"
              >
                Verdelen
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  tap();
                  cashSplit([], null);
                }}
                aria-label="Nog niet uitgegeven, het blijft contant"
                className="min-w-0 flex-1 px-2.5 max-[389px]:text-[14px]"
              >
                <span className="truncate">Nog contant</span>
              </Button>
            </>
          ) : canSplit ? (
            <Button
              variant="ghost"
              onClick={() => {
                if (split.enabled) {
                  warning();
                  setHint("Verdelen gaat zonder geld terug. Zet de schakelaar eerst uit.");
                  return;
                }
                tap();
                setPartsOpen(true);
              }}
              aria-label="Verdelen over meerdere potjes"
              className="shrink-0 px-3"
            >
              <Split size={16} aria-hidden />
              Verdelen
            </Button>
          ) : null}
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

      {isCash && (
        <AmountsSheet
          mode="cash"
          key={current.id}
          open={cashOpen}
          onClose={() => setCashOpen(false)}
          amountAbs={Math.abs(current.amount)}
          categories={categories.filter((c) => c.systemKey === null && !c.isIncome)}
          pending={isPending}
          onConfirm={cashSplit}
        />
      )}

      {canSplit && (
        <AmountsSheet
          mode="split"
          key={current.id}
          open={partsOpen}
          onClose={() => setPartsOpen(false)}
          amountAbs={Math.abs(current.amount)}
          counterparty={current.counterparty}
          categories={categories.filter((c) => c.systemKey === null && !c.isIncome)}
          pending={isPending}
          onConfirm={splitParts}
        />
      )}

      <RefundSheet
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        amount={current.amount}
        categories={categories.filter((c) => c.systemKey === null && !c.isIncome && !c.isSavings)}
        pending={isPending}
        onConfirm={refund}
      />

      <SettleSheet
        key={current.id}
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        shares={availableShares}
        awaiting={availableAwaiting}
        incomingAmount={current.amount}
        incomingCounterparty={current.counterparty}
        incomingDescription={current.description}
        pending={isPending}
        onConfirm={settle}
        onRefundFor={refundFor}
        onNoLink={() => {
          setSettleOpen(false);
          setRefundOpen(true);
        }}
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
