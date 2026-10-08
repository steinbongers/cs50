"use client";

import { Button } from "@/components/ui/button";

/** Foutgrens voor een pagina: Nederlandse tekst, geen technische details. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Dat ging even mis</h1>
      <p className="text-muted">Er is iets misgegaan bij het laden van deze pagina. Probeer het opnieuw.</p>
      <div>
        <Button onClick={reset}>Opnieuw proberen</Button>
      </div>
    </main>
  );
}
