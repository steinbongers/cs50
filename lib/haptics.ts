/**
 * Haptiek: korte trillingen als bevestiging. Client-veilig: op de server en op toestellen
 * zonder `navigator.vibrate` (iOS Safari ondersteunt het niet) gebeurt er gewoon niets.
 *
 * De gebruiker kan haptiek uitzetten; dat staat in `localStorage.haptics = "off"`.
 *
 * Later, in de Capacitor-schil: vervang `vibrate` door `@capacitor/haptics`,
 * bijvoorbeeld `Haptics.impact({ style: ImpactStyle.Light })` voor `tap()` en
 * `Haptics.notification({ type: NotificationType.Success })` voor `success()`.
 * Daarmee werkt het dan ook op de iPhone.
 */

const STORAGE_KEY = "haptics";

export function hapticsEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    // Geen toegang tot localStorage (privévenster, geblokkeerd): standaard aan.
    return true;
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    if (on) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, "off");
  } catch {
    // Niet op te slaan; dan blijft de huidige stand gelden.
  }
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !hapticsEnabled()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Sommige browsers gooien bij vibrate zonder gebruikersactie; negeren.
  }
}

/** Korte tik bij een keuze (8 ms). */
export function tap(): void {
  vibrate(8);
}

/** Succes, bijvoorbeeld een lege stapel. */
export function success(): void {
  vibrate([10, 40, 10, 40, 16]);
}

/** Zachte waarschuwing, bijvoorbeeld over je budget. */
export function warning(): void {
  vibrate([6, 30, 6]);
}
