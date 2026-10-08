"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthFormState } from "@/app/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input } from "@/components/ui/input";
import { IconMail } from "@/components/ui/icons";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, action] = useActionState(signUp, initialState);

  if (state.success === "confirm-email") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card bg-surface p-6 text-center shadow-card">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <IconMail />
        </span>
        <h2 className="text-lg font-semibold">Bevestig je e-mailadres</h2>
        <p className="text-sm text-text-muted">
          We hebben een bevestigingslink gestuurd naar{" "}
          <strong className="text-text">{state.email}</strong>. Open de link om je account te
          activeren.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Hoe mogen we je noemen?" htmlFor="display_name" hint="Optioneel">
        <Input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="given-name"
          maxLength={60}
          defaultValue={state.displayName}
        />
      </Field>
      <Field label="E-mailadres" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.email}
          aria-invalid={state.error ? true : undefined}
        />
      </Field>
      <Field label="Wachtwoord" htmlFor="password" hint="Minimaal 8 tekens" error={state.error}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={state.error ? true : undefined}
        />
      </Field>
      <SubmitButton size="lg" fullWidth>
        Account aanmaken
      </SubmitButton>
      <p className="text-center text-sm text-text-muted">
        Al een account?{" "}
        <Link href="/login" className="font-medium text-primary">
          Inloggen
        </Link>
      </p>
    </form>
  );
}
