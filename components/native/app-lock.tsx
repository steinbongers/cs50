"use client";

import { Lock } from "lucide-react";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/app";
import {
  appLockEnabled,
  readLockState,
  readUnlockFailed,
  stateOnHide,
  stateOnReturn,
  subscribeLockState,
  writeLockState,
  writeUnlockFailed,
} from "@/lib/native/app-lock";
import { hasNativePlugin } from "@/lib/native/platform";
import { BIOMETRIC_LOCK, loadBiometricLock } from "@/lib/native/plugins";

const REASON = "Ontgrendel om je geldzaken te zien";

/**
 * Schermvullend slot over de app (Face ID-slot). Staat altijd in de DOM; of hij zichtbaar is,
 * bepaalt het attribuut op <html> (zie lib/native/app-lock.ts en AppLockGate), zodat hij ook
 * vóór het laden van React al afdekt. Buiten de iPhone-app gebeurt hier niets.
 */
export function AppLock() {
  const state = useSyncExternalStore(subscribeLockState, readLockState, () => null);
  const failed = useSyncExternalStore(subscribeLockState, readUnlockFailed, () => false);
  const authenticating = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const { plugin } = await loadBiometricLock();
      writeUnlockFailed(false);
      const { available } = await plugin.checkAvailability();
      // Zonder Face ID én zonder toegangscode valt er niets te ontgrendelen: niet buitensluiten.
      if (available) await plugin.authenticate({ reason: REASON });
      writeLockState(null);
    } catch {
      writeUnlockFailed(true);
    } finally {
      authenticating.current = false;
    }
  }, []);

  useEffect(() => {
    if (!hasNativePlugin(BIOMETRIC_LOCK)) {
      if (readLockState()) writeLockState(null);
      return;
    }
    if (readLockState() === "locked") void unlock();

    let hiddenAt: number | null = null;
    function onVisibilityChange() {
      const current = readLockState();
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        const next = stateOnHide(current, appLockEnabled());
        if (next !== current) writeLockState(next);
        return;
      }
      const awayFor = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      const next = stateOnReturn(current, awayFor);
      if (next !== current) writeLockState(next);
      if (next === "locked") void unlock();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [unlock]);

  const locked = state === "locked";

  return (
    <div
      id="app-lock"
      role="dialog"
      aria-modal="true"
      aria-label={`${APP_NAME} is vergrendeld`}
      aria-hidden={state ? undefined : true}
      className="fixed inset-0 z-[100] flex-col items-center justify-center gap-5 bg-bg px-8 text-center"
    >
      <span aria-hidden className="flex size-16 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
        <Lock size={30} strokeWidth={2} />
      </span>
      {/* Tijdens het afdekken op de achtergrond alleen het slotje; de rest pas als ontgrendelen nodig is. */}
      <div className={locked ? "flex flex-col items-center gap-5" : "invisible flex flex-col items-center gap-5"}>
        <div className="flex flex-col gap-1">
          <p className="text-[17px] leading-[22px] font-semibold text-text">{APP_NAME} is vergrendeld</p>
          <p className="text-[15px] leading-5 text-text-muted">
            {failed ? "Niet ontgrendeld. Probeer het opnieuw." : "Ontgrendel met Face ID of je toegangscode."}
          </p>
        </div>
        <Button onClick={() => void unlock()} tabIndex={locked ? undefined : -1}>
          Ontgrendel
        </Button>
      </div>
    </div>
  );
}
