import { redirect } from "next/navigation";
import { ensureProfile, getUser } from "@/lib/auth";
import { startRoute } from "@/lib/start-route";
import { countOpenTransactions } from "@/lib/transactions/queries";

/**
 * Startpunt: stuurt op de server door, zodat er niets knippert.
 * Liggen er kaartjes, dan naar Swipen; is de stapel leeg (of mislukt de telling), dan naar Overzicht.
 */
export default async function RootPage() {
  const user = await getUser();
  if (!user) redirect(startRoute({ signedIn: false, onboardingDone: false, openCount: null }));

  const profile = await ensureProfile(user);
  let openCount: number | null = null;
  if (profile.onboarding_done) {
    try {
      openCount = await countOpenTransactions();
    } catch {
      openCount = null;
    }
  }
  redirect(startRoute({ signedIn: true, onboardingDone: profile.onboarding_done, openCount }));
}
