import { appLockScript } from "@/lib/native/app-lock";
import { AppLock } from "./app-lock";

/** Zichtbaarheid van het slot hangt alleen aan het attribuut op <html>, niet aan React. */
const appLockStyle =
  "#app-lock{display:none}html[data-app-lock] #app-lock{display:flex}html[data-app-lock] body{overflow:hidden}";

/**
 * Face ID-slot voor de iPhone-app. Zet hem vóór de app-inhoud in de layout: het script
 * dekt het scherm al af terwijl de rest van de pagina nog binnenkomt.
 */
export function AppLockGate() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: appLockStyle }} />
      <script dangerouslySetInnerHTML={{ __html: appLockScript }} />
      <AppLock />
    </>
  );
}
