export type DiffType = "correct" | "replace" | "insert" | "delete" | "extra_space";

export type DiffToken = {
  original?: string;
  typed?: string;
  type: DiffType;
};

// Each character of whitespace is its own token so "   " (3 spaces) becomes
// [" ", " ", " "] — allowing NW to align one space as correct and flag the
// remaining two individually as extra_space.
// Words and punctuation are still matched greedily.
function tokenize(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+|\s|[^\s\p{L}\p{N}]/gu) ?? [];
}

// An extra_space that sits immediately next to an insert or delete is just
// the natural space that travels with that word — not an independent mistake.
// Example: typing "fqui " before a word → the space before "fqui" is an
// artifact of the insertion, not a separate spacing error.
// We demote those adjacent extra_space tokens to "correct" so they don't
// double-count the mistake and don't show a ␣ badge in the UI.
function suppressAdjacentExtraSpaces(tokens: DiffToken[]): DiffToken[] {
  const wordError = (t: DiffToken) => t.type === "insert" || t.type === "delete";
  const isExtraSpace = (t: DiffToken) => t.type === "extra_space";

  return tokens.map((tok, i) => {
    if (!isExtraSpace(tok)) return tok;
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    if ((prev && wordError(prev)) || (next && wordError(next))) {
      // Demote to correct — render as a plain space, no penalty
      return { original: " ", typed: " ", type: "correct" };
    }
    return tok;
  });
}

// Needleman-Wunsch global alignment — exact match only.
function nwAlign(A: string[], B: string[]): DiffToken[] {
  const m = A.length;
  const n = B.length;

  const MATCH    =  2;
  const MISMATCH = -1;
  const GAP      = -1;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i * GAP;
  for (let j = 0; j <= n; j++) dp[0]![j] = j * GAP;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const diagScore = A[i - 1] === B[j - 1] ? MATCH : MISMATCH;
      dp[i]![j] = Math.max(
        dp[i - 1]![j - 1]! + diagScore,
        dp[i - 1]![j]!     + GAP,
        dp[i]![j - 1]!     + GAP
      );
    }
  }

  const result: DiffToken[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const diagScore = A[i - 1] === B[j - 1] ? MATCH : MISMATCH;

      if (dp[i]![j] === dp[i - 1]![j - 1]! + diagScore) {
        const type = A[i - 1] === B[j - 1] ? "correct" : "replace";
        result.push({ original: A[i - 1], typed: B[j - 1], type });
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && (j === 0 || dp[i]![j] === dp[i - 1]![j]! + GAP)) {
      result.push({ original: A[i - 1], type: "delete" });
      i--;
    } else {
      const tok = B[j - 1]!;
      const type = /^\s$/.test(tok) ? "extra_space" : "insert";
      result.push({ typed: tok, type });
      j--;
    }
  }

  result.reverse();
  return suppressAdjacentExtraSpaces(result);
}

export default class ScoringEngine {
  compare(original: string, typed: string): DiffToken[] {
    const A = tokenize(original.trim());
    const B = tokenize(typed.trim());
    return nwAlign(A, B);
  }

  evaluate(original: string, typed: string, durationSeconds: number) {
    original = original.trim();
    typed = typed.trim();

    const diff = this.compare(original, typed);

    let mistakes = 0;
    for (const d of diff) {
      if (d.type !== "correct") mistakes++;
    }

    const total = tokenize(original).length;
    const correct = Math.max(0, total - mistakes);
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
    const wpm = Math.max(0, Math.round(correct / (durationSeconds / 60)));

    return { mistakes, accuracy, wpm, score: correct, diff };
  }
}

export const scoringEngine = new ScoringEngine();