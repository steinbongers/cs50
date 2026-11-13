"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startFromToday } from "../actions";

/**
 * Voor wie toch pas vanaf vandaag wil bijhouden: alle oudere open kaartjes in één keer van de
 * stapel, naar Telt niet mee. Vraagt eerst om bevestiging; per kaartje terug te zetten.
 */
export function StartFromToday() {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await startFromToday();
      setConfirming(false);
      if (!result.ok) {
        setMessage({ text: result.error, error: true });
        return;
      }
      setMessage({
        text:
          result.count === 0
            ? "Er lagen geen oudere kaartjes meer."
            : `${result.count} ${result.count === 1 ? "kaartje telt" : "kaartjes tellen"} niet meer mee. Je stapel begint bij vandaag.`,
        error: false,
      });
    });
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="start-fresh-title">
      <div className="px-1">
        <h2 id="start-fresh-title" className="text-[15px] leading-5 font-semibold">
          Begin vanaf vandaag
        </h2>
        <p className="text-[13px] leading-[18px] text-text-muted">
          Oudere kaartjes gaan van je stapel en tellen niet mee.
        </p>
      </div>
      {confirming ? (
        <div className="flex gap-2">
          <Button variant="ghost" size="lg" fullWidth onClick={() => setConfirming(false)} disabled={pending}>
            Annuleer
          </Button>
          <Button variant="danger" size="lg" fullWidth onClick={run} disabled={pending}>
            {pending ? "Bezig" : "Ja, van de stapel"}
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="lg" fullWidth onClick={() => setConfirming(true)}>
          Oudere kaartjes van de stapel
        </Button>
      )}
      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={message.error ? "px-1 text-[13px] text-negative" : "px-1 text-[13px] text-text-muted"}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
