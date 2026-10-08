"use client";

import { CalendarDays, Check, ChevronRight } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-group";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { deleteAccount, updateDisplayName, updateSalaryDay } from "./actions";
import { ROW_FOCUS } from "./rows";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Profielkaart bovenaan: initiaal, naam en e-mail. Tik opent het bewerken van je naam. */
export function ProfileCard({ displayName, email }: { displayName: string; email: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initial = (displayName || email || "?").trim().slice(0, 1).toUpperCase() || "?";

  function openSheet() {
    setName(displayName);
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (!result.ok) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label={`Naam aanpassen, nu ${displayName || "geen naam ingevuld"}`}
        className={cn(
          "flex min-h-[80px] w-full items-center gap-3 rounded-card bg-surface px-4 py-3 text-left shadow-card",
          "transition-colors duration-150 active:bg-surface-muted",
        )}
      >
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[22px] font-semibold text-primary"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[17px] font-semibold", !displayName && "text-text-muted")}>
            {displayName || "Geen naam ingevuld"}
          </span>
          {email && <span className="block truncate text-[15px] text-text-muted">{email}</span>}
        </span>
        <ChevronRight aria-hidden size={16} className="shrink-0 text-text-muted/60" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Je naam">
        <div className="flex flex-col gap-4">
          <Field label="Hoe mogen we je noemen?" htmlFor="settings-name">
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoComplete="given-name"
            />
          </Field>
          {error && (
            <p className="text-[13px] leading-[18px] text-negative" role="alert">
              {error}
            </p>
          )}
          <Button fullWidth onClick={save} loading={isPending}>
            Opslaan
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/** Rij "Salarisdag" met de sheet om de dag te kiezen. */
export function SalaryDayRow({ salaryDay }: { salaryDay: number | null }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<number | null>(salaryDay);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openSheet() {
    setDay(salaryDay);
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateSalaryDay(day);
      if (!result.ok) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <>
      <ListRow
        icon={CalendarDays}
        iconClass="bg-cat-groen-soft text-cat-groen"
        label="Salarisdag"
        value={salaryDay ? `${salaryDay}e` : "Kalendermaand"}
        onClick={openSheet}
        trailing={<ChevronRight aria-hidden size={16} className="shrink-0 text-text-muted/60" />}
        className={ROW_FOCUS}
      />

      <Sheet open={open} onClose={() => setOpen(false)} title="Salarisdag">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p id="salary-day-label" className="text-[15px] font-medium">
              Op welke dag komt je salaris binnen?
            </p>
            <div role="radiogroup" aria-labelledby="salary-day-label" className="flex flex-col gap-2">
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={day === d}
                  aria-label={`De ${d}e`}
                  onClick={() => setDay(d)}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-full text-[15px] font-medium tabular-nums",
                    "transition-colors duration-150",
                    day === d ? "bg-primary text-on-primary" : "bg-surface-muted text-text active:bg-border",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              type="button"
              role="radio"
              aria-checked={day === null}
              onClick={() => setDay(null)}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-1 text-left text-[15px] font-medium transition-colors duration-150 active:bg-surface-muted"
            >
              <span>Gewoon de kalendermaand</span>
              {day === null && <Check aria-hidden size={18} strokeWidth={2.25} className="shrink-0 text-primary" />}
            </button>
            </div>
            <p className="text-[13px] text-text-muted">Valt die dag in het weekend? Dan tellen we vanaf de vrijdag ervoor.</p>
          </div>
          {error && (
            <p className="text-[13px] leading-[18px] text-negative" role="alert">
              {error}
            </p>
          )}
          <Button fullWidth onClick={save} loading={isPending}>
            Opslaan
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/** Losse rij "Account verwijderen": één bevestiging, daarna direct en definitief weg. */
export function DeleteAccountRow() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openSheet() {
    setError(null);
    setOpen(true);
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={cn(
          "flex min-h-[52px] w-full items-center justify-center px-4 text-[15px] leading-5 text-negative",
          "transition-colors duration-150 active:bg-surface-muted",
          ROW_FOCUS,
        )}
      >
        Account verwijderen
      </button>

      <Sheet
        open={open}
        onClose={() => {
          if (!isPending) setOpen(false);
        }}
        title="Account verwijderen?"
        description="Je potjes, kaartjes, delen en bankkoppeling verdwijnen meteen en voor altijd. Download eerst je gegevens als je ze wilt bewaren."
      >
        <div className="flex flex-col gap-2 pt-2">
          {error && (
            <p className="pb-2 text-[13px] leading-[18px] text-negative" role="alert">
              {error}
            </p>
          )}
          <Button variant="danger" fullWidth size="lg" onClick={remove} loading={isPending}>
            Account verwijderen
          </Button>
          <Button variant="ghost" fullWidth size="lg" onClick={() => setOpen(false)} disabled={isPending}>
            Toch niet
          </Button>
        </div>
      </Sheet>
    </>
  );
}
