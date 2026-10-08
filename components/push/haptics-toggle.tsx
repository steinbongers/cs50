"use client";

import { Vibrate } from "lucide-react";
import { useSyncExternalStore } from "react";
import { ListRow } from "@/components/ui/list-group";
import { Switch } from "@/components/ui/switch";
import { hapticsEnabled, setHapticsEnabled } from "@/lib/haptics";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Trillen bij een keuze aan of uit. Standaard aan, bewaard op dit apparaat. */
export function HapticsToggle() {
  // Op de server staat trillen aan: dat is de standaard.
  const on = useSyncExternalStore(subscribe, hapticsEnabled, () => true);

  function change(next: boolean) {
    setHapticsEnabled(next);
    listeners.forEach((listener) => listener());
  }

  return (
    <ListRow
      icon={Vibrate}
      iconClass="bg-cat-paars-soft text-cat-paars"
      label="Trillen"
      trailing={<Switch checked={on} onCheckedChange={change} label="Trillen bij een keuze" />}
    />
  );
}
