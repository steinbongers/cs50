"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Laatste vangnet als zelfs de root-layout faalt. Deze pagina krijgt geen root-layout,
 * dus laden we de tokens zelf en zetten we een handmatig gekozen thema terug.
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    try {
      const theme = localStorage.getItem("theme");
      if (theme === "dark" || theme === "light") document.documentElement.dataset.theme = theme;
    } catch {
      // geen opslag: systeemthema
    }
  }, []);

  return (
    <html lang="nl" className="h-full">
      <body className="flex min-h-full flex-col bg-bg font-sans text-text">
        <title>Dat ging even mis</title>
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-[22px] leading-7 font-semibold">Dat ging even mis</h1>
          <p className="text-[15px] leading-5 text-text-muted">Probeer het nog eens. Je gegevens zijn veilig.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-3 inline-flex h-13 min-h-13 items-center justify-center rounded-control bg-primary px-5 text-base font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-strong"
          >
            Opnieuw proberen
          </button>
        </main>
      </body>
    </html>
  );
}
