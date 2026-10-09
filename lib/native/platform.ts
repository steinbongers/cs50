/**
 * Herkent de iPhone-app (Capacitor-schil) vanuit de webapp. De schil laadt de live site,
 * dus dezelfde code draait ook gewoon in Safari: daar geeft alles hier `false`.
 *
 * `window.Capacitor` wordt door de schil vóór de eerste regel van de pagina ingevoegd.
 * Een plugin bestaat pas na een nieuwe build van de schil; tot die tijd tonen we de functie
 * niet, ook al staat de nieuwe webcode al live.
 */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  isPluginAvailable?: (name: string) => boolean;
}

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function isNativeApp(): boolean {
  try {
    return capacitor()?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/** Alleen in de app, en alleen als deze build van de schil de plugin al heeft. */
export function hasNativePlugin(name: string): boolean {
  try {
    return isNativeApp() && capacitor()?.isPluginAvailable?.(name) === true;
  } catch {
    return false;
  }
}

/** Voor useSyncExternalStore: de omgeving verandert niet terwijl de pagina open is. */
export function subscribeNever(): () => void {
  return () => {};
}
