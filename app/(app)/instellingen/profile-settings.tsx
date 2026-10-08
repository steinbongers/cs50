"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { deleteAccount, updateProfileSettings } from "./actions";

interface ProfileSettingsProps {
  displayName: string;
  salaryDay: number | null;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Naam en salarisdag bewerken, data exporteren, account verwijderen. */
export function ProfileSettings({ displayName, salaryDay }: ProfileSettingsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [day, setDay] = useState<number | null>(salaryDay);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateProfileSettings({ displayName: name, salaryDay: day });
      if (!result.ok) setError(result.error);
      else setEditOpen(false);
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount(confirmation);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <>
      <div className="divide-y rounded-card bg-surface shadow-card">
        <button type="button" onClick={() => setEditOpen(true)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left hover:bg-surface-muted">
          <span className="flex-1">
            <span className="block font-medium">Naam en salarisdag</span>
            <span className="block text-sm text-text-muted">
              {displayName || "Geen naam"} · {salaryDay ? `salaris op de ${salaryDay}e` : "kalendermaand"}
            </span>
          </span>
        </button>
        <a href="/api/export" download className="flex min-h-14 w-full items-center gap-3 px-4 text-left hover:bg-surface-muted">
          <span className="flex-1">
            <span className="block font-medium">Mijn data downloaden</span>
            <span className="block text-sm text-text-muted">Alle transacties en potjes als CSV</span>
          </span>
        </a>
        <button type="button" onClick={() => setDeleteOpen(true)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left hover:bg-surface-muted">
          <span className="flex-1">
            <span className="block font-medium text-negative">Account verwijderen</span>
            <span className="block text-sm text-text-muted">Direct en definitief, alles weg</span>
          </span>
        </button>
      </div>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Naam en salarisdag">
        <div className="flex flex-col gap-4">
          <Field label="Hoe mogen we je noemen?" htmlFor="settings-name">
            <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="given-name" />
          </Field>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Op welke dag komt je geld binnen?</p>
            <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Salarisdag">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={day === d}
                  onClick={() => setDay(d)}
                  className={cn(
                    "flex aspect-square min-h-11 items-center justify-center rounded-lg text-sm font-medium tabular-nums",
                    day === d ? "bg-primary text-on-primary" : "bg-surface-muted hover:bg-border",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setDay(null)} className={cn("min-h-11 self-start text-sm font-medium", day === null ? "text-text" : "text-primary")}>
              {day === null ? "Kalendermaand (gekozen)" : "Liever de kalendermaand"}
            </button>
          </div>
          {error && <p className="text-sm text-negative" role="alert">{error}</p>}
          <Button fullWidth onClick={save} loading={isPending}>
            Opslaan
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Account verwijderen"
        description="Dit kan niet ongedaan worden gemaakt. Je transacties, potjes en bankkoppeling verdwijnen meteen en voorgoed."
      >
        <div className="flex flex-col gap-4">
          <Field label="Typ VERWIJDER om te bevestigen" htmlFor="delete-confirm">
            <Input id="delete-confirm" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" autoCapitalize="characters" />
          </Field>
          {error && <p className="text-sm text-negative" role="alert">{error}</p>}
          <Button variant="danger" fullWidth onClick={remove} loading={isPending} disabled={confirmation.trim().toUpperCase() !== "VERWIJDER"}>
            Verwijder mijn account
          </Button>
        </div>
      </Sheet>
    </>
  );
}
