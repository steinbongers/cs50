"use client";

import { useEffect, useRef } from "react";
import { markMonthReviewSeen } from "@/app/(app)/overzicht/actions";

/** Meldt één keer dat de afgelopen maand is bekeken (pilotmeting "Jouw maand"). */
export function MonthSeen({ periodStartISO }: { periodStartISO: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void markMonthReviewSeen(periodStartISO);
  }, [periodStartISO]);
  return null;
}
