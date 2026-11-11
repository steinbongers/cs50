"use client";

import { useEffect } from "react";
import { linkThisDevice, nativePushAvailable } from "@/lib/native/device-link";
import { loadNativePush } from "@/lib/native/plugins";

const SESSION_KEY = "device-refreshed";

/**
 * Ververst de apparaatsleutel elke keer dat de app opent (één keer per sessie), zodat een sleutel
 * nooit lang meegaat. Alleen als dit toestel al gekoppeld is: koppelen zelf doet de gebruiker in
 * Instellingen. Geeft ook het actuele APNs-token en de stand van "Voorvertoning tonen" door.
 */
export function DeviceRefresher() {
  useEffect(() => {
    if (!nativePushAvailable()) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // geen sessionStorage: dan gewoon elke keer
    }
    void loadNativePush()
      .then(({ plugin }) => plugin.status())
      .then((status) => (status.linked ? linkThisDevice() : null))
      .catch(() => {});
  }, []);
  return null;
}
