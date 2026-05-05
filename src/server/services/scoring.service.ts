// scoring-engine.ts
// NW-alignment engine — with paragraph sentinel, punctuation normalization

import {
  PARAGRAPH_SENTINEL,
  preparePassage,
  prepareTyped,
  normalizePunctuation,
} from "../lib/engine-utils";

export type DiffType =
  | "correct"
  | "replace"
  | "insert"
  | "delete"
  | "extra_space"
  | "paragraph"; // new: marks a correctly typed ¶ token

export type DiffToken = {
  original?: string;
  typed?: string;
  type: DiffType;
};

// ─── tokenizer ────────────────────────────────────────────────────────────────
// Each whitespace-separated run = one word token.
// Single whitespace characters are their own tokens.
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (/\s/.test(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    let j = i + 1;
    while (j < text.length && !/\s/.test(text[j]!)) j++;
    tokens.push(text.slice(i, j));
    i = j;
  }
  return tokens;
}

function wordTokens(text: string): string[] {
  return tokenize(text).filter((t) => !/^\s+$/.test(t));
}

/**
 * Strip leading/trailing punctuation for comparison — but preserve ¶ sentinel
 * and respect normalizePunctuation so dashes/apostrophes are equivalent.
 */
function normalizeForComparison(word: string): string {
  if (word === PARAGRAPH_SENTINEL) return word;
  return normalizePunctuation(word)
    .replace(/^[^a-zA-Z0-9¶]+|[^a-zA-Z0-9¶]+$/g, "")
    .toLowerCase();
}

// ─── Needleman-Wunsch on word tokens ─────────────────────────────────────────

function nwWords(A: string[], B: string[]): DiffToken[] {
  const m = A.length;
  const n = B.length;

  const MATCH = 2;
  const MISMATCH = -1;
  // FIX: GAP raised to -2 so a single replace (-1) always beats insert+delete (-4)
  const GAP = -2;
  const EPS = 1e-6;

  function editDistance(a: string, b: string): number {
    const m = a.length,
      n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [
      i,
      ...Array(n).fill(0),
    ]);
    for (let j = 0; j <= n; j++) dp[0]![j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i]![j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1]![j - 1]!
            : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    return dp[m]![n]!;
  }

  function matches(a: string, b: string): boolean {
    if (a === b) return true;
    const na = normalizeForComparison(a);
    const nb = normalizeForComparison(b);
    if (na === nb) return true;
    // fuzzy: allow 1 edit per ~8 chars
    const maxLen = Math.max(na.length, nb.length);
    const threshold = maxLen >= 6 ? 2 : maxLen >= 3 ? 1 : 0;
    return editDistance(na, nb) <= threshold;
  }

  const diagScore = (a: string, b: string): number => {
    // Sentinel must match exactly
    if (a === PARAGRAPH_SENTINEL || b === PARAGRAPH_SENTINEL) {
      return a === b ? MATCH : MISMATCH;
    }
    if (matches(a, b)) return MATCH;
    const na = normalizeForComparison(a);
    const nb = normalizeForComparison(b);
    if (na.length > 0 && nb.length > 0) {
      if (nb.startsWith(na) || na.startsWith(nb)) return 0;
    }
    // FIX: graduated similarity — more similar words score higher so NW
    // aligns the closest pair rather than an arbitrary mismatch.
    // Score range: (MISMATCH, 0) = (-1, 0). Always < GAP*2 (-4) so
    // replace still beats insert+delete, but similar words beat dissimilar.
    const maxLen = Math.max(na.length, nb.length);
    if (maxLen === 0) return MISMATCH;
    const ed = editDistance(na, nb);
    const sim = 1.0 - ed / maxLen; // 0..1
    return MISMATCH + sim; // -1..0
  };

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i * GAP;
  for (let j = 0; j <= n; j++) dp[0]![j] = j * GAP;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const diagBias = EPS * (m + n - i - j + 1);
      dp[i]![j] = Math.max(
        dp[i - 1]![j - 1]! + diagScore(A[i - 1]!, B[j - 1]!) + diagBias,
        dp[i - 1]![j]! + GAP,
        dp[i]![j - 1]! + GAP,
      );
    }
  }

  const result: DiffToken[] = [];
  let i = m,
    j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const diagBias = EPS * (m + n - i - j + 1);
      const diagVal =
        dp[i - 1]![j - 1]! + diagScore(A[i - 1]!, B[j - 1]!) + diagBias;
      const delVal = dp[i - 1]![j]! + GAP;
      const insVal = dp[i]![j - 1]! + GAP;
      const best = Math.max(diagVal, delVal, insVal);

      if (diagVal >= best - EPS * 0.1) {
        const exactMatch = A[i - 1] === B[j - 1];
        const isPara = A[i - 1] === PARAGRAPH_SENTINEL;
        // FIX: use matches() to determine correct vs replace — not just exactMatch
        const isCorrect = isPara ? exactMatch : matches(A[i - 1]!, B[j - 1]!);
        result.push({
          original: A[i - 1],
          typed: B[j - 1],
          type: isPara ? "paragraph" : isCorrect ? "correct" : "replace",
        });
        i--;
        j--;
        continue;
      }
      if (insVal >= best - EPS * 0.1) {
        result.push({ typed: B[j - 1], type: "insert" });
        j--;
        continue;
      }
    }
    if (i > 0 && (j === 0 || dp[i]![j]! <= dp[i - 1]![j]! + GAP + EPS * 0.1)) {
      result.push({ original: A[i - 1], type: "delete" });
      i--;
    } else {
      result.push({ typed: B[j - 1], type: "insert" });
      j--;
    }
  }

  result.reverse();
  return result;
}

