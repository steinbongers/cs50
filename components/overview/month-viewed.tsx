"use client";

import { useEffect, useRef } from "react";
import { logMonthViewed } from "@/app/(app)/overzicht/actions";

/** Meting: één keer per bekeken maand (0 = deze maand). Alleen het aantal maanden terug. */
export function MonthViewed({ monthsBack }: { monthsBack: number }) {
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (last.current === monthsBack) return;
    last.current = monthsBack;
    void logMonthViewed(monthsBack);
  }, [monthsBack]);
  return null;
}
