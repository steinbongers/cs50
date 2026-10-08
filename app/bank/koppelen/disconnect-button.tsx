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
        className="min-h-11 text-[13px] leading-[18px] font-medium text-negative disabled:opacity-60"
      >
        Bank ontkoppelen
      </button>
      {error && <p className="text-[13px] leading-[18px] text-negative">{error}</p>}

      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Bank ontkoppelen?"
        description="Je kaartjes blijven bewaard. Er komen alleen geen nieuwe meer binnen."
      >
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={() => setConfirmOpen(false)}>
            Toch niet
          </Button>
          <Button variant="danger" fullWidth onClick={run} loading={isPending}>
            Ontkoppelen
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