// ─── rebuild full diff with spaces + extra_space tokens ───────────────────────

function buildFullDiff(original: string, typed: string): DiffToken[] {
  const origWords = wordTokens(original);
  const typedWords = wordTokens(typed);
  const diff = nwWords(origWords, typedWords);

  const typedTokensList = tokenize(typed);

  // Collect space run counts between typed words (index i = spaces BEFORE typed word i)
  const typedSpaceCounts: number[] = [];
  let spaceRun = 0;
  for (const t of typedTokensList) {
    if (/^\s$/.test(t)) {
      spaceRun++;
    } else {
      typedSpaceCounts.push(spaceRun);
      spaceRun = 0;
    }
  }

  const result: DiffToken[] = [];
  // FIX: track typedWordIdx separately and only advance BEFORE accessing space for current token
  let typedWordIdx = 0;

  for (let wi = 0; wi < diff.length; wi++) {
    const tok = diff[wi]!;
    const consumesTyped = tok.type !== "delete";

    if (wi > 0) {
      // Insert extra_space tokens for multiple consecutive spaces before this typed word
      if (consumesTyped) {
        const spacesTyped = typedSpaceCounts[typedWordIdx] ?? 1;
        if (spacesTyped > 1) {
          for (let s = 1; s < spacesTyped; s++) {
            result.push({ typed: " ", type: "extra_space" });
          }
        }
      }

      // Paragraph token: no space separator rendered — it IS the break
      if (tok.type !== "paragraph") {
        result.push({ original: " ", typed: " ", type: "correct" });
      }
    }

    result.push(tok);

    if (consumesTyped) {
      typedWordIdx++;
    }
  }

  return result;
}

// ─── public API ───────────────────────────────────────────────────────────────

export default class ScoringEngine {
  compare(original: string, typed: string): DiffToken[] {
    const preparedOriginal = preparePassage(original);
    const hasParagraphs = preparedOriginal.includes(PARAGRAPH_SENTINEL);
    return buildFullDiff(preparedOriginal, prepareTyped(typed, hasParagraphs));
  }

  evaluate(original: string, typed: string, durationSeconds: number) {
    const totalStrokes = typed.length;

    const preparedOriginal = preparePassage(original);
    const hasParagraphs = preparedOriginal.includes(PARAGRAPH_SENTINEL);
    const preparedTyped = prepareTyped(typed, hasParagraphs);

    original = preparedOriginal;
    typed = preparedTyped;

    const origWords = wordTokens(original);
    const typedWords = wordTokens(typed);
    const diff = nwWords(origWords, typedWords);

    // Count extra spaces
    const typedTokensList = tokenize(typed);
    let extraSpaces = 0;
    let spaceRun = 0;
    let seenWord = false;
    for (const t of typedTokensList) {
      if (/^\s$/.test(t)) {
        if (seenWord) spaceRun++;
      } else {
        if (spaceRun > 1) extraSpaces += spaceRun - 1;
        spaceRun = 0;
        seenWord = true;
      }
    }

    // Count word-level mistakes
    // ¶ sentinel counts as full mistake if missing or extra
    let wordMistakes = 0;
    for (const d of diff) {
      if (d.type === "replace" || d.type === "insert" || d.type === "delete") {
        wordMistakes++;
      }
    }

    const mistakes = wordMistakes + extraSpaces;
    const total = origWords.length;
    const correct = Math.max(0, total - wordMistakes);
    const accuracy =
      total === 0 ? 0 : parseFloat(((correct / total) * 100).toFixed(2));
    const durationMinutes = Math.max(durationSeconds / 60, 0.0001);
    const wpm = Math.max(0, Math.round(correct / durationMinutes));

    return {
      mistakes,
      accuracy,
      wpm,
      score: correct,
      totalStrokes,
      diff: this.compare(original, typed),
    };
  }
}

export const scoringEngine = new ScoringEngine();