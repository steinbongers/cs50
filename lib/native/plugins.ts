/**
 * Eigen native plugins uit de iPhone-app (ios/App/App/*Plugin.swift).
 *
 * De schil laadt de live site via `server.url`; Capacitor voegt daar de native bridge aan toe,
 * dus `registerPlugin` uit @capacitor/core werkt ook vanaf die externe URL. We laden
 * @capacitor/core pas als een plugin echt nodig is, zodat de webversie hem niet meedraagt.
 */

export type Biometry = "faceId" | "touchId" | "none";

export interface BiometricLockPlugin {
  /** Kan dit toestel ontgrendelen (Face ID, Touch ID of toegangscode)? */
  checkAvailability(): Promise<{ available: boolean; biometry: Biometry }>;
  /** Vraagt Face ID of Touch ID, met de toegangscode als terugval. Faalt bij annuleren. */
  authenticate(options: { reason: string }): Promise<void>;
}

export interface WidgetBridgePlugin {
  /** Zet de widgetsleutel in de gedeelde App Group en ververst de widgets. */
  setToken(options: { token: string }): Promise<void>;
  /** Haalt de sleutel weg; de widget toont dan weer "Open de app om de widget te koppelen". */
  clearToken(): Promise<void>;
  status(): Promise<{ linked: boolean }>;
}

export const BIOMETRIC_LOCK = "BiometricLock";
export const WIDGET_BRIDGE = "WidgetBridge";

const registered = new Map<string, unknown>();

/**
 * Geeft de plugin terug in een object: een Capacitor-plugin is een Proxy die op elke
 * eigenschap een functie teruggeeft, ook op `then`. Direct uit een Promise teruggeven
 * zou hem als "thenable" laten aanroepen en nooit afronden.
 */
async function load<T>(name: string): Promise<{ plugin: T }> {
  let plugin = registered.get(name) as T | undefined;
  if (!plugin) {
    const { registerPlugin } = await import("@capacitor/core");
    plugin = (registered.get(name) as T | undefined) ?? registerPlugin<T & object>(name);
    registered.set(name, plugin);
  }
  return { plugin };
}

export function loadBiometricLock(): Promise<{ plugin: BiometricLockPlugin }> {
  return load<BiometricLockPlugin>(BIOMETRIC_LOCK);
}

export function loadWidgetBridge(): Promise<{ plugin: WidgetBridgePlugin }> {
  return load<WidgetBridgePlugin>(WIDGET_BRIDGE);
}
