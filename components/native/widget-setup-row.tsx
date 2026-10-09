"use client";

import { LayoutDashboard } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { RowLabel, ROW_FOCUS } from "@/app/(app)/instellingen/rows";
import { ListRow } from "@/components/ui/list-group";
import { createWidgetToken } from "@/lib/native/widget-actions";
import { hasNativePlugin, subscribeNever } from "@/lib/native/platform";
import { loadWidgetBridge, WIDGET_BRIDGE } from "@/lib/native/plugins";

function isAvailable() {
  return hasNativePlugin(WIDGET_BRIDGE);
}

/**
 * Koppelt de widget op het beginscherm: maakt een widgetsleutel aan en geeft die aan de
 * iPhone-app, die hem in de gedeelde App Group zet. Opnieuw tikken maakt een nieuwe sleutel.
 * Alleen in de iPhone-app; daarbuiten rendert dit niets.
 */
export function WidgetSetupRow() {
  const available = useSyncExternalStore(subscribeNever, isAvailable, () => false);
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    loadWidgetBridge()
      .then(({ plugin }) => plugin.status())
      .then((status) => {
        if (!cancelled) setLinked(status.linked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [available]);

  if (!available) return null;

  async function link() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const result = await createWidgetToken();
      if (!result.ok) {
        setFailed(true);
        return;
      }
      const { plugin } = await loadWidgetBridge();
      await plugin.setToken({ token: result.token });
      setLinked(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  // De hint is één regel (afgekapt): kort houden.
  const hint = failed
    ? "Koppelen lukte niet. Probeer het opnieuw."
    : linked
      ? "Voeg hem toe via je beginscherm"
      : "Kaartjes en vrij geld op je beginscherm";

  return (
    <ListRow
      onClick={() => void link()}
      icon={LayoutDashboard}
      iconClass="bg-cat-blauw-soft text-cat-blauw"
      label={<RowLabel label="Widget instellen" hint={hint} />}
      value={busy ? "Bezig" : linked ? "Gekoppeld" : undefined}
      className={ROW_FOCUS}
    />
  );
}
