import Link from "next/link";
import { DisconnectButton } from "./disconnect-button";
import { Card } from "@/components/ui/card";
import { IconBank } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/format";
import type { ConnectionStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface ConnectionCardProps {
  aspspName: string;
  status: ConnectionStatus;
  daysLeft: number | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  showReconnect: boolean;
  next: string;
}

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  active: "Gekoppeld",
  expiring: "Verloopt binnenkort",
  expired: "Verlopen",
  revoked: "Verwijderd",
};

export function ConnectionCard({ aspspName, status, daysLeft, lastSyncedAt, lastError, showReconnect, next }: ConnectionCardProps) {
  const detail =
    status === "active" && daysLeft !== null
      ? `Nog ${daysLeft} dagen geldig`
      : status === "expiring" && daysLeft !== null
        ? `Verloopt over ${daysLeft} ${daysLeft === 1 ? "dag" : "dagen"}`
        : status === "expired"
          ? "Je bank vraagt opnieuw om toestemming"
          : "Je transacties blijven bewaard";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl",
            status === "active" ? "bg-positive-soft text-positive" : "bg-accent-soft text-accent",
          )}
        >
          <IconBank />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{aspspName}</p>
          <p className="text-sm text-text-muted">
            {STATUS_TEXT[status]} · {detail}
          </p>
          {lastSyncedAt && (
            <p className="text-xs text-text-muted">
              Laatst bijgewerkt {formatDateTime(lastSyncedAt)}
            </p>
          )}
        </div>
      </div>
      {lastError && <p className="text-sm text-negative">{lastError}</p>}
      {status !== "revoked" && <DisconnectButton />}
      {showReconnect && (
        <Link
          href={`/bank/koppelen?reconnect=1&next=${encodeURIComponent(next)}`}
          className="flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-[15px] font-semibold text-on-primary hover:bg-primary-strong"
        >
          Opnieuw koppelen
        </Link>
      )}
    </Card>
  );
}
