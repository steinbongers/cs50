import Link from "next/link";
import { DisconnectButton } from "./disconnect-button";
import { Card } from "@/components/ui/card";
import { IconBank } from "@/components/ui/icons";
import { LOCALE } from "@/config/app";
import { formatDateTime } from "@/lib/format";
import type { ConnectionStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface ConnectionCardProps {
  aspspName: string;
  status: ConnectionStatus;
  daysLeft: number | null;
  /** ISO-tijdstip tot wanneer de toestemming geldt. */
  validUntil: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  showReconnect: boolean;
  next: string;
}

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  active: "Gekoppeld",
  expiring: "Verloopt binnenkort",
  expired: "Ontkoppeld",
  revoked: "Ontkoppeld",
};

const validUntilFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Amsterdam",
});

export function ConnectionCard({
  aspspName,
  status,
  daysLeft,
  validUntil,
  lastSyncedAt,
  lastError,
  showReconnect,
  next,
}: ConnectionCardProps) {
  const detail =
    status === "active" && validUntil
      ? `Geldig tot ${validUntilFormatter.format(new Date(validUntil))}`
      : status === "expiring" && daysLeft !== null
        ? `Verloopt over ${daysLeft} ${daysLeft === 1 ? "dag" : "dagen"}`
        : status === "expired"
          ? "Je bank vraagt opnieuw om toestemming"
          : status === "revoked"
            ? "Je kaartjes blijven gewoon bewaard"
            : null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl",
            status === "active" ? "bg-positive-soft text-positive" : "bg-accent-soft text-accent-strong",
          )}
          aria-hidden
        >
          <IconBank />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{aspspName}</p>
          <p className="text-[13px] leading-[18px] text-text-muted">
            {STATUS_TEXT[status]}
            {detail && ` · ${detail}`}
          </p>
          {lastSyncedAt && <p className="text-[13px] leading-[18px] text-text-muted">Bijgewerkt {formatDateTime(lastSyncedAt)}</p>}
        </div>
      </div>
      {/* De opgeslagen fout kan banktekst bevatten; we tonen een vaste zin. */}
      {lastError && status !== "revoked" && (
        <p className="text-[13px] leading-[18px] text-text-muted">De laatste keer verversen lukte niet. We proberen het vanzelf opnieuw.</p>
      )}
      {status !== "revoked" && <DisconnectButton />}
      {showReconnect && (
        <Link
          href={`/bank/koppelen?reconnect=1&next=${encodeURIComponent(next)}`}
          className="flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-[15px] font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-strong"
        >
          Opnieuw koppelen
        </Link>
      )}
    </Card>
  );
}
