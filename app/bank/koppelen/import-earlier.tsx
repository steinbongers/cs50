"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ImportFrom } from "@/lib/bank/import-from";
import { importEarlier } from "../actions";
import { ImportFromChoice } from "./import-from-choice";

/** Al gekoppeld: alsnog eerdere kaartjes ophalen, bijvoorbeeld voor een uitgave van vóór de app. */
export function ImportEarlier() {
  const [choice, setChoice] = useState<ImportFrom>("90");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await importEarlier(choice);
      if (!result.ok) {
        setMessage({ text: result.error, error: true });
        return;
      }
      setMessage({
        text:
          result.inserted === 0
            ? "Geen nieuwe kaartjes gevonden. Verder terug geeft je bank niet."
            : `${result.inserted} ${result.inserted === 1 ? "kaartje" : "kaartjes"} opgehaald. Ze staan klaar bij Swipen.`,
        error: false,
      });
    });
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="import-earlier-title">
      <div className="px-1">
        <h2 id="import-earlier-title" className="text-[15px] leading-5 font-semibold">
          Eerdere kaartjes ophalen
        </h2>
        <p className="text-[13px] leading-[18px] text-text-muted">
          Handig als je geld terugkrijgt voor iets van vóór de app. Dubbele kaartjes komen er niet bij.
        </p>
      </div>
      <ImportFromChoice value={choice} onChange={setChoice} exclude={["nu"]} />
      <Button variant="secondary" size="lg" fullWidth onClick={run} disabled={pending}>
        {pending ? "Bezig met ophalen" : "Ophalen"}
      </Button>
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
