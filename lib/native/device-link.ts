import { linkDevice, unlinkDevice } from "./device-actions";
import { hasNativePlugin } from "./platform";
import { loadNativePush, NATIVE_PUSH } from "./plugins";

/**
 * Koppelt deze iPhone aan het account (of ververst de koppeling): de server maakt een nieuwe
 * apparaatsleutel, de app bewaart hem in de Keychain. Daarmee werken de widget, de Apple Pay-actie
 * en de knoppen in meldingen. Alleen in de iPhone-app; in Safari gebeurt er niets.
 */

export function nativePushAvailable(): boolean {
  return hasNativePlugin(NATIVE_PUSH);
}

type DeviceLinkResult = { ok: true; push: boolean } | { ok: false; reason: "unavailable" | "denied" | "failed" };

export async function linkThisDevice(options: { askPermission?: boolean } = {}): Promise<DeviceLinkResult> {
  if (!nativePushAvailable()) return { ok: false, reason: "unavailable" };
  try {
    const { plugin } = await loadNativePush();
    if (options.askPermission) {
      const status = await plugin.status();
      if (status.permission === "denied") return { ok: false, reason: "denied" };
      if (status.permission === "prompt") {
        const { granted } = await plugin.requestPermission();
        if (!granted) return { ok: false, reason: "denied" };
      }
    }
    const registration = await plugin.registration();
    const result = await linkDevice({
      installationId: registration.installationId,
      apnsToken: registration.apnsToken ?? null,
      apnsEnv: registration.apnsEnv,
      previews: registration.previews,
    });
    if (!result.ok) return { ok: false, reason: "failed" };
    await plugin.setDeviceKey({ key: result.key });
    return { ok: true, push: Boolean(registration.apnsToken) };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/** Bij uitloggen: sleutel van de iPhone af en de koppeling op de server weg. Faalt stil. */
export async function unlinkThisDevice(): Promise<void> {
  if (!nativePushAvailable()) return;
  try {
    const { plugin } = await loadNativePush();
    const { installationId } = await plugin.clear();
    await unlinkDevice(installationId);
  } catch {
    // dan vervalt de sleutel vanzelf na 30 dagen
  }
}
