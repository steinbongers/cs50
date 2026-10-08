import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/config/app";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col px-5 pt-8 pb-8">
      <Link href="/welkom" className="self-start text-sm font-semibold text-primary">
        {APP_NAME}
      </Link>
      <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
    </div>
  );
}
