/**
 * Routekeuze voor het startpunt `/` (besluit Stein, 8 oktober 2026):
 * liggen er kaartjes, dan opent de app op Swipen; is de stapel leeg, dan op Overzicht.
 * Puur, zodat het zonder server te testen is.
 */
export type StartRoute = "/welkom" | "/onboarding" | "/swipen" | "/overzicht";

export interface StartRouteInput {
  signedIn: boolean;
  onboardingDone: boolean;
  /** Aantal open kaartjes; `null` als de telling mislukte. */
  openCount: number | null;
}

export function startRoute({ signedIn, onboardingDone, openCount }: StartRouteInput): StartRoute {
  if (!signedIn) return "/welkom";
  if (!onboardingDone) return "/onboarding";
  if (typeof openCount === "number" && Number.isFinite(openCount) && openCount > 0) return "/swipen";
  return "/overzicht";
}

/** Tabblad waarop de app geopend is, voor de meting `app_open`. */
export type StartTab = "swipen" | "overzicht" | "anders";

export function startTabForPath(pathname: string): StartTab {
  const matches = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  if (matches("/swipen")) return "swipen";
  if (matches("/overzicht")) return "overzicht";
  return "anders";
}
