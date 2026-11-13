import { ChevronDown } from "lucide-react";
import { APP_NAME } from "@/config/app";

/**
 * Uitleg vóór het kiezen van een bank: wat de app wel en niet kan, en hoe de
 * toestemming loopt. Ingeklapt, zodat wie het al weet meteen door kan.
 * Rol van Enable Banking: zie docs/dpia-concept.md (vergunde AISP onder FIN-FSA).
 */
export function HowItWorks() {
  return (
    <details className="group rounded-card bg-surface shadow-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
        Hoe werkt dit?
        <ChevronDown
          aria-hidden
          size={18}
          className="shrink-0 text-text-muted transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <dl className="flex flex-col gap-3 px-4 pb-4 text-[13px] leading-[18px]">
        <div>
          <dt className="font-medium">Wat {APP_NAME} ziet</dt>
          <dd className="text-text-muted">Je betalingen, je saldo en de naam van je rekening.</dd>
        </div>
        <div>
          <dt className="font-medium">Wat {APP_NAME} niet kan</dt>
          <dd className="text-text-muted">
            We kunnen niets overmaken en zien je wachtwoord nooit.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Toestemming geef je zelf</dt>
          <dd className="text-text-muted">
            Dat doe je bij je eigen bank, en af en toe opnieuw.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Stoppen kan altijd</dt>
          <dd className="text-text-muted">In Instellingen bij Bank, of bij je bank zelf.</dd>
        </div>
        <div>
          <dt className="font-medium">Via Enable Banking</dt>
          <dd className="text-text-muted">
            Enable Banking, een Fins bedrijf onder toezicht, haalt je gegevens op.
          </dd>
        </div>
      </dl>
    </details>
  );
}
