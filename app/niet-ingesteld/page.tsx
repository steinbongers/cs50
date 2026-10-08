import { APP_NAME } from "@/config/app";

/** Wordt getoond (via de proxy) zolang de Supabase-omgevingsvariabelen ontbreken. */
export default function NietIngesteldPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">{APP_NAME} is nog niet ingesteld</h1>
      <p className="text-muted">
        De server mist de instellingen om verbinding te maken met de database. Zet de omgevingsvariabelen
        uit <code className="text-sm">.env.example</code> en start opnieuw.
      </p>
    </main>
  );
}
