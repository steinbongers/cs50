"use client";

import { useId, useState } from "react";
import { parseEuroInput } from "@/app/(app)/potjes/[id]/goal-sheet";
import { EuroInput } from "@/components/cash/euro-input";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import { estimateInputValue, isValidEstimate } from "@/lib/transactions/refunds";

interface EstimateFormProps {
  /** Bedrag van de uitgave, positief. */
  expenseAmount: number;
  /** Wat er via de bank terug is, inclusief een terugbetaling die nu binnenkomt. */
  received: number;
  pending?: boolean;
  onSubmit: (estimate: number) => void;
  onCancel: () => void;
}

/**
 * Een deel kwam buiten de bank terug (contant, WieBetaaltWat): jij schat wat je zelf uitgaf.
 * Voorgevuld met wat er nu van jou zou zijn; het potje telt daarna precies dit bedrag.
 */
export function EstimateForm({ expenseAmount, received, pending = false, onSubmit, onCancel }: EstimateFormProps) {
  const inputId = useId();
  const hintId = useId();
  const [value, setValue] = useState(() => estimateInputValue(expenseAmount, received));
  const [invalid, setInvalid] = useState(false);

  function submit() {
    const estimate = parseEuroInput(value);
    if (estimate === null || !isValidEstimate(estimate, expenseAmount)) {
      setInvalid(true);
      return;
    }
    onSubmit(estimate);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[15px] font-medium">
        Hoeveel heb je zelf uitgegeven?
      </label>
      <EuroInput
        id={inputId}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={hintId}
      />
      <p id={hintId} className={invalid ? "text-[13px] leading-[18px] text-accent-strong" : "text-[13px] leading-[18px] text-text-muted"}>
        {invalid
          ? `Vul een bedrag in tussen € 0 en ${formatEuro(expenseAmount)}.`
          : `Van de ${formatEuro(expenseAmount)}. Dit bedrag telt in je potje.`}
      </p>
      <Button size="lg" fullWidth loading={pending} onClick={submit}>
        Opslaan
      </Button>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="h-11 self-center px-2 text-[15px] font-medium text-primary"
      >
        Terug
      </button>
    </div>
  );
}
