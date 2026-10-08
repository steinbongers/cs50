import Link from "next/link";
import { IconBank } from "@/components/ui/icons";
import { daysUntil, statusFor } from "@/lib/bank/connections";
import type { BankConnectionRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/** Banner op het overzicht: koppel je bank, of je koppeling verloopt (bijna). */
export function ConnectionBanner({ connection }: { connection: BankConnectionRow | null }) {
  if (!connection) {
    return (
      <Link
        href="/bank/koppelen?next=/overzicht"
        className="flex items-center gap-3 rounded-card bg-primary-soft px-4 py-3 text-primary transition-colors duration-150 hover:bg-primary/15"
      >
        <IconBank size={22} className="shrink-0" />
        <span className="flex-1 text-sm">
          <span className="font-semibold">Koppel je bank</span>
          <span className="block text-text">Dan komen je transacties vanzelf binnen.</span>
        </span>
      </Link>
    );
  }

  const status = statusFor(connection);
  if (status === "active") return null;

  const days = daysUntil(connection.valid_until);
  const text =
    status === "expiring" && days !== null
      ? `Je bankkoppeling verloopt over ${days} ${days === 1 ? "dag" : "dagen"}.`
      : status === "expired"
        ? "Je bankkoppeling is verlopen. Je oude transacties blijven gewoon staan."
        : "Je bankkoppeling is verwijderd.";

  return (
    <Link
      href="/bank/koppelen?reconnect=1&next=/overzicht"
      className={cn(
        "flex items-center gap-3 rounded-card px-4 py-3 transition-colors duration-150",
        status === "expiring" ? "bg-accent-soft text-accent" : "bg-negative-soft text-negative",
      )}
    >
      <IconBank size={22} className="shrink-0" />
      <span className="flex-1 text-sm">
        <span className="font-semibold">{text}</span>
        <span className="block text-text">Tik om opnieuw te koppelen.</span>
      </span>
    </Link>
  );
}
