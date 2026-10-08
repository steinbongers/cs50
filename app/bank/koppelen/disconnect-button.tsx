"use client";

import { useState, useTransition } from "react";
import { disconnectBank } from "../actions";

/** Koppeling verwijderen: toestemming intrekken, transacties blijven. */
export function DisconnectButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    if (!window.confirm("Bankkoppeling verwijderen? Je transacties blijven bewaard; er komen alleen geen nieuwe meer binnen.")) return;
    startTransition(async () => {
      const result = await disconnectBank();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div>
      <button type="button" onClick={run} disabled={isPending} className="min-h-10 text-sm font-medium text-negative disabled:opacity-60">
        Koppeling verwijderen
      </button>
      {error && <p className="text-sm text-negative">{error}</p>}
    </div>
  );
}
