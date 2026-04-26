// typing-scoring.engine.ts
// Rajasthan HC formula engine — with paragraph sentinel, punctuation normalization

import { PARAGRAPH_SENTINEL, preparePassage, prepareTyped, normalizePunctuation } from "../lib/engine-utils";

export type DiffType =
  | "correct"
  | "replace"
  | "insert"
  | "delete"
  | "extra_space"
  | "paragraph"; // new: marks a ¶ token in the diff

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
  grossErrors: number;   // fullMistakes + halfMistakes/2 + penalties
  errorStrokes: number;  // grossErrors * 5

  // strokes
  // totalStrokes = typed.length (every character including spaces, BEFORE trim)
  // This is the Indian standard: each character = 1 stroke, 5 strokes = 1 word
  totalStrokes: number;
  netStrokes: number;    // totalStrokes - errorStrokes (min 0)

  // speed
  grossWpm: number;      // totalStrokes / 5 / minutes
  netWpm: number;        // netStrokes / 5 / minutes

  // DPH-based (Rajasthan HC)
  netDph: number;        // (netStrokes / minutes) * 60
  marksOutOf50: number;  // (20/8000) * netDph
  marksOutOf25: number;  // marksOutOf50 / 2

  // misc
  accuracy: number;      // netStrokes / totalStrokes * 100
  backspaceCount: number;

  // diff
  diff: DiffToken[];
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizeWord(w: string): string {
  return normalizePunctuation(w).toLowerCase().replace(/[^a-z0-9'¶-]/g, "");
}

/**
 * Classify a word pair:
 *  - correct    : identical (after punctuation normalization)
 *  - half mistake: same after stripping leading/trailing punctuation and lowercasing
 *  - full mistake: truly different
 *
 * ¶ sentinel must match exactly — missing/extra paragraph break = full mistake.
 */
function classifyWord(
  original: string,
  typed: string,
): "correct" | "half" | "full" {
  // Sentinel must be exact
  if (original === PARAGRAPH_SENTINEL || typed === PARAGRAPH_SENTINEL) {
    return original === typed ? "correct" : "full";
  }
  if (original === typed) return "correct";
  if (normalizeWord(original) === normalizeWord(typed)) return "half";
  return "full";
}

/**
 * Minimal word-level diff using Wagner-Fischer (edit distance + backtrack).
 */
type Op =
  | { op: "keep";    orig: string; typed: string }
  | { op: "replace"; orig: string; typed: string }
  | { op: "insert";  typed: string }
  | { op: "delete";  orig: string };

function wordDiff(origWords: string[], typedWords: string[]): Op[] {
  const m = origWords.length;
  const n = typedWords.length;

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
            dp[i - 1]![j]!,     // delete
            dp[i]![j - 1]!,     // insert
          );
      }
    }
  }

  const ops: Op[] = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === typedWords[j - 1]) {
      ops.push({ op: "keep", orig: origWords[i - 1]!, typed: typedWords[j - 1]! });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      ops.push({ op: "replace", orig: origWords[i - 1]!, typed: typedWords[j - 1]! });
      i--; j--;
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
 * Count extra spaces (consecutive spaces) in typed text.
 * Each extra space beyond one = half mistake.
 */
function countExtraSpaces(typed: string): number {
  const matches = typed.match(/ {2,}/g);
  if (!matches) return 0;
  return matches.reduce((acc, m) => acc + m.length - 1, 0);
}

function injectExtraSpaceTokens(
  typed: string,
  diff: DiffToken[],
): DiffToken[] {
  const extras: DiffToken[] = [];
  const matches = [...typed.matchAll(/ {2,}/g)];
  for (const m of matches) {
    const count = (m[0]?.length ?? 1) - 1;
    for (let k = 0; k < count; k++) {
      extras.push({ type: "extra_space" });
    }
  }
  return [...diff, ...extras];
}

// ─── main engine ──────────────────────────────────────────────────────────────

export function evaluateTypingTest(
  correctTranscription: string,
  typed: string,
  durationSeconds: number,
  backspaceCount = 0,
): TypingEvaluation {
  // ── STROKE COUNT must be taken from raw typed length (before any processing)
  // Indian standard: every character (including spaces) = 1 stroke
  // totalStrokes is measured BEFORE trimming/preparing
  const totalStrokes = typed.length;

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

  // ── Prepare both sides: paragraph breaks → ¶, punctuation normalized
  const preparedOriginal = preparePassage(correctTranscription);
  const preparedTyped    = prepareTyped(typed);

  const origWords  = preparedOriginal.split(/\s+/);
  const typedWords = preparedTyped.split(/\s+/);

  // ── diff ──────────────────────────────────────────────────────────────────

  const ops = wordDiff(origWords, typedWords);
  const diffTokens: DiffToken[] = [];
  let fullMistakes = 0;
  let halfMistakes = 0;

  for (const op of ops) {
    if (op.op === "keep") {
      const isPara = op.orig === PARAGRAPH_SENTINEL;
      diffTokens.push({
        type: isPara ? "paragraph" : "correct",
        original: op.orig,
        typed: op.typed,
      });
      if (!isPara) {
        diffTokens.push({ type: "correct", original: " ", typed: " " });
      }
    } else if (op.op === "replace") {
      const kind = classifyWord(op.orig, op.typed);
      if (kind === "half") {
        halfMistakes++;
      } else {
        fullMistakes++;
      }
      diffTokens.push({ type: "replace", original: op.orig, typed: op.typed });
      diffTokens.push({ type: "correct", original: " ", typed: " " });
    } else if (op.op === "delete") {
      fullMistakes++;
      diffTokens.push({ type: "delete", original: op.orig });
      // If the missed token was a paragraph sentinel, mark it visually
      diffTokens.push({ type: "correct", original: " ", typed: " " });
    } else if (op.op === "insert") {
      fullMistakes++;
      diffTokens.push({ type: "insert", typed: op.typed });
      diffTokens.push({ type: "correct", original: " ", typed: " " });
    }
  }

  // remove trailing space token
  if (diffTokens.at(-1)?.original === " ") diffTokens.pop();

  // extra spaces
  const extraSpaces = countExtraSpaces(preparedTyped);
  halfMistakes += extraSpaces;

  const processedDiff = injectExtraSpaceTokens(preparedTyped, diffTokens);

  // ── scoring (Rajasthan HC Indian standard) ────────────────────────────────
  //
  // Gross Strokes  = typed.length  (all chars incl. spaces, raw before processing)
  // Gross WPM      = Gross Strokes ÷ 5 ÷ minutes
  // Gross Errors   = fullMistakes + halfMistakes/2 + penalties
  // Error Strokes  = Gross Errors × 5
  // Net Strokes    = Gross Strokes − Error Strokes  (min 0)
  // Net WPM        = Net Strokes ÷ 5 ÷ minutes
  // Net DPH        = (Net Strokes ÷ minutes) × 60
  // Marks/50       = (20 ÷ 8000) × Net DPH
  // Accuracy       = Net Strokes ÷ Gross Strokes × 100

  const penalties   = 0;
  const grossErrors = fullMistakes + halfMistakes / 2 + penalties;
  const errorStrokes = grossErrors * 5;

  const netStrokes = Math.max(0, totalStrokes - errorStrokes);
  const durationMinutes = Math.max(durationSeconds / 60, 0.0001);

  const grossWpm = parseFloat((totalStrokes / 5 / durationMinutes).toFixed(2));
  const netWpm   = parseFloat((netStrokes   / 5 / durationMinutes).toFixed(2));

  const netDph = Math.round((netStrokes / durationMinutes) * 60);

  const marksOutOf50 = parseFloat(
    Math.min(50, (20 / 8000) * netDph).toFixed(2)
  );
  const marksOutOf25 = parseFloat((marksOutOf50 / 2).toFixed(2));

  const accuracy =
    totalStrokes > 0
      ? parseFloat(((netStrokes / totalStrokes) * 100).toFixed(2))
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
 * Compare only — for result page diff rendering without re-scoring.
 */
export function compareTranscriptions(
  correct: string,
  typed: string,
): DiffToken[] {
  if (!typed?.trim()) return [];
  const { diff } = evaluateTypingTest(correct, typed, 300);
  return diff;
}