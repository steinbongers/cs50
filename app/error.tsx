"use client";

import { Button } from "@/components/ui/button";

/** Foutgrens voor een pagina: gewone taal, geen technische details. */
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-[22px] leading-7 font-semibold">Dat ging even mis</h1>
      <p className="text-[15px] leading-5 text-text-muted">Probeer het nog eens. Je gegevens zijn veilig.</p>
      <Button size="lg" onClick={() => retry()} className="mt-3">
        Opnieuw proberen
      </Button>
    </main>
  );
}
