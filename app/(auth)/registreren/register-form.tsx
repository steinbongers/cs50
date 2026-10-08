"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp, type AuthFormState } from "@/app/auth/actions";
import { AppleButton } from "@/components/auth/apple-button";
import { friendlyAuthError } from "@/components/auth/friendly-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input } from "@/components/ui/input";
import { IconMail } from "@/components/ui/icons";

const initialState: AuthFormState = {};

export function RegisterForm({ requireInvite, prefillCode }: { requireInvite: boolean; prefillCode: string }) {
  const [state, action] = useActionState(signUp, initialState);
  const [inviteCode, setInviteCode] = useState(state.inviteCode ?? prefillCode);
  const codeError = state.error?.includes("uitnodigingscode") ? friendlyAuthError(state.error) : undefined;
  const otherError = state.error && !codeError ? friendlyAuthError(state.error) : undefined;

  if (state.success === "confirm-email") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card bg-surface p-6 text-center shadow-card">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <IconMail />
        </span>
        <h2 className="text-[17px] font-semibold">Kijk in je mail</h2>
        <p className="text-[15px] text-text-muted">
          We stuurden een link naar <strong className="font-semibold text-text">{state.email}</strong>. Tik erop en je
          bent binnen.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {requireInvite && (
        <Field label="Uitnodigingscode" htmlFor="invite_code" error={codeError}>
          <Input
            id="invite_code"
            name="invite_code"
            type="text"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="uppercase tracking-wider"
            aria-invalid={codeError ? true : undefined}
          />
        </Field>
      )}
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
          aria-invalid={otherError ? true : undefined}
        />
      </Field>
      <Field label="Wachtwoord" htmlFor="password" hint="Minimaal 8 tekens" error={otherError}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={otherError ? true : undefined}
        />
      </Field>
      <SubmitButton size="lg" fullWidth>
        Account aanmaken
      </SubmitButton>
      <AppleButton next="/onboarding" inviteCode={requireInvite ? inviteCode : undefined} label="Registreren met Apple" />
      <p className="text-center text-sm text-text-muted">
        Al een account?{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary">
          Inloggen
        </Link>
        {" · "}
        <Link href="/privacy" className="inline-flex min-h-11 items-center font-medium text-primary">
          Privacy
        </Link>
      </p>
    </form>
  );
}
