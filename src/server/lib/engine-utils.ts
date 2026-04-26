// typing-utils.ts
// Shared utilities used by both scoring engines

export const PARAGRAPH_SENTINEL = "¶";

/**
 * Normalize platform-specific / font-specific punctuation to their
 * canonical ASCII equivalents so keyboard/font differences are never
 * counted as student errors.
 */
export function normalizePunctuation(text: string): string {
  return (
    text
      // Dashes: en dash, em dash, figure dash, minus sign → hyphen-minus
      .replace(/[\u2013\u2014\u2012\u2212]/g, "-")

      // Apostrophes / single quotes: curly, modifier, backtick, acute → straight
      .replace(/[\u2018\u2019\u02BC\u0060\u00B4\u2032]/g, "'")

      // Double quotation marks: curly → straight
      .replace(/[\u201C\u201D\u2033]/g, '"')

      // Ellipsis character → three dots
      .replace(/\u2026/g, "...")

      // Non-breaking space / narrow nb-space / thin space → regular space
      .replace(/[\u00A0\u202F\u2009\u200A]/g, " ")

      // Bullets / interpunct (sometimes in legal text) → hyphen
      .replace(/[\u2022\u00B7\u2027\u2043]/g, "-")

      // Left/right angle quotation marks → straight double quote
      .replace(/[\u00AB\u00BB]/g, '"')

      // Prime / double-prime (sometimes used instead of ' / ")
      .replace(/\u2032/g, "'")
      .replace(/\u2033/g, '"')
  );
}

/**
 * Prepare the ORIGINAL passage for the engine:
 *  - paragraph breaks → sentinel token ¶
 *  - single newlines → space
 *  - punctuation normalization
 *  - collapse whitespace
 */
export function preparePassage(text: string): string {
  return normalizePunctuation(
    text
      .replace(/\r\n/g, "\n")
      .replace(/\n+/g, ` ${PARAGRAPH_SENTINEL} `)
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/**
 * Prepare the TYPED text for the engine:
 *  - Enter key presses (newlines) → sentinel token ¶
 *  - punctuation normalization
 *  - collapse whitespace
 *
 * On the frontend, intercept Enter and insert "¶ " into the typed string,
 * OR just pass the raw typed string here and let this function convert \n → ¶.
 */
export function prepareTyped(text: string, originalHasParagraphs: boolean): string {
  return normalizePunctuation(
    text
      .replace(/\r\n/g, "\n")
      // ✅ Only treat \n as ¶ if passage actually has paragraph breaks
      .replace(/\n+/g, originalHasParagraphs ? ` ${PARAGRAPH_SENTINEL} ` : " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}