"use client";

/** Laatste vangnet als zelfs de layout faalt; bewust zonder afhankelijkheden. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="nl">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Dat ging even mis</h1>
        <p style={{ color: "#7b8194" }}>Er is iets misgegaan. Probeer het opnieuw.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: "1rem", padding: "0.75rem 1.25rem", borderRadius: "999px", background: "#0075ff", color: "#fff", border: 0 }}
        >
          Opnieuw proberen
        </button>
      </body>
    </html>
  );
}
