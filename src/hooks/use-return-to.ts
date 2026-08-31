"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  RETURN_TO_PARAM,
  buildReturnTo,
  sanitizeReturnTo,
} from "~/lib/return-to";

/**
 * Where "back" should go from this page: the `from` param when the user
 * drilled in from a filtered list, otherwise `fallback`.
 */
export function useReturnTo(fallback: string): string {
  const searchParams = useSearchParams();
  return sanitizeReturnTo(searchParams.get(RETURN_TO_PARAM)) ?? fallback;
}

/**
 * The current list URL, to hand to drill-in links via `withReturnTo`.
 */
export function useCurrentReturnTo(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return buildReturnTo(pathname, searchParams);
}
