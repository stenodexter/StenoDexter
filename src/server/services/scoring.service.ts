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
//
// A "word unit" is ANY unbroken run of non-whitespace characters.
// This naturally handles every punctuation pattern:
//
//   F.I.R.        → ["F.I.R."]          (≠ "F.I.R"  → replace)
//   F.I.R         → ["F.I.R"]           (≠ "F.I.R." → replace)
//   maybe,        → ["maybe,"]          (≠ "maybe"  → replace)
//   it's          → ["it's"]
//   Rs.500        → ["Rs.500"]
//   U.S.A.,       → ["U.S.A.,"]
//   "hello"       → ['"hello"']
//   (section)     → ["(section)"]
//   --            → ["--"]              (pure-punctuation, still one token)
//
// Each whitespace character is its own token so NW can flag extra spaces.
//
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
    // Consume everything until the next whitespace
    let j = i + 1;
    while (j < text.length && !/\s/.test(text[j]!)) j++;
    tokens.push(text.slice(i, j));
    i = j;
  }
  return tokens;
}

// ─── suppress adjacent extra spaces ──────────────────────────────────────────
//
// An extra_space immediately beside an insert/delete is just the space that
// travels with the inserted/deleted word. Demote it to "correct" so it
// doesn't double-count the mistake.
//
function suppressAdjacentExtraSpaces(tokens: DiffToken[]): DiffToken[] {
  const isWordError = (t: DiffToken) =>
    t.type === "insert" || t.type === "delete";
  const isExtraSpace = (t: DiffToken) => t.type === "extra_space";

  return tokens.map((tok, i) => {
    if (!isExtraSpace(tok)) return tok;
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    if ((prev && isWordError(prev)) || (next && isWordError(next))) {
      return { original: " ", typed: " ", type: "correct" };
    }
    return tok;
  });
}

// ─── Needleman-Wunsch global alignment ───────────────────────────────────────
//
// Exact-match only (case-sensitive). Each token is atomic — no partial credit
// within a token.
//
function nwAlign(A: string[], B: string[]): DiffToken[] {
  const m = A.length;
  const n = B.length;

  const MATCH = 2;
  const MISMATCH = -1;
  const GAP = -1;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i * GAP;
  for (let j = 0; j <= n; j++) dp[0]![j] = j * GAP;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const diagScore = A[i - 1] === B[j - 1] ? MATCH : MISMATCH;
      dp[i]![j] = Math.max(
        dp[i - 1]![j - 1]! + diagScore,
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
      const type: DiffType = /^\s$/.test(tok) ? "extra_space" : "insert";
      result.push({ typed: tok, type });
      j--;
    }
  }

  result.reverse();
  return suppressAdjacentExtraSpaces(result);
}

// ─── public API ───────────────────────────────────────────────────────────────

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
      if (d.type === "replace" || d.type === "insert" || d.type === "delete") {
        mistakes++;
      }
    }

    const total = tokenize(original).length;
    const correct = Math.max(0, total - mistakes);
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
    const wpm = Math.max(0, Math.round(correct / (durationSeconds / 60)));

    return { mistakes, accuracy, wpm, score: correct, diff };
  }
}

export const scoringEngine = new ScoringEngine();
