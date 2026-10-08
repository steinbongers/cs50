"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveNote } from "@/lib/transactions/actions";
import { cn } from "@/lib/utils";

export const NOTE_MAX = 140;
/** Vanaf hier tonen we hoeveel tekens je nog hebt. */
const NOTE_COUNTER_FROM = 120;

interface NoteFieldProps {
  transactionId: string;
  initialNote: string | null;
  /** Na opslaan (null = gewist), zodat de lijst of kaart meteen bijwerkt. */
  onSaved?: (transactionId: string, note: string | null) => void;
}

/**
 * Eigen notitie bij een transactie (max 140 tekens, teller vanaf 120).
 * Geef per transactie een eigen `key`, zodat de beginwaarde klopt.
 */
export function NoteField({ transactionId, initialNote, onSaved }: NoteFieldProps) {
  const inputId = useId();
  const counterId = useId();
  const [value, setValue] = useState(initialNote ?? "");
  const [saved, setSaved] = useState(initialNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Codepoints, zodat een emoji als één teken telt.
  const length = [...value].length;
  const tooLong = length > NOTE_MAX;
  const changed = value.trim() !== saved.trim();

  function submit() {
    if (!changed || tooLong) return;
    const note = value.trim();
    setError(null);
    startTransition(async () => {
      const result = await saveNote(transactionId, note);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(note);
      setValue(note);
      onSaved?.(transactionId, note === "" ? null : note);
    });
  }

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={inputId} className="text-[13px] font-medium text-text">
        Notitie
      </label>
      <Input
        id={inputId}
        value={value}
        maxLength={NOTE_MAX}
        placeholder="Bijvoorbeeld ‘cadeau mama’"
        autoComplete="off"
        enterKeyHint="done"
        aria-describedby={length >= NOTE_COUNTER_FROM ? counterId : undefined}
        aria-invalid={tooLong || undefined}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex min-h-[18px] items-start justify-between gap-3 text-[13px] leading-[18px]">
        {error ? (
          <p className="text-negative" role="alert">
            {error}
          </p>
        ) : (
          <span />
        )}
        {length >= NOTE_COUNTER_FROM && (
          <p id={counterId} className={cn("shrink-0 tabular-nums", tooLong ? "text-negative" : "text-text-muted")}>
            {length}/{NOTE_MAX}
          </p>
        )}
      </div>
      <Button type="submit" variant="secondary" fullWidth disabled={!changed || tooLong} loading={isPending}>
        {value.trim() === "" && saved !== "" ? "Notitie wissen" : "Notitie bewaren"}
      </Button>
    </form>
  );
}
