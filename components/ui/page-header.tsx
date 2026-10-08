import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronLeft } from "./icons";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, backHref, action }: PageHeaderProps) {
  return (
    <header className="safe-top flex items-start gap-2 px-4 pt-6 pb-3">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Terug"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text hover:bg-surface-muted"
        >
          <IconChevronLeft />
        </Link>
      )}
      <div className="min-w-0 flex-1 pt-1.5">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </header>
  );
}
