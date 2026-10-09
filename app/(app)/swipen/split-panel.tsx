"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useState, useTransition } from "react";
import { createGroup, listGroups } from "@/app/(app)/instellingen/groepen/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { formatEuro } from "@/lib/format";
import { getCachedGroups, setCachedGroups } from "@/lib/groups/cache";
import { MAX_GROUP_NAME_LENGTH, canSaveAsGroup, sameMembers, type ShareGroup } from "@/lib/groups/groups";
import { MAX_SPLIT_PERSONS, MIN_SPLIT_PERSONS, splitEqually } from "@/lib/transactions/split";
import { cn } from "@/lib/utils";

export type SplitMethod = "bank" | "other";

export interface SplitState {
  enabled: boolean;
  /** Totaal aantal personen, jij meegeteld. */
  persons: number;
  /** Hoe het geld terugkomt. Leeg tot de gebruiker kiest: we kiezen niet voor hem. */
  method: SplitMethod | null;
  names: string[];
}

export const EMPTY_SPLIT: SplitState = {
  enabled: false,
  persons: MIN_SPLIT_PERSONS,
  method: null,
  names: [],
};

const METHOD_OPTIONS = [
  { value: "bank", label: "Via bank" },
  { value: "other", label: "Buiten bank" },
] as const;

interface SplitRowProps {
  open: boolean;
  amountAbs: number;
  state: SplitState;
  onChange: (patch: Partial<SplitState>) => void;
  /** Eerder gebruikte namen, als suggesties bij de naamvelden. */
  knownNames?: string[];
  /** Kleurt de keuze via/buiten de bank als die nog ontbreekt. */
  methodMissing?: boolean;
}

const roundButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full bg-surface shadow-card text-text " +
  "transition-[transform,background-color] duration-100 active:scale-[0.96] active:bg-surface-muted " +
  "disabled:opacity-40 disabled:active:scale-100";

/** Namen van de anderen bij dit aantal personen (extra namen van eerder tellen niet mee). */
function filledNames(state: SplitState): string[] {
  return state.names.slice(0, Math.max(0, state.persons - 1));
}

/** Een groep is gekozen als precies deze mensen erin staan. */
function isGroupActive(group: ShareGroup, state: SplitState): boolean {
  return state.persons === group.members.length + 1 && sameMembers(filledNames(state), group.members);
}

/** Groep kiezen: jij plus de leden, met hun namen ingevuld. */
function groupPatch(group: ShareGroup): Partial<SplitState> {
  return { persons: Math.min(MAX_SPLIT_PERSONS, group.members.length + 1), names: [...group.members] };
}

/**
 * Je groepen, één keer opgehaald zodra het paneel voor het eerst opengaat.
 * Daarna uit de cache, ook bij volgende kaartjes.
 */
function useGroups(open: boolean): [ShareGroup[], (group: ShareGroup) => void] {
  const [groups, setGroups] = useState<ShareGroup[] | null>(() => getCachedGroups());

  useEffect(() => {
    if (!open || groups !== null) return;
    let cancelled = false;
    listGroups()
      .then((list) => {
        setCachedGroups(list);
        if (!cancelled) setGroups(list);
      })
      .catch(() => {
        // Zonder groepen werkt verdelen gewoon; volgende keer opnieuw proberen.
      });
    return () => {
      cancelled = true;
    };
  }, [open, groups]);

  function add(group: ShareGroup) {
    const next = [...(groups ?? []), group].sort((a, b) => a.name.localeCompare(b.name, "nl"));
    setCachedGroups(next);
    setGroups(next);
  }

  return [groups ?? [], add];
}

