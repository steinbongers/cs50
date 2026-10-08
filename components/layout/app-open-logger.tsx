"use client";

import { useEffect } from "react";
import { logAppOpen } from "@/app/(app)/actions";
import { startTabForPath } from "@/lib/start-route";

/** Na zo lang verborgen telt terugkomen als een nieuwe keer openen. */
const AWAY_MS = 30 * 60 * 1000;
const LAST_OPEN_KEY = "app_open_at";

function readLastOpen(): number {
  try {
    return Number(sessionStorage.getItem(LAST_OPEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastOpen(at: number) {
  try {
    sessionStorage.setItem(LAST_OPEN_KEY, String(at));
  } catch {
    // zonder sessionStorage meten we gewoon bij elke mount
  }
}

/** Haalt `ref` en `tag` uit de adresbalk, zodat verversen of delen niet opnieuw als push telt. */
function stripRefFromUrl(url: URL) {
  if (!url.searchParams.has("ref") && !url.searchParams.has("tag")) return;
  url.searchParams.delete("ref");
  url.searchParams.delete("tag");
  const search = url.searchParams.toString();
  window.history.replaceState(window.history.state, "", `${url.pathname}${search ? `?${search}` : ""}${url.hash}`);
}

/**
 * Meet `app_open`: bij de eerste mount (ook na een pushmelding) en bij terugkomen
 * nadat de app langer dan 30 minuten verborgen was. Rendert niets.
 */
export function AppOpenLogger() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromPush = url.searchParams.get("ref") === "push";
    const tag = fromPush ? url.searchParams.get("tag") ?? undefined : undefined;

    // Verversen binnen 30 minuten telt niet als nieuwe keer openen; een tik op een melding wel.
    const now = Date.now();
    if (fromPush || now - readLastOpen() > AWAY_MS) {
      writeLastOpen(now);
      void logAppOpen({
        source: fromPush ? "push" : "direct",
        tag,
        startTab: startTabForPath(url.pathname),
      }).catch(() => {});
    }
    stripRefFromUrl(url);

    let hiddenAt: number | null = document.visibilityState === "hidden" ? now : null;
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      const awayFor = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      if (awayFor <= AWAY_MS) return;
      writeLastOpen(Date.now());
      void logAppOpen({ source: "direct", startTab: startTabForPath(window.location.pathname) }).catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return null;
}
