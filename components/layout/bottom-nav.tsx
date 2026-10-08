"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCards, IconHome, IconJar, IconUser } from "@/components/ui/icons";
import { ACTION_LABEL } from "@/config/app";
import { cn } from "@/lib/utils";

const items = [
  { href: "/overzicht", label: "Overzicht", Icon: IconHome },
  { href: "/swipen", label: ACTION_LABEL, Icon: IconCards, primary: true },
  { href: "/potjes", label: "Potjes", Icon: IconJar },
  { href: "/profiel", label: "Profiel", Icon: IconUser },
] as const;

/** Vaste onderbalk met 4 items. "Swipen" is visueel de hoofdknop. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto grid h-16 w-full max-w-md grid-cols-4">
        {items.map(({ href, label, Icon, ...rest }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
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
