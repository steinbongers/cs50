import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppOpenLogger } from "@/components/layout/app-open-logger";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AppLockGate } from "@/components/native/app-lock-gate";
import { ensureProfile, requireUser } from "@/lib/auth";
import { countOpenTransactions } from "@/lib/transactions/queries";

/** App-shell: vereist een sessie én afgeronde onboarding. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  if (!profile.onboarding_done) redirect("/onboarding");

  // Voor de badge op het tabblad; een mislukte telling toont gewoon geen badge.
  const openCount = await countOpenTransactions().catch(() => 0);

  return (
    <>
      {/* Vóór de inhoud: het Face ID-slot dekt af voordat de rest binnenkomt. */}
      <AppLockGate />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</div>
      <BottomNav openCount={openCount} />
      <AppOpenLogger />
    </>
  );
}
