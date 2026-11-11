"use client";

import { useState } from "react";
import { signOut } from "@/app/auth/actions";
import { unlinkThisDevice } from "@/lib/native/device-link";
import { cn } from "@/lib/utils";

/**
 * Uitloggen. In de iPhone-app gaat eerst de apparaatsleutel van het toestel en van de server af,
 * zodat de widget en de knoppen in meldingen na uitloggen niets meer kunnen.
 */
export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await unlinkThisDevice();
        await signOut();
      }}
      className={cn(className, busy && "opacity-60")}
    >
      Uitloggen
    </button>
  );
}
