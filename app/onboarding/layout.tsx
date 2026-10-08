import type { ReactNode } from "react";
import { APP_NAME } from "@/config/app";
import { requireUser } from "@/lib/auth";
import { OnboardingSteps } from "./steps";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div className="safe-top mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col">
      <header className="flex flex-col gap-3 px-5 pt-6">
        <p className="text-sm font-semibold text-primary">{APP_NAME}</p>
        <OnboardingSteps />
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
