"use client";

import { useEffect, useRef } from "react";
import { logCategoryDetailViewed } from "../actions";

/**
 * Meting: het potje-detail is bekeken, één keer per potje per mount. Server actions op dit
 * scherm doen refresh(); als dit in de server component zat, telde elke actie als bezoek.
 * Alleen dat het bekeken is; geen bedragen, namen of id's.
 */
export function DetailViewed({ categoryId }: { categoryId: string }) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === categoryId) return;
    last.current = categoryId;
    void logCategoryDetailViewed();
  }, [categoryId]);
  return null;
}
