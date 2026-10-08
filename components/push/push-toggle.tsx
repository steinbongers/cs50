"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { disableNotifications, removePushSubscription, savePushSubscription } from "@/app/(app)/instellingen/actions";
import { cn } from "@/lib/utils";

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

const supportListeners = new Set<() => void>();
function subscribeSupport(listener: () => void) {
  supportListeners.add(listener);
  return () => supportListeners.delete(listener);
}

/** Meldingen aan of uit: registreert de service worker en een push-abonnement voor dit apparaat. */
export function PushToggle({ enabled, vapidPublicKey }: { enabled: boolean; vapidPublicKey: string | null }) {
  const support = useSyncExternalStore(subscribeSupport, detectSupport, () => "unknown" as Support);
  const [on, setOn] = useState(enabled);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const refreshSupport = () => supportListeners.forEach((listener) => listener());

  async function enable() {
    if (!vapidPublicKey) {
      setMessage("Meldingen zijn op deze server nog niet ingesteld.");
      return;
    }
    setMessage(null);
    const registration = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      refreshSupport();
      setMessage("Je hebt geen toestemming gegeven. Dat kun je in je browser-instellingen aanpassen.");
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
      setMessage("Aan. Elke avond om 20:00 hoor je het als er kaartjes liggen.");
    });
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
        setMessage("Uit. Je hoort niets meer van ons.");
      }
    });
  }

  const unavailable = support === "no-sw" || support === "ios-not-installed" || support === "denied";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={isPending || (unavailable && !on)}
        onClick={() => (on ? disable() : enable())}
        className="flex min-h-12 w-full items-center justify-between gap-3 text-left disabled:opacity-60"
      >
        <span>
          <span className="block font-medium">Meldingen</span>
          <span className="block text-sm text-text-muted">Elke avond om 20:00 als er kaartjes liggen</span>
        </span>
        <span aria-hidden className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150", on ? "bg-primary" : "bg-border")}>
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-150", on ? "translate-x-[1.125rem]" : "translate-x-0.5")} />
        </span>
      </button>
      {support === "ios-not-installed" && (
        <p className="text-xs text-text-muted">Op iPhone werkt dit alleen als je de app op je beginscherm zet (Delen → Zet op beginscherm).</p>
      )}
      {support === "no-sw" && <p className="text-xs text-text-muted">Deze browser ondersteunt geen meldingen.</p>}
      {support === "denied" && <p className="text-xs text-text-muted">Meldingen zijn geblokkeerd in je browser-instellingen.</p>}
      {message && <p className="text-xs text-text-muted">{message}</p>}
    </div>
  );
}
