import type { Metadata } from "next";
import { ensureProfile, requireUser } from "@/lib/auth";
import { StepHeader } from "../steps";
import { SalaryDayForm } from "./salary-day-form";

export const metadata: Metadata = { title: "Salarisdag" };

export default async function OnboardingSalarisdagPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader title="Wanneer komt je geld binnen?">
        Daar begint je maand. Zo zie je wat je met dít salaris doet.
      </StepHeader>
      <SalaryDayForm initialDay={profile.salary_day} />
    </div>
  );
}
