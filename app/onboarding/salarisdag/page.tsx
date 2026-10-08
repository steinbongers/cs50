import type { Metadata } from "next";
import { ensureProfile, requireUser } from "@/lib/auth";
import { SalaryDayForm } from "./salary-day-form";

export const metadata: Metadata = { title: "Salarisdag" };

export default async function OnboardingSalarisdagPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Wanneer komt je geld binnen?</h1>
        <p className="mt-1 text-text-muted">
          Vanaf die dag telt een nieuwe maand. Zo kijk je altijd naar wat je met dít salaris doet,
          niet naar de kalender.
        </p>
      </div>
      <SalaryDayForm initialDay={profile.salary_day} />
    </div>
  );
}
