"use client";

import { useEffect, useRef, useCallback } from "react";

const CONFIRM_MESSAGE =
  "You are in the middle of a test. Your progress will be submitted. Are you sure you want to leave?";

const UNLOAD_MESSAGE =
  "You are in the middle of a test. Refreshing will NOT submit your work — your draft may be lost. Are you sure?";

/**
 * Leave guard for test pages.
 *
 * Behaviour:
 *  • Reload / close tab     →  native browser "Leave site?" dialog (no auto-submit)
 *  • Client-side navigation →  window.confirm warning; if confirmed, calls
 *                               `onNavigateAway()` fire-and-forget, then navigates.
 *                               If cancelled, navigation is blocked.
 *
 * @param active          Enable the guard (pass `false` once submitted)
 * @param onNavigateAway  Async callback to run after the user confirms leaving.
 *                        Errors are swallowed — user is never blocked by network lag.
 */
export function useLeaveGuard(
  active: boolean,
  onNavigateAway: () => Promise<void> | void,
) {
  const activeRef = useRef(active);
  const onNavigateAwayRef = useRef(onNavigateAway);
  const overrideRef = useRef(false);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { onNavigateAwayRef.current = onNavigateAway; }, [onNavigateAway]);

  // 1 ── Browser unload (refresh / close tab) — warn only, no submit
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      e.returnValue = UNLOAD_MESSAGE;
      return UNLOAD_MESSAGE;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // 2 ── Client-side navigation — confirm → submit → navigate
  //
  // Monkey-patches history.pushState / replaceState, which Next.js App Router
  // calls internally for all soft navigations (Link, router.push, back/forward).
  useEffect(() => {
    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);

    function intercept(
      original: typeof history.pushState,
      ...args: Parameters<typeof history.pushState>
    ) {
      // Bypass: guard inactive or intentional programmatic override
      if (!activeRef.current || overrideRef.current) {
        overrideRef.current = false;
        return original(...args);
      }

      // eslint-disable-next-line no-alert
      const confirmed = window.confirm(CONFIRM_MESSAGE);
      if (!confirmed) return; // user cancelled — block navigation

      // User confirmed: submit fire-and-forget, then navigate immediately
      // Errors are swallowed so network lag never blocks the user
      void Promise.resolve()
        .then(() => onNavigateAwayRef.current())
        .catch(() => null)
        .finally(() => { activeRef.current = false; });

      original(...args);
    }

    history.pushState = (...args) => intercept(originalPush, ...args);
    history.replaceState = (...args) => intercept(originalReplace, ...args);

    return () => {
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
  }, []);

  /**
   * Bypass the guard for intentional programmatic navigation (e.g. after submit).
   * @example override(() => router.push("/results"))
   */
  const override = useCallback((navigate: () => void) => {
    overrideRef.current = true;
    navigate();
  }, []);

  return { override };
}