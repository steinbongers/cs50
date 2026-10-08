import type { Metadata } from "next";
import { APP_NAME } from "@/config/app";

export const metadata: Metadata = { title: "Even niet beschikbaar" };

/**
 * Wordt getoond (via de proxy) zolang de Supabase-omgevingsvariabelen ontbreken.
 * Voor de beheerder: zet de variabelen uit `.env.example` en start opnieuw.
 */
export default function NietIngesteldPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-[22px] leading-7 font-semibold">{APP_NAME} is er nog niet helemaal klaar voor</h1>
      <p className="text-[15px] leading-5 text-text-muted">
        We zijn de app nog aan het opzetten. Kom zo nog eens terug. Je gegevens zijn veilig.
      </p>
    </main>
  );
}