/** Groepen als chips op één regel; schuift horizontaal als ze niet passen. */
function GroupChips({
  groups,
  state,
  onChange,
  className,
}: {
  groups: ShareGroup[];
  state: SplitState;
  onChange: (patch: Partial<SplitState>) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Kies een groep"
      className={cn("flex gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none]", className)}
    >
      {groups.map((group) => {
        const active = isGroupActive(group, state);
        return (
          <button
            key={group.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(groupPatch(group))}
            className={cn(
              "h-8 max-w-[60%] shrink-0 truncate rounded-full border px-3 text-[13px] font-medium",
              "transition-[transform,background-color] duration-100 active:scale-[0.96]",
              active ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text",
            )}
          >
            {group.name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * De regel die inschuift als "Ik krijg een deel terug" aan staat: met hoeveel waren
 * jullie, via of buiten de bank, en (optioneel) namen in een sheet. Heb je groepen,
 * dan staan die eronder als chips; op lage schermen alleen in de sheet, zodat er niets scrolt.
 */
export function SplitRow({ open, amountAbs, state, onChange, knownNames = [], methodMissing = false }: SplitRowProps) {
  const reduce = useReducedMotion();
  const [namesOpen, setNamesOpen] = useState(false);
  const [groups, addGroup] = useGroups(open);

  return (
    <>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="split-row"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1, transition: { duration: 0.12 } } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0.12 } } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex h-11 items-center gap-1.5">
              <div
                role="group"
                aria-label="Met hoeveel waren jullie? (jij telt mee)"
                className="flex shrink-0 items-center gap-0.5"
              >
                <button
                  type="button"
                  className={roundButton}
                  aria-label="Eén persoon minder"
                  disabled={state.persons <= MIN_SPLIT_PERSONS}
                  onClick={() => onChange({ persons: Math.max(MIN_SPLIT_PERSONS, state.persons - 1) })}
                >
                  <Minus size={16} strokeWidth={2} aria-hidden />
                </button>
                <span className="w-5 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
                  {state.persons}
                </span>
                <button
                  type="button"
                  className={roundButton}
                  aria-label="Eén persoon meer"
                  disabled={state.persons >= MAX_SPLIT_PERSONS}
                  onClick={() => onChange({ persons: Math.min(MAX_SPLIT_PERSONS, state.persons + 1) })}
                >
                  <Plus size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>

              <Segmented
                options={METHOD_OPTIONS}
                value={state.method}
                onChange={(method) => onChange({ method })}
                ariaLabel="Hoe krijg je het terug?"
                className={cn(
                  // Korte labels op één regel, ook op 375 px: beide segmenten even breed (grid 1fr).
                  "min-w-0 flex-1 [&_button]:px-0.5 [&_button]:text-[13px] [&_button]:tracking-[-0.01em]",
                  methodMissing && "ring-2 ring-accent ring-inset",
                )}
              />

              <button
                type="button"
                onClick={() => setNamesOpen(true)}
                className="h-11 min-w-11 shrink-0 text-[15px] font-medium text-primary"
              >
                Namen
              </button>
            </div>
            {groups.length > 0 && (
              <GroupChips groups={groups} state={state} onChange={onChange} className="mt-1.5 compact:hidden" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <NamesSheet
        open={open && namesOpen}
        onClose={() => setNamesOpen(false)}
        amountAbs={amountAbs}
        state={state}
        onChange={onChange}
        knownNames={knownNames}
        groups={groups}
        onGroupSaved={addGroup}
      />
    </>
  );
}

interface NamesSheetProps {
  open: boolean;
  onClose: () => void;
  amountAbs: number;
  state: SplitState;
  onChange: (patch: Partial<SplitState>) => void;
  knownNames: string[];
  groups: ShareGroup[];
  onGroupSaved: (group: ShareGroup) => void;
}

/** Namen van de anderen invullen (optioneel), met suggesties uit eerdere namen. */
function NamesSheet({ open, onClose, amountAbs, state, onChange, knownNames, groups, onGroupSaved }: NamesSheetProps) {
  const namesListId = useId();
  const result = splitEqually(amountAbs, state.persons);
  const othersTotal = Math.round(result.otherShares.reduce((a, b) => a + b, 0) * 100) / 100;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Wie waren erbij?"
      description={`Jouw deel is ${formatEuro(result.ownShare)}. Namen zijn niet verplicht.`}
    >
      <div className="flex flex-col gap-4">
        {groups.length > 0 && <GroupChips groups={groups} state={state} onChange={onChange} />}
        {knownNames.length > 0 && (
          <datalist id={namesListId}>
            {knownNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}
        <div className="flex flex-col gap-2">
          {result.otherShares.map((share, index) => (
            <div key={index} className="flex items-center gap-3">
              <Input
                aria-label={`Naam persoon ${index + 1}`}
                placeholder={`Persoon ${index + 1}`}
                value={state.names[index] ?? ""}
                maxLength={60}
                autoComplete="off"
                list={knownNames.length > 0 ? namesListId : undefined}
                className="h-11 flex-1 text-[15px]"
                onChange={(e) => {
                  const names = [...state.names];
                  names[index] = e.target.value;
                  onChange({ names });
                }}
              />
              <span className="w-20 shrink-0 text-right text-[15px] tabular-nums text-text-muted">{formatEuro(share)}</span>
            </div>
          ))}
        </div>

        <SaveAsGroup names={filledNames(state)} groups={groups} onSaved={onGroupSaved} />

        {/* Alleen het getal dat bij de gekozen weg hoort; zonder keuze geen getal. */}
        {state.method === "bank" && (
          <p className="text-[13px] leading-[18px] tabular-nums">Nog te krijgen {formatEuro(othersTotal)}</p>
        )}
        {state.method === "other" && (
          <p className="text-[13px] leading-[18px] tabular-nums">
            Al geregeld {formatEuro(othersTotal)}
            <span className="text-text-muted"> · via WieBetaaltWat of contant</span>
          </p>
        )}

        <Button size="lg" fullWidth onClick={onClose}>
          Klaar
        </Button>
      </div>
    </Sheet>
  );
}

/**
 * Zelf namen getypt die nog geen groep zijn? Dan klein "Bewaar als groep", met
 * een veld voor de naam. Opslaan verandert niets aan deze verdeling.
 */
function SaveAsGroup({
  names,
  groups,
  onSaved,
}: {
  names: string[];
  groups: ShareGroup[];
  onSaved: (group: ShareGroup) => void;
}) {
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ShareGroup | null>(null);
  const [pending, startTransition] = useTransition();

  if (saved && sameMembers(saved.members, names)) {
    return <p className="text-[13px] leading-[18px] text-text-muted">Bewaard als groep {saved.name}.</p>;
  }
  if (!canSaveAsGroup(names, groups)) return null;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="-my-2 flex h-11 items-center self-start px-1 text-[15px] font-medium text-primary"
      >
        Bewaar als groep
      </button>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await createGroup(name, names);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.group);
      setSaved(result.group);
      setEditing(false);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] leading-[18px] font-medium">
        Naam van de groep
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          value={name}
          maxLength={MAX_GROUP_NAME_LENGTH}
          placeholder="Huisgenoten"
          autoComplete="off"
          className="h-11 flex-1 text-[15px]"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
        />
        <Button variant="secondary" onClick={save} loading={pending} className="shrink-0">
          Bewaar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[13px] leading-[18px] text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
