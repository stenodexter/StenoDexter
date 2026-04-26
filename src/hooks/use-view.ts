"use client";

import { useState } from "react";

export type ViewMode = "grid" | "list";

const COOKIE_PREFIX = "content_view";
const MAX_AGE = 60 * 60 * 24 * 30;

function cookieKey(namespace: string) {
  return `${COOKIE_PREFIX}_${namespace}`;
}

function readCookie(key: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match?.[1] ?? null;
}

function writeCookie(key: string, value: string) {
  document.cookie = `${key}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

/**
 * Persists the user's preferred grid/list view to a cookie.
 *
 * @param namespace - unique key for this view (e.g. "tests", "users", "attempts")
 * @param defaultView - fallback when no cookie exists (default: "grid")
 *
 * @example
 * const [view, setView] = useView("tests");
 * const [view, setView] = useView("users", "list");
 */
export function useView(namespace: string, defaultView: ViewMode = "grid") {
  const key = cookieKey(namespace);

  const [view, setViewState] = useState<ViewMode>(() => {
    const stored = readCookie(key);
    return stored === "grid" || stored === "list" ? stored : defaultView;
  });

  const setView = (next: ViewMode) => {
    writeCookie(key, next);
    setViewState(next);
  };

  return [view, setView] as const;
}
