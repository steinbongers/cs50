"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { sendMagicLink, signInWithPassword, type AuthFormState } from "@/app/auth/actions";
import { AppleButton } from "@/components/auth/apple-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input } from "@/components/ui/input";
import { IconMail } from "@/components/ui/icons";

const initialState: AuthFormState = {};

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction] = useActionState(signInWithPassword, initialState);
  const [magicState, magicAction] = useActionState(sendMagicLink, initialState);

  if (magicState.success === "magic-link-sent") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card bg-surface p-6 text-center shadow-card">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <IconMail />
        </span>
        <h2 className="text-lg font-semibold">Check je mail</h2>
        <p className="text-sm text-text-muted">
          We hebben een inloglink gestuurd naar <strong className="text-text">{magicState.email}</strong>.
          Open de link op dit apparaat om in te loggen.
        </p>
      </div>
    );
  }

  if (mode === "magic") {
    return (
      <form action={magicAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <Field label="E-mailadres" htmlFor="email" error={magicState.error}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            autoFocus
            defaultValue={magicState.email ?? pwState.email}
            aria-invalid={magicState.error ? true : undefined}
          />
        </Field>
        <SubmitButton size="lg" fullWidth>
          Stuur me een inloglink
        </SubmitButton>
        <button
          type="button"
          onClick={() => setMode("password")}
          className="min-h-11 text-sm font-medium text-primary"
        >
          Liever inloggen met wachtwoord
        </button>
      </form>
    );
  }

  return (
    <form action={pwAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="E-mailadres" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={pwState.email ?? magicState.email}
          aria-invalid={pwState.error ? true : undefined}
        />
      </Field>
      <Field label="Wachtwoord" htmlFor="password" error={pwState.error}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={pwState.error ? true : undefined}
        />
      </Field>
      <SubmitButton size="lg" fullWidth>
        Inloggen
      </SubmitButton>
      <AppleButton next={next} label="Inloggen met Apple" />
      <button
        type="button"
        onClick={() => setMode("magic")}
        className="min-h-11 text-sm font-medium text-primary"
      >
        Of stuur me een inloglink
      </button>
      <p className="text-center text-sm text-text-muted">
        Nog geen account?{" "}
        <Link href="/registreren" className="font-medium text-primary">
          Registreren
        </Link>
      </p>
    </form>
  );
}
