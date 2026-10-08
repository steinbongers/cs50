import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ensureProfile, requireUser } from "@/lib/auth";

/** App-shell: vereist een sessie én afgeronde onboarding. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  if (!profile.onboarding_done) redirect("/onboarding");

  return (
    <>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-24">{children}</div>
      <BottomNav />
    </>
  );
}
