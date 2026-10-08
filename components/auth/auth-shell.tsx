import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/config/app";

/** Kader voor de formulierpagina's (inloggen, registreren, privacy): naam bovenin, inhoud in het midden. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col px-5 pt-8 pb-[max(32px,env(safe-area-inset-bottom))]">
      <Link href="/welkom" className="-ml-1 flex min-h-11 items-center self-start px-1 text-[13px] leading-[18px] font-semibold text-primary">
        {APP_NAME}
      </Link>
      <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
    </div>
  );
}
