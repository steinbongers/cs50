import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="safe-top mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col">{children}</div>;
}
