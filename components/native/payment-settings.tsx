"use client";

import { BellRing, EyeOff, Wallet } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { setLockScreenDetails, setPaymentNotifications } from "@/app/(app)/instellingen/actions";
import { RowLabel, ROW_FOCUS } from "@/app/(app)/instellingen/rows";
import { ListRow } from "@/components/ui/list-group";
import { Switch } from "@/components/ui/switch";
import { linkThisDevice, nativePushAvailable } from "@/lib/native/device-link";
import { subscribeNever } from "@/lib/native/platform";
import { loadNativePush } from "@/lib/native/plugins";

/**
 * Meldingen met knoppen na elke betaling. Alleen in de iPhone-app; daarbuiten rendert dit niets.
 * - Aanzetten vraagt iOS om meldingen en koppelt dit toestel (apparaatsleutel in de Keychain).
 * - "Bedrag verbergen op vergrendelscherm" staat standaard aan (privacy by default).
 */
export function PaymentSettings({ enabled, lockScreenDetails }: { enabled: boolean; lockScreenDetails: boolean }) {
  const available = useSyncExternalStore(subscribeNever, nativePushAvailable, () => false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hide, setHide] = useState(!lockScreenDetails);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    loadNativePush()
      .then(({ plugin }) => plugin.status())
      .then((status) => {
        if (cancelled) return;
        setReady(status.linked && status.permission === "granted");
        setDenied(status.permission === "denied");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [available]);

  if (!available) return null;

  const on = enabled && ready;

  async function change(next: boolean) {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      if (!next) {
        await setPaymentNotifications(false);
        return;
      }
      const result = await linkThisDevice({ askPermission: true });
      if (!result.ok) {
        if (result.reason === "denied") setDenied(true);
        else setFailed(true);
        return;
      }
      setDenied(false);
      setReady(true);
      await setPaymentNotifications(true);
    } finally {
      setBusy(false);
    }
  }

  function changeHide(next: boolean) {
    setHide(next);
    startTransition(async () => {
      const result = await setLockScreenDetails(!next);
      if (!result.ok) setHide(!next);
    });
  }

  async function openSettings() {
    try {
      const { plugin } = await loadNativePush();
      await plugin.openSettings();
    } catch {
      // niets aan te doen
    }
  }

  const hint = denied
    ? "Meldingen staan uit op je iPhone. Tik om ze aan te zetten."
    : failed
      ? "Aanzetten lukte niet. Probeer het opnieuw."
      : undefined;

  return (
    <>
      <ListRow
        onClick={denied ? () => void openSettings() : undefined}
        icon={BellRing}
        iconClass="bg-cat-oranje-soft text-cat-oranje"
        label={<RowLabel label="Melding na elke betaling" hint={hint} />}
        trailing={
          denied ? undefined : (
            <Switch checked={on} onCheckedChange={(next) => void change(next)} disabled={busy} label="Melding na elke betaling" />
          )
        }
        className={denied ? ROW_FOCUS : undefined}
      />
      <ListRow
        icon={EyeOff}
        iconClass="bg-cat-grijs-soft text-cat-grijs"
        label="Verberg bedrag op vergrendelscherm"
        trailing={<Switch checked={hide} onCheckedChange={changeHide} label="Verberg bedrag op vergrendelscherm" />}
      />
      <ListRow
        href="/instellingen/apple-pay"
        icon={Wallet}
        iconClass="bg-cat-indigo-soft text-cat-indigo"
        label="Apple Pay instellen"
        className={ROW_FOCUS}
      />
    </>
  );
}
