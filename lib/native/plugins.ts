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

export type NativePermission = "granted" | "denied" | "prompt";
export type NativePreviews = "always" | "when_unlocked" | "never";

export interface NativePushPlugin {
  /** Mag de app meldingen sturen, is dit toestel gekoppeld, en kan Opdrachten de Wallet-automatisering (iOS 17)? */
  status(): Promise<{ permission: NativePermission; linked: boolean; shortcutsAvailable: boolean }>;
  /** Toont de iOS-vraag om meldingen (één keer; daarna beslist iOS zelf). */
  requestPermission(): Promise<{ granted: boolean }>;
  /** Wat de server nodig heeft om dit toestel te koppelen. Zonder toestemming geen apnsToken. */
  registration(): Promise<{
    installationId: string;
    previews: NativePreviews;
    apnsEnv: "production" | "sandbox";
    apnsToken?: string;
  }>;
  /** Bewaart de apparaatsleutel in de Keychain (gedeeld met de widget) en ververst de widgets. */
  setDeviceKey(options: { key: string }): Promise<void>;
  /** Haalt de sleutel weg (uitloggen, ontkoppelen). */
  clear(): Promise<{ installationId: string }>;
  /** Opent de iOS-instellingen van deze app. */
  openSettings(): Promise<void>;
}

export const BIOMETRIC_LOCK = "BiometricLock";
export const NATIVE_PUSH = "NativePush";
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

export function loadNativePush(): Promise<{ plugin: NativePushPlugin }> {
  return load<NativePushPlugin>(NATIVE_PUSH);
}

export function loadWidgetBridge(): Promise<{ plugin: WidgetBridgePlugin }> {
  return load<WidgetBridgePlugin>(WIDGET_BRIDGE);
}
