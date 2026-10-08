"use client";

import { useState, useTransition } from "react";
import { startAppleSignIn } from "@/app/auth/actions";
import { Spinner } from "@/components/ui/button";

/** Zwarte Apple-knop volgens de richtlijnen van Apple; navigeert naar de Apple-login. */
export function AppleButton({ next, inviteCode, label }: { next: string; inviteCode?: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function go() {
    setError(null);
    startTransition(async () => {
      const result = await startAppleSignIn(next, inviteCode);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.assign(result.url);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={go}
        disabled={isPending}
        className="flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-control bg-black text-base font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? (
          <Spinner />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M16.7 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8 2.1-1.2 2.9-2.4c.9-1.3 1.3-2.6 1.3-2.7 0 0-2.5-1-2.5-3.9zM14.3 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z" />
          </svg>
        )}
        {label}
      </button>
      {error && (
        <p className="text-sm text-negative" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
