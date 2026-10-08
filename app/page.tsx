import { redirect } from "next/navigation";
import { ensureProfile, getUser } from "@/lib/auth";

/** Startpunt: stuurt door op basis van sessie en onboardingstatus. */
export default async function RootPage() {
  const user = await getUser();
  if (!user) redirect("/welkom");

  const profile = await ensureProfile(user);
  redirect(profile.onboarding_done ? "/overzicht" : "/onboarding");
}
