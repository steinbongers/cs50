"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartPie, Settings } from "lucide-react";
import { IconCards } from "@/components/ui/icons";
import { ACTION_LABEL } from "@/config/app";
import { cn } from "@/lib/utils";

function PieIcon({ size }: { size: number }) {
  return <ChartPie size={size} strokeWidth={1.75} />;
}
function SettingsIcon({ size }: { size: number }) {
  return <Settings size={size} strokeWidth={1.75} />;
}

/** Drie tabbladen; extra paden tellen mee voor het actieve tabblad (potje-detail hoort bij Overzicht). */
const items = [
  { href: "/overzicht", label: "Overzicht", Icon: PieIcon, also: ["/potjes"] },
  { href: "/swipen", label: ACTION_LABEL, Icon: IconCards, primary: true, also: [] },
  { href: "/instellingen", label: "Instellingen", Icon: SettingsIcon, also: ["/potjes/beheren"] },
] as const;

/** Vaste onderbalk met 3 items. De hoofdactie staat in het midden. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto grid h-16 w-full max-w-md grid-cols-3">
        {items.map(({ href, label, Icon, also, ...rest }) => {
          const matches = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
          const settingsOwns = pathname.startsWith("/potjes/beheren");
          const active =
            matches(href) || (also as readonly string[]).some(matches) ? !(href === "/overzicht" && settingsOwns) : false;
          const primary = "primary" in rest && rest.primary;
          return (
            <li key={href} className="flex items-stretch">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  "transition-colors duration-150",
                  active ? "text-primary" : "text-text-muted hover:text-text",
                )}
              >
                {primary ? (
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-full shadow-card transition-transform duration-150",
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-primary text-on-primary hover:scale-105",
                    )}
                  >
                    <Icon size={22} />
                  </span>
                ) : (
                  <Icon size={22} />
                )}
                <span className={cn(primary && "sr-only")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
