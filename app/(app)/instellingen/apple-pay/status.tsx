"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { linkThisDevice, nativePushAvailable } from "@/lib/native/device-link";
import { loadNativePush } from "@/lib/native/plugins";

type State = "loading" | "web" | "old-ios" | "unlinked" | "denied" | "ready";

/** Vertelt of deze iPhone klaar is voor de automatisering, en koppelt hem zo nodig met één tik. */
export function ApplePayStatus() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  async function check() {
    if (!nativePushAvailable()) return setState("web");
    try {
      const { plugin } = await loadNativePush();
      const status = await plugin.status();
      if (!status.shortcutsAvailable) setState("old-ios");
      else if (status.permission === "denied") setState("denied");
      else if (!status.linked || status.permission !== "granted") setState("unlinked");
      else setState("ready");
    } catch {
      setState("web");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- eenmalig de stand van het toestel ophalen
    void check();
  }, []);

  if (state === "loading") return null;

  const text: Record<Exclude<State, "loading">, string> = {
    web: "Dit kan alleen in de iPhone-app.",
    "old-ios": "Hiervoor heeft je iPhone iOS 17 of nieuwer nodig.",
    unlinked: "Zet eerst meldingen aan.",
    denied: "Meldingen staan uit voor deze app. Zet ze aan in de instellingen van je iPhone.",
    ready: "Deze iPhone is klaar.",
  };

  async function act() {
    setBusy(true);
    try {
      if (state === "denied") {
        const { plugin } = await loadNativePush();
        await plugin.openSettings();
      } else {
        await linkThisDevice({ askPermission: true });
      }
      await check();
    } catch {
      // de tekst blijft staan
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-[15px] leading-[22px] text-text">{text[state]}</p>
      {(state === "unlinked" || state === "denied") && (
        <Button type="button" onClick={() => void act()} disabled={busy}>
          {state === "denied" ? "Open instellingen" : "Meldingen aanzetten"}
        </Button>
      )}
    </Card>
  );
}
