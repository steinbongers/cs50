"use client";

import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Bedragveld met euroteken ervoor en het numerieke toetsenbord met komma. */
export function EuroInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode">) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted" aria-hidden>
        €
      </span>
      <Input type="text" inputMode="decimal" autoComplete="off" className="pl-7 pr-3 text-right tabular-nums" {...props} />
    </div>
  );
}
