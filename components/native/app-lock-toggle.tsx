"use client";

import { ScanFace } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { RowLabel } from "@/app/(app)/instellingen/rows";
import { ListRow } from "@/components/ui/list-group";
import { Switch } from "@/components/ui/switch";
import { appLockEnabled, setAppLockEnabled } from "@/lib/native/app-lock";
import { hasNativePlugin, subscribeNever } from "@/lib/native/platform";
import { BIOMETRIC_LOCK, loadBiometricLock } from "@/lib/native/plugins";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function isAvailable() {
  return hasNativePlugin(BIOMETRIC_LOCK);
}

/**
 * Face ID-slot aan of uit, per toestel. Alleen in de iPhone-app; daarbuiten rendert dit niets.
 * Aanzetten vraagt meteen één keer Face ID, zodat je zeker weet dat ontgrendelen werkt.
 */
export function AppLockToggle() {
  const available = useSyncExternalStore(subscribeNever, isAvailable, () => false);
  const on = useSyncExternalStore(subscribe, appLockEnabled, () => false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!available) return null;

  async function change(next: boolean) {
    if (!next) {
      setAppLockEnabled(false);
      setNote(null);
      listeners.forEach((listener) => listener());
      return;
    }
    setBusy(true);
    try {
      const { plugin } = await loadBiometricLock();
      const { available: canUnlock } = await plugin.checkAvailability();
      if (!canUnlock) {
        setNote("Zet eerst een toegangscode aan op je iPhone");
        return;
      }
      await plugin.authenticate({ reason: "Zet het Face ID-slot aan" });
      setAppLockEnabled(true);
      setNote(null);
      listeners.forEach((listener) => listener());
    } catch {
      // Geannuleerd of niet herkend: het slot blijft uit.
    } finally {
      setBusy(false);
    }
  }

  return (
    <ListRow
      icon={ScanFace}
      iconClass="bg-cat-groen-soft text-cat-groen"
      label={<RowLabel label="Face ID-slot" hint={note ?? "Vraagt Face ID bij het openen"} />}
      trailing={<Switch checked={on} onCheckedChange={(next) => void change(next)} disabled={busy} label="Face ID-slot" />}
    />
  );
}
