import Link from "next/link";
import { IconBank } from "@/components/ui/icons";
import { daysUntil, statusFor } from "@/lib/bank/connections";
import type { BankConnectionRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/**
 * Banner op het overzicht, alleen als er iets met je koppeling moet gebeuren.
 * Zonder koppeling rendert hij niets: het overzicht toont dan zelf een lege staat.
 */
export function ConnectionBanner({ connection }: { connection: BankConnectionRow | null }) {
  if (!connection) return null;

  const status = statusFor(connection);
  if (status === "active") return null;

  const days = daysUntil(connection.valid_until);
  const expiring = status === "expiring";
  const text =
    expiring && days !== null
      ? days <= 0
        ? "Je bankkoppeling verloopt vandaag."
        : `Je bankkoppeling verloopt over ${days} ${days === 1 ? "dag" : "dagen"}.`
      : expiring
        ? "Je bankkoppeling verloopt binnenkort."
        : "Je bank is ontkoppeld.";

  return (
    <Link
      href="/bank/koppelen?reconnect=1&next=/overzicht"
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-card px-4 py-3 transition-[opacity,transform] duration-150 active:scale-[0.98]",
        expiring ? "bg-accent-soft text-accent" : "bg-negative-soft text-negative",
      )}
    >
      <IconBank size={22} className="shrink-0" aria-hidden />
      <span className="flex-1 text-sm">
        <span className="font-semibold">{text}</span>
        <span className="block text-text">Tik om opnieuw te koppelen.</span>
      </span>
    </Link>
  );
}
