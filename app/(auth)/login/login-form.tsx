"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithPassword, type AuthFormState } from "@/app/auth/actions";
import { AppleButton } from "@/components/auth/apple-button";
import { friendlyAuthError } from "@/components/auth/friendly-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input } from "@/components/ui/input";

const initialState: AuthFormState = {};

/** Inloggen met e-mail en wachtwoord, of met Apple. Een inloglink is geen zichtbare optie meer. */
export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signInWithPassword, initialState);
  const error = friendlyAuthError(state.error);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="E-mailadres" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.email}
          aria-invalid={error ? true : undefined}
        />
      </Field>
      <Field label="Wachtwoord" htmlFor="password" error={error}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
        />
      </Field>
      <SubmitButton size="lg" fullWidth>
        Inloggen
      </SubmitButton>
      <AppleButton next={next} label="Inloggen met Apple" />
      <p className="text-center text-sm text-text-muted">
        Nog geen account?{" "}
        <Link href="/registreren" className="inline-flex min-h-11 items-center font-medium text-primary">
          Account aanmaken
        </Link>
      </p>
    </form>
  );
}
