"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
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

/** Badgetekst: maximaal "99+". */
function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/**
 * Vaste onderbalk met 3 items. De hoofdactie staat in het midden, met een badge
 * voor het aantal open kaartjes (niet bij 0 en niet als je al op dat tabblad staat).
 */
export function BottomNav({ openCount = 0 }: { openCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();

  // De layout (en dus de badge) wordt bij een gewone navigatie niet opnieuw
  // gerenderd. Na het swipen verandert het aantal kaartjes, dus bij het
  // verlaten van /swipen één keer verversen. Tijdens het swipen niet, zodat
  // de stapel niet onder je vingers ververst.
  const previous = useRef(pathname);
  useEffect(() => {
    const was = previous.current;
    previous.current = pathname;
    if (was !== pathname && (was === "/swipen" || was.startsWith("/swipen/"))) router.refresh();
  }, [pathname, router]);

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
          const showBadge = primary && !active && openCount > 0;
          return (
            <li key={href} className="flex items-stretch">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={showBadge ? `${label}, ${openCount} ${openCount === 1 ? "kaartje" : "kaartjes"}` : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  "transition-colors duration-150",
                  active ? "text-primary" : "text-text-muted hover:text-text",
                )}
              >
                {primary ? (
                  <span
                    className={cn(
                      "relative flex size-11 shrink-0 items-center justify-center rounded-full shadow-card transition-transform duration-150 motion-reduce:transition-none",
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-primary text-on-primary hover:scale-105 motion-reduce:hover:scale-100",
                    )}
                  >
                    <Icon size={22} />
                    {showBadge ? (
                      <span
                        aria-hidden
                        className="absolute -top-1 -right-1 h-[18px] min-w-[18px] rounded-full bg-accent px-1 text-center text-[11px] font-semibold leading-[18px] text-on-primary tabular-nums ring-2 ring-surface"
                      >
                        {badgeText(openCount)}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <Icon size={22} />
                )}
                <span className={cn(primary && "text-[10px] leading-3")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
