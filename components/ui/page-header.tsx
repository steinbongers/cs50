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
    <header className="safe-top-2 flex items-start gap-2 px-4 pb-3">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Terug"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text hover:bg-surface-muted"
        >
          <IconChevronLeft />
        </Link>
      )}
      <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
        <h1 className="truncate text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] leading-[18px] text-text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
