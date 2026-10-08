"use client";

import { useEffect } from "react";
import { logAppOpen } from "@/app/(app)/actions";

/** Meet 'app_open' één keer per browsersessie. Rendert niets. */
export function AppOpenLogger() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("app_open_logged")) return;
      sessionStorage.setItem("app_open_logged", "1");
    } catch {
      // zonder sessionStorage loggen we gewoon elke keer
    }
    void logAppOpen();
  }, []);
  return null;
}
