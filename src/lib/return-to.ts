/**
 * "Return to" navigation.
 *
 * List pages keep their state in the URL (`type`, `status`, `sort`, `page`,
 * `q`), so drilling into a test and then hitting Back / deleting / saving must
 * land the user back on the *filtered* list they came from — not on the
 * unfiltered "All tests" page.
 *
 * Drill-in links carry the originating list URL in a `from` param; the
 * destination reads it with `useReturnTo(fallback)`.
 */

export const RETURN_TO_PARAM = "from";

/**
 * Accept only same-origin absolute paths, so `from` can never be turned into
 * an off-site redirect.
 */
export function sanitizeReturnTo(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  // `//evil.com` and `/\evil.com` are protocol-relative — both are off-site.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

/**
 * The current location as a `from` value. Any existing `from` is dropped so
 * the params never nest into each other.
 */
export function buildReturnTo(
  pathname: string,
  searchParams: { toString: () => string },
): string {
  const params = new URLSearchParams(searchParams.toString());
  params.delete(RETURN_TO_PARAM);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Append `from` to a link so the destination knows where "back" goes. */
export function withReturnTo(href: string, returnTo: string | null): string {
  if (!returnTo) return href;

  // Base is a throwaway — only the relative part is returned.
  const url = new URL(href, "http://local");
  url.searchParams.set(RETURN_TO_PARAM, returnTo);

  return `${url.pathname}${url.search}${url.hash}`;
}
