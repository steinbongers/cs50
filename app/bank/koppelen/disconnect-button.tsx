"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { disconnectBank } from "../actions";

/** Koppeling verwijderen: toestemming intrekken, transacties blijven. */
export function DisconnectButton() {
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run() {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await disconnectBank();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
        className="min-h-11 text-sm font-medium text-negative disabled:opacity-60"
      >
        Koppeling verwijderen
      </button>
      {error && <p className="text-sm text-negative">{error}</p>}

      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Bankkoppeling verwijderen?"
        description="Je transacties blijven bewaard; er komen alleen geen nieuwe meer binnen."
      >
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={() => setConfirmOpen(false)}>
            Toch niet
          </Button>
          <Button variant="danger" fullWidth onClick={run} loading={isPending}>
            Verwijderen
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
