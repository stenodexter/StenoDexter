// server/services/typing-scoring.engine.ts

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

export type TypingEvaluation = {
  // raw counts
  fullMistakes: number;
  halfMistakes: number;
  penalties: number;
  grossErrors: number; // fullMistakes + halfMistakes/2 + penalties
  errorStrokes: number; // grossErrors * 5

  // strokes
  totalStrokes: number; // typed chars count
  netStrokes: number; // totalStrokes - errorStrokes (min 0)

  // speed
  grossWpm: number; // totalStrokes / 5 / minutes
  netWpm: number; // netStrokes / 5 / minutes

  // DPH-based
  netDph: number; // (netStrokes / minutes) * 60
  marksOutOf50: number; // (20/8000) * netDph
  marksOutOf25: number; // marksOutOf50 / 2

  // misc
  accuracy: number; // netStrokes / totalStrokes * 100
  backspaceCount: number; // not tracked here — 0 unless passed in

  // diff
  diff: DiffToken[];
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Classify a word pair:
 *  - correct     : identical
 *  - half mistake: same after stripping punctuation/case
 *  - full mistake: truly different
 */
function classifyWord(
  original: string,
  typed: string,
): "correct" | "half" | "full" {
  if (original === typed) return "correct";
  if (normalizeWord(original) === normalizeWord(typed)) return "half";
  return "full";
}

/**
 * Minimal word-level diff using Wagner-Fischer LCS.
 * Returns edit operations: keep / replace / insert / delete.
 */
type Op =
  | { op: "keep"; orig: string; typed: string }
  | { op: "replace"; orig: string; typed: string }
  | { op: "insert"; typed: string } // extra word typed
  | { op: "delete"; orig: string }; // word missed

function wordDiff(origWords: string[], typedWords: string[]): Op[] {
  const m = origWords.length;
  const n = typedWords.length;

  // dp[i][j] = edit distance
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1] === typedWords[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] =
          1 +
          Math.min(
            dp[i - 1]![j - 1]!, // replace
            dp[i - 1]![j]!, // delete
            dp[i]![j - 1]!, // insert
          );
      }
    }
  }

  // backtrack
  const ops: Op[] = [];
  let i = m,
    j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === typedWords[j - 1]) {
      ops.push({
        op: "keep",
        orig: origWords[i - 1]!,
        typed: typedWords[j - 1]!,
      });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      ops.push({
        op: "replace",
        orig: origWords[i - 1]!,
        typed: typedWords[j - 1]!,
      });
      i--;
      j--;
    } else if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + 1) {
      ops.push({ op: "delete", orig: origWords[i - 1]! });
      i--;
    } else {
      ops.push({ op: "insert", typed: typedWords[j - 1]! });
      j--;
    }
  }

  return ops.reverse();
}

/**
 * Detect extra spaces: multiple consecutive spaces in typed text.
 */
function countExtraSpaces(typed: string): number {
  const matches = typed.match(/ {2,}/g);
  if (!matches) return 0;
  return matches.reduce((acc, m) => acc + m.length - 1, 0);
}

// ─── main engine ──────────────────────────────────────────────────────────────

