"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Bell } from "lucide-react";
import {
  disableNotifications,
  logPushPermission,
  removePushSubscription,
  savePushSubscription,
} from "@/app/(app)/instellingen/actions";
import { ListRow } from "@/components/ui/list-group";
import { Switch } from "@/components/ui/switch";

type Support = "unknown" | "ok" | "no-sw" | "ios-not-installed" | "denied";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function detectSupport(): Support {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIos && !standalone ? "ios-not-installed" : "no-sw";
  }
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

const NOT_CONFIGURED = "Meldingen werken nog niet. We zijn ermee bezig.";
const DENIED = "Meldingen staan uit in je telefooninstellingen.";

const supportListeners = new Set<() => void>();
function subscribeSupport(listener: () => void) {
  supportListeners.add(listener);
  return () => supportListeners.delete(listener);
}

/** Avondmelding aan of uit: registreert de service worker en een push-abonnement voor dit apparaat. */
export function PushToggle({ enabled, vapidPublicKey }: { enabled: boolean; vapidPublicKey: string | null }) {
  const support = useSyncExternalStore(subscribeSupport, detectSupport, () => "unknown" as Support);
  const [on, setOn] = useState(enabled);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();
  const refreshSupport = () => supportListeners.forEach((listener) => listener());

  async function enable() {
    if (!vapidPublicKey) {
      setMessage(NOT_CONFIGURED);
      return;
    }
    setMessage(null);
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      void logPushPermission(permission);
      if (permission !== "granted") {
        refreshSupport();
        if (permission === "denied") setMessage(DENIED);
        return;
      }
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));
      startTransition(async () => {
        const result = await savePushSubscription(subscription.toJSON());
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        setOn(true);
        setMessage("Aan. Liggen er kaartjes, dan hoor je het om 20:00.");
      });
    } catch {
      setMessage("Aanzetten lukte niet. Probeer het zo nog eens.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setMessage(null);
    let endpoint: string | null = null;
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      endpoint = subscription?.endpoint ?? null;
      await subscription?.unsubscribe();
    } catch {
      // geen abonnement op dit apparaat
    }
    startTransition(async () => {
      const result = endpoint ? await removePushSubscription(endpoint) : await disableNotifications();
      if (result.ok) {
        setOn(false);
        setMessage("Uit. Je hoort 's avonds niets meer van ons.");
      }
    });
  }

  const unavailable = !vapidPublicKey || support === "no-sw" || support === "ios-not-installed" || support === "denied";

  const note = !vapidPublicKey
    ? NOT_CONFIGURED
    : support === "denied"
      ? DENIED
      : support === "ios-not-installed"
        ? "Op de iPhone werkt dit als je de app op je beginscherm zet. Tik op Delen en kies Zet op beginscherm."
        : support === "no-sw"
          ? "Deze browser kan geen meldingen tonen."
          : null;
  const shown = message ?? (on ? null : note);

  return (
    <>
      <ListRow
        icon={Bell}
        iconClass="bg-cat-rood-soft text-cat-rood"
        label="Avondmelding"
        value="20:00"
        trailing={
          <Switch
            checked={on}
            onCheckedChange={(next) => (next ? enable() : disable())}
            label="Avondmelding om 20:00"
            disabled={busy || isPending || (unavailable && !on)}
          />
        }
      />
      {shown && (
        <p className="px-4 pt-1 pb-3 text-[13px] leading-[18px] text-text-muted" role="status">
          {shown}
        </p>
      )}
    </>
  );
}
