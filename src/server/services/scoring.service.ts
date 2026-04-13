export type DiffType =
  | "correct"
  | "replace"
  | "insert"
  | "delete"
  | "extra_space";

export type DiffToken = {
  original?: string;
  typed?: string;
  type: DiffType;
};

// ─── tokenizer ────────────────────────────────────────────────────────────────
// Each whitespace-separated run = one word token.
// Whitespace characters are their own tokens (for extra_space detection).
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

// ─── word-only tokens (no whitespace) ────────────────────────────────────────
function wordTokens(text: string): string[] {
  return tokenize(text).filter((t) => !/^\s+$/.test(t));
}

// ─── strip trailing/leading punctuation for comparison purposes ───────────────
// e.g. "stage," → "stage", "unfulfilled." → "unfulfilled"
// This is used only for alignment scoring, not for display.
function normalizeForComparison(word: string): string {
  return word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "").toLowerCase();
}

// ─── Needleman-Wunsch on word tokens only ────────────────────────────────────
// We align only the word arrays. Spaces are handled separately.
// Each position in the alignment = exactly one mistake if not "correct".
function nwWords(A: string[], B: string[]): DiffToken[] {
  const m = A.length;
  const n = B.length;

  const MATCH = 2;
  const MISMATCH = -1;
  const GAP = -1;

  // Tiny epsilon for positional tiebreaking — never affects true integer scores.
  // Diagonal pairings at earlier positions (smaller i+j) get a slightly higher
  // score, so when two alignments cost the same, we prefer the one that matches
  // typed words to the EARLIEST possible original word.
  // e.g. original ["who","is"] typed ["but"]: both (who↔but + delete is) and
  // (delete who + is↔but) cost the same, but the bias ensures who↔but wins.
  const EPS = 1e-6;

  const matches = (a: string, b: string): boolean =>
    a === b || normalizeForComparison(a) === normalizeForComparison(b);

  // Diagonal alignment score:
  // +2 exact match, 0 prefix/suffix fused word, -1 complete mismatch.
  // Prefix case handles space-fused typos like "departmentwhich" vs "department".
  const diagScore = (a: string, b: string): number => {
    if (matches(a, b)) return MATCH;
    const na = normalizeForComparison(a);
    const nb = normalizeForComparison(b);
    if (na.length > 0 && nb.length > 0) {
      if (nb.startsWith(na) || na.startsWith(nb)) return 0;
    }
    return MISMATCH;
  };

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i * GAP;
  for (let j = 0; j <= n; j++) dp[0]![j] = j * GAP;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      // Add positional bias to diagonal: earlier pairings score slightly higher.
      // Higher (m+n-i-j) = earlier in the sequence = more bias.
      const diagBias = EPS * (m + n - i - j + 1);
      dp[i]![j] = Math.max(
        dp[i - 1]![j - 1]! + diagScore(A[i - 1]!, B[j - 1]!) + diagBias,
        dp[i - 1]![j]! + GAP,
        dp[i]![j - 1]! + GAP,
      );
    }
  }

  const result: DiffToken[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const diagBias = EPS * (m + n - i - j + 1);
      const diagVal = dp[i - 1]![j - 1]! + diagScore(A[i - 1]!, B[j - 1]!) + diagBias;
      const delVal  = dp[i - 1]![j]!      + GAP;
      const insVal  = dp[i]![j - 1]!      + GAP;
      const best    = Math.max(diagVal, delVal, insVal);

      if (diagVal >= best - EPS * 0.1) {
        const exactMatch = A[i - 1] === B[j - 1];
        result.push({
          original: A[i - 1],
          typed: B[j - 1],
          type: exactMatch ? "correct" : "replace",
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

// ─── rebuild full diff with spaces re-inserted ────────────────────────────────
// After aligning words, walk both original and typed token streams to re-insert
// space tokens in the right places and detect extra_space.
function buildFullDiff(original: string, typed: string): DiffToken[] {
  const origWords = wordTokens(original);
  const typedWords = wordTokens(typed);
  const wordDiff = nwWords(origWords, typedWords);

  // Re-tokenize both sides to get spacing info
  const origTokens = tokenize(original);
  const typedTokens = tokenize(typed);

  // Collect space runs between words from typed input
  // We'll append extra_space tokens where multiple spaces appear between words
  const typedSpaceCounts: number[] = [];
  let spaceRun = 0;
  for (const t of typedTokens) {
    if (/^\s$/.test(t)) {
      spaceRun++;
    } else {
      typedSpaceCounts.push(spaceRun);
      spaceRun = 0;
    }
  }

  // Build final token list: interleave word diff tokens with space tokens
  const result: DiffToken[] = [];
  let typedWordIdx = 0;

  for (let wi = 0; wi < wordDiff.length; wi++) {
    const tok = wordDiff[wi]!;

    // Add a space before each word (except the first)
    if (wi > 0) {
      const spacesTyped = typedSpaceCounts[typedWordIdx] ?? 1;
      if (tok.type !== "delete") {
        // only count spaces when typed word exists
        if (spacesTyped > 1) {
          for (let s = 1; s < spacesTyped; s++) {
            result.push({ typed: " ", type: "extra_space" });
          }
        }
      }
      result.push({ original: " ", typed: " ", type: "correct" }); // the expected single space
    }

    result.push(tok);

    if (tok.type !== "delete") {
      typedWordIdx++;
    }
  }

  return result;
}

// ─── public API ───────────────────────────────────────────────────────────────

export default class ScoringEngine {
  compare(original: string, typed: string): DiffToken[] {
    return buildFullDiff(original.trim(), typed.trim());
  }

  evaluate(original: string, typed: string, durationSeconds: number) {
    original = original.trim();
    typed = typed.trim();

    const origWords = wordTokens(original);
    const typedWords = wordTokens(typed);
    const wordDiff = nwWords(origWords, typedWords);

    // Count extra spaces from typed input
    const typedTokens = tokenize(typed);
    let extraSpaces = 0;
    let spaceRun = 0;
    let seenWord = false;
    for (const t of typedTokens) {
      if (/^\s$/.test(t)) {
        if (seenWord) spaceRun++;
      } else {
        if (spaceRun > 1) extraSpaces += spaceRun - 1;
        spaceRun = 0;
        seenWord = true;
      }
    }

    // One mistake per wrong/missing/extra word position + extra spaces
    let wordMistakes = 0;
    for (const d of wordDiff) {
      if (d.type === "replace" || d.type === "insert" || d.type === "delete") {
        wordMistakes++;
      }
    }

    const mistakes = wordMistakes + extraSpaces;
    const total = origWords.length;
    const correct = Math.max(0, total - wordMistakes);
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
    const wpm = Math.max(0, Math.round(correct / (durationSeconds / 60)));

    return {
      mistakes,
      accuracy,
      wpm,
      score: correct,
      diff: this.compare(original, typed),
    };
  }
}

export const scoringEngine = new ScoringEngine();