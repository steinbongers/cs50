import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Account aanmaken" };

export default function RegistrerenPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account aanmaken</h1>
        <p className="mt-1 text-text-muted">Binnen een minuut ben je aan het swipen.</p>
      </div>
      <RegisterForm />
    </div>
  );
}
