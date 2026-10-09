/**
 * Face ID-slot: per toestel aan of uit (localStorage), alleen in de iPhone-app.
 *
 * De stand van het slot staat als attribuut op <html>, zodat het inline script uit
 * `appLockScript` het scherm al vóór de eerste paint kan afdekken:
 * - `data-app-lock="locked"`: ontgrendelen nodig (Face ID, met toegangscode als terugval)
 * - `data-app-lock="shield"`: tijdelijk afgedekt terwijl de app op de achtergrond staat
 * - geen attribuut: open
 */

import { BIOMETRIC_LOCK } from "./plugins";

export const APP_LOCK_STORAGE_KEY = "app_lock";
export const APP_LOCK_ATTRIBUTE = "data-app-lock";

/** Zo lang mag de app op de achtergrond staan voordat hij weer op slot gaat. */
export const LOCK_AFTER_MS = 60 * 1000;

export type LockState = "locked" | "shield" | null;

/**
 * Wat er gebeurt als de app weer zichtbaar wordt.
 * Een afdekking van korter dan een minuut verdwijnt; langer weg betekent opnieuw ontgrendelen.
 * Een slot dat al op ontgrendelen wacht, blijft staan.
 */
export function stateOnReturn(current: LockState, awayMs: number): LockState {
  if (current === "shield") return awayMs > LOCK_AFTER_MS ? "locked" : null;
  return current;
}

/** Bij naar de achtergrond gaan: afdekken (ook voor het schermpje in de appkiezer), nooit een slot opheffen. */
export function stateOnHide(current: LockState, enabled: boolean): LockState {
  if (current) return current;
  return enabled ? "shield" : null;
}

export function appLockEnabled(): boolean {
  try {
    return window.localStorage.getItem(APP_LOCK_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setAppLockEnabled(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(APP_LOCK_STORAGE_KEY, "on");
    else window.localStorage.removeItem(APP_LOCK_STORAGE_KEY);
  } catch {
    // Niet op te slaan; dan blijft de huidige stand gelden.
  }
}

const listeners = new Set<() => void>();

export function subscribeLockState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readLockState(): LockState {
  if (typeof document === "undefined") return null;
  const value = document.documentElement.getAttribute(APP_LOCK_ATTRIBUTE);
  return value === "locked" || value === "shield" ? value : null;
}

export function writeLockState(state: LockState): void {
  if (state) document.documentElement.setAttribute(APP_LOCK_ATTRIBUTE, state);
  else document.documentElement.removeAttribute(APP_LOCK_ATTRIBUTE);
  if (state !== "locked") unlockFailed = false;
  listeners.forEach((listener) => listener());
}

let unlockFailed = false;

/** Mislukte de laatste poging tot ontgrendelen (geannuleerd of niet herkend)? */
export function readUnlockFailed(): boolean {
  return unlockFailed;
}

export function writeUnlockFailed(failed: boolean): void {
  if (unlockFailed === failed) return;
  unlockFailed = failed;
  listeners.forEach((listener) => listener());
}

/**
 * Inline script vóór de app-inhoud: zet het slot meteen bij het openen, zodat er geen
 * flits van je bedragen is voordat React geladen is. Alleen in de app met de plugin.
 */
export const appLockScript = `(function(){try{var c=window.Capacitor;if(c&&c.isNativePlatform&&c.isNativePlatform()&&c.isPluginAvailable&&c.isPluginAvailable(${JSON.stringify(BIOMETRIC_LOCK)})&&localStorage.getItem(${JSON.stringify(APP_LOCK_STORAGE_KEY)})==="on"){document.documentElement.setAttribute(${JSON.stringify(APP_LOCK_ATTRIBUTE)},"locked")}}catch(e){}})();`;