export function evaluateTypingTest(
  correctTranscription: string,
  typed: string,
  durationSeconds: number,
  backspaceCount = 0,
): TypingEvaluation {
  // edge: empty submission
  if (!typed.trim()) {
    return {
      fullMistakes: 0,
      halfMistakes: 0,
      penalties: 0,
      grossErrors: 0,
      errorStrokes: 0,
      totalStrokes: 0,
      netStrokes: 0,
      grossWpm: 0,
      netWpm: 0,
      netDph: 0,
      marksOutOf50: 0,
      marksOutOf25: 0,
      accuracy: 0,
      backspaceCount,
      diff: [],
    };
  }

  const origWords = correctTranscription.trim().split(/\s+/);
  const typedWords = typed.trim().split(/\s+/);

  // ── diff ──────────────────────────────────────────────────────────────────

  const ops = wordDiff(origWords, typedWords);

  const diffTokens: DiffToken[] = [];
  let fullMistakes = 0;
  let halfMistakes = 0;

  for (const op of ops) {
    if (op.op === "keep") {
      diffTokens.push({ type: "correct", original: op.orig, typed: op.typed });
      // also add trailing space token
      diffTokens.push({ type: "correct", original: " ", typed: " " });
    } else if (op.op === "replace") {
      const kind = classifyWord(op.orig, op.typed);
      if (kind === "half") {
        halfMistakes++;
        diffTokens.push({
          type: "replace",
          original: op.orig,
          typed: op.typed,
        });
      } else {
        fullMistakes++;
        diffTokens.push({
          type: "replace",
          original: op.orig,
          typed: op.typed,
        });
      }
      diffTokens.push({ type: "correct", original: " ", typed: " " });
    } else if (op.op === "delete") {
      // missed word — full mistake
      fullMistakes++;
      diffTokens.push({ type: "delete", original: op.orig });
      diffTokens.push({ type: "correct", original: " ", typed: " " });
    } else if (op.op === "insert") {
      // extra word typed — full mistake
      fullMistakes++;
      diffTokens.push({ type: "insert", typed: op.typed });
      diffTokens.push({ type: "correct", original: " ", typed: " " });
    }
  }

  // remove trailing space token
  if (diffTokens.at(-1)?.original === " ") diffTokens.pop();

  // extra spaces
  const extraSpaces = countExtraSpaces(typed);
  // Each extra space = half mistake per common HC rules
  halfMistakes += extraSpaces;
  // inject extra_space tokens at detected positions (simplified: append metadata)
  // For rendering purposes, we mark them inline where detected
  const processedDiff = injectExtraSpaceTokens(typed, diffTokens, origWords);

  // ── scoring ───────────────────────────────────────────────────────────────

  const penalties = 0; // no penalty category in this variant
  const grossErrors = fullMistakes + halfMistakes / 2 + penalties;
  const errorStrokes = grossErrors * 5;

  // totalStrokes = actual characters typed (spaces included)
  const totalStrokes = typed.length;
  const netStrokes = Math.max(0, totalStrokes - errorStrokes);

  const durationMinutes = Math.max(durationSeconds / 60, 0.0001);

  const grossWpm = Math.round(totalStrokes / 5 / durationMinutes);
  const netWpm = Math.round(netStrokes / 5 / durationMinutes);

  // DPH = (netStrokes / durationMinutes) * 60
  const netDph = Math.round((netStrokes / durationMinutes) * 60);

  // Rajasthan HC formula: (20 / 8000) * DPH
  const marksOutOf50Raw = (20 / 8000) * netDph;
  const marksOutOf50 = Math.min(50, parseFloat(marksOutOf50Raw.toFixed(2)));
  const marksOutOf25 = parseFloat((marksOutOf50 / 2).toFixed(2));

  const accuracy =
    totalStrokes > 0
      ? Math.min(100, Math.round((netStrokes / totalStrokes) * 100))
      : 0;

  return {
    fullMistakes,
    halfMistakes,
    penalties,
    grossErrors,
    errorStrokes,
    totalStrokes,
    netStrokes: Math.round(netStrokes),
    grossWpm,
    netWpm,
    netDph,
    marksOutOf50,
    marksOutOf25,
    accuracy,
    backspaceCount,
    diff: processedDiff,
  };
}

/**
 * Walk through typed text and inject extra_space tokens where
 * two or more consecutive spaces occur.
 */
function injectExtraSpaceTokens(
  typed: string,
  diff: DiffToken[],
  origWords: string[],
): DiffToken[] {
  // Simple approach: scan typed for double-spaces and append markers
  // The diff already has word-level tokens; we append extra_space entries
  // at the end of the diff for each extra space detected.
  // A more precise approach would require character-level diff.
  const extras: DiffToken[] = [];
  const matches = [...typed.matchAll(/ {2,}/g)];
  for (const m of matches) {
    const count = (m[0]?.length ?? 1) - 1;
    for (let k = 0; k < count; k++) {
      extras.push({ type: "extra_space" });
    }
  }
  // We don't inject mid-stream to keep it simple — the extra_space tokens
  // are appended; the DiffView renderer handles them.
  return [...diff, ...extras];
}

/**
 * Compare only (for result page diff rendering without re-scoring).
 */
export function compareTranscriptions(
  correct: string,
  typed: string,
): DiffToken[] {
  if (!typed?.trim()) return [];
  const { diff } = evaluateTypingTest(correct, typed, 300); // duration irrelevant for diff
  return diff;
}
