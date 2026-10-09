import Link from "next/link";
import { cn } from "@/lib/utils";

export type OverviewView = "uitgaven" | "inkomsten";

/** "/overzicht", "/overzicht?maand=2", "/overzicht?maand=1&weergave=inkomsten". */
export function overviewHref(back: number, view: OverviewView): string {
  const query = new URLSearchParams();
  if (back > 0) query.set("maand", String(back));
  if (view === "inkomsten") query.set("weergave", "inkomsten");
  const text = query.toString();
  return text ? `/overzicht?${text}` : "/overzicht";
}

const OPTIONS: { value: OverviewView; label: string }[] = [
  { value: "uitgaven", label: "Uitgaven" },
  { value: "inkomsten", label: "Inkomsten" },
];

/**
 * Uitgaven | Inkomsten. Ziet eruit als `Segmented`, maar elke kant is een link: de keuze
 * staat in de URL (?weergave=inkomsten), zodat bladeren door maanden haar vasthoudt.
 */
export function ViewSwitch({ view, back }: { view: OverviewView; back: number }) {
  return (
    <nav aria-label="Weergave" className="grid h-11 grid-cols-2 gap-1 rounded-control bg-surface-muted p-1">
      {OPTIONS.map((option) => {
        const active = option.value === view;
        return (
          <Link
            key={option.value}
            href={overviewHref(back, option.value)}
            replace
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              // Het after-vlak vergroot het tikdoel tot de volle 44px hoogte van de balk.
              "relative flex items-center justify-center truncate rounded-[10px] px-2 text-[15px] font-medium",
              "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
              "transition-[background-color,color,box-shadow] duration-200 ease-out-soft",
              active ? "bg-surface text-text shadow-card" : "text-text-muted hover:text-text",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
