// typing-scoring.engine.ts
// Rajasthan HC formula engine — repetition-aware, paragraph-safe
//
// KEY DESIGN:
//   • Passage has internal ¶ paragraph breaks — these are NOT rep boundaries.
//   • Student types the passage N times continuously (no separator needed).
//   • Engine detects rep boundaries algorithmically using multi-word alignment:
//     after ≥ 80% of orig consumed, check if next 4 typed words match
//     origWords[0..3] — only split if ≥ 3 of 4 match (strong signal).
//   • Last rep (rep > 1) incomplete → trailing missing words FORGIVEN.
//   • First rep incomplete → missing tail IS penalised.

import {
  PARAGRAPH_SENTINEL,
  preparePassage,
  prepareTyped,
  normalizePunctuation,
} from "../lib/engine-utils";

// ─── public types ─────────────────────────────────────────────────────────────

export type DiffType =
  | "correct"
  | "replace"
  | "insert"
  | "delete"
  | "extra_space"
  | "paragraph";

export type DiffToken = {
  original?: string;
  typed?: string;
  type: DiffType;
};

export type RepetitionResult = {
  index: number;
  isComplete: boolean;
  fullMistakes: number;
  halfMistakes: number;
  diff: DiffToken[];
};

export type TypingEvaluation = {
  fullMistakes: number;
  halfMistakes: number;
  penalties: number;
  grossErrors: number;
  errorStrokes: number;
  totalStrokes: number;
  netStrokes: number;
  grossWpm: number;
  netWpm: number;
  netDph: number;
  marksOutOf50: number;
  marksOutOf25: number;
  accuracy: number;
  backspaceCount: number;
  repeatCount: number;
  repetitions: RepetitionResult[];
  diff: DiffToken[];
};

// ─── word normalization ───────────────────────────────────────────────────────

function normalizeWord(w: string): string {
  if (w === PARAGRAPH_SENTINEL) return w;
  return normalizePunctuation(w)
    .toLowerCase()
    .replace(/[^a-z0-9'-]/g, "");
}

function wordsMatch(a: string, b: string): boolean {
  if (a === PARAGRAPH_SENTINEL || b === PARAGRAPH_SENTINEL) return a === b;
  return normalizeWord(a) === normalizeWord(b);
}

function classifyWord(
  original: string,
  typed: string,
): "correct" | "half" | "full" {
  if (original === PARAGRAPH_SENTINEL || typed === PARAGRAPH_SENTINEL) {
    return original === typed ? "correct" : "full";
  }
  if (original === typed) return "correct";
  if (normalizeWord(original) === normalizeWord(typed)) return "half";
  return "full";
}

// ─── rep boundary detector ────────────────────────────────────────────────────
//
// After consuming ≥ 80% of origWords, scan ahead in typedWords.
// Compare the next LOOK_AHEAD typed words against origWords[0..LOOK_AHEAD-1].
// If ≥ MIN_MATCH of them match → this position is a rep restart.
// Skip ¶ tokens in orig[0..] when building the comparison window (a passage
// that starts with a paragraph sentinel would be unusual, but be safe).

const LOOK_AHEAD = 4; // how many words to check
const MIN_MATCH = 3; // how many must match to confirm new rep

function isRepStart(
  origWords: string[],
  typedWords: string[],
  pos: number, // current position in typedWords
  origIdx: number, // how many orig words consumed so far
): boolean {
  const origLen = origWords.length;
  if (origIdx < Math.floor(origLen * 0.8)) return false;

  // Build a comparison window from origWords[0..], skipping nothing —
  // ¶ tokens are valid members of the window.
  const origWindow = origWords.slice(0, LOOK_AHEAD);
  let matches = 0;
  for (let k = 0; k < origWindow.length; k++) {
    const tw = typedWords[pos + k];
    if (tw === undefined) break;
    if (wordsMatch(origWindow[k]!, tw)) matches++;
  }
  return matches >= MIN_MATCH;
}

// ─── repetition splitter ──────────────────────────────────────────────────────

function splitIntoRepetitions(
  origWords: string[],
  typedWords: string[],
): { chunk: string[]; isComplete: boolean }[] {
  const origLen = origWords.length;
  const results: { chunk: string[]; isComplete: boolean }[] = [];
  let pos = 0;

  while (pos < typedWords.length) {
    const chunk: string[] = [];
    let origIdx = 0;

    while (pos < typedWords.length && origIdx < origLen) {
      // Check for rep restart before consuming this token
      if (chunk.length > 0 && isRepStart(origWords, typedWords, pos, origIdx)) {
        break; // end current rep here; next iteration starts new rep
      }

      chunk.push(typedWords[pos]!);
      pos++;
      origIdx++;
    }

    if (chunk.length === 0) {
      pos++; // safety: prevent infinite loop
      continue;
    }

    results.push({ chunk, isComplete: origIdx >= origLen });
  }

  return results.length > 0
    ? results
    : [{ chunk: typedWords, isComplete: false }];
}

// ─── Wagner-Fischer word diff ─────────────────────────────────────────────────

type Op =
  | { op: "keep"; orig: string; typed: string }
  | { op: "replace"; orig: string; typed: string }
  | { op: "insert"; typed: string }
  | { op: "delete"; orig: string };

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
          1 + Math.min(dp[i - 1]![j - 1]!, dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  const ops: Op[] = [];
  let i = m;
  let j = n;

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

// ─── ops → DiffToken[] ───────────────────────────────────────────────────────

function opsToDiff(ops: Op[]): {
  diff: DiffToken[];
  fullMistakes: number;
  halfMistakes: number;
} {
  const tokens: DiffToken[] = [];
  let fullMistakes = 0;
  let halfMistakes = 0;

  for (const op of ops) {
    if (op.op === "keep") {
      const isPara = op.orig === PARAGRAPH_SENTINEL;
      tokens.push({
        type: isPara ? "paragraph" : "correct",
        original: op.orig,
        typed: op.typed,
      });
      if (!isPara) tokens.push({ type: "correct", original: " ", typed: " " });
    } else if (op.op === "replace") {
      const kind = classifyWord(op.orig, op.typed);
      kind === "half" ? halfMistakes++ : fullMistakes++;
      tokens.push({ type: "replace", original: op.orig, typed: op.typed });
      tokens.push({ type: "correct", original: " ", typed: " " });
    } else if (op.op === "delete") {
      fullMistakes++;
      tokens.push({ type: "delete", original: op.orig });
      tokens.push({ type: "correct", original: " ", typed: " " });
    } else {
      fullMistakes++;
      tokens.push({ type: "insert", typed: op.typed });
      tokens.push({ type: "correct", original: " ", typed: " " });
    }
  }

  if (tokens.at(-1)?.original === " ") tokens.pop();

  return { diff: tokens, fullMistakes, halfMistakes };
}

// ─── trim trailing deletes (forgive untyped tail for incomplete last rep) ─────

function trimTrailingDeletes(ops: Op[]): Op[] {
  let end = ops.length;
  while (end > 0 && ops[end - 1]!.op === "delete") end--;
  return ops.slice(0, end);
}

// ─── extra space helpers ──────────────────────────────────────────────────────

function countExtraSpaces(typed: string): number {
  const matches = typed.match(/ {2,}/g);
  if (!matches) return 0;
  return matches.reduce((acc, m) => acc + m.length - 1, 0);
}

function injectExtraSpaceTokens(typed: string, diff: DiffToken[]): DiffToken[] {
  const extras: DiffToken[] = [];
  for (const m of typed.matchAll(/ {2,}/g)) {
    const count = (m[0]?.length ?? 1) - 1;
    for (let k = 0; k < count; k++) extras.push({ type: "extra_space" });
  }
  return [...diff, ...extras];
}

// ─── TypingScoringEngine ──────────────────────────────────────────────────────

export class TypingScoringEngine {
  evaluate(
    correctTranscription: string,
    typed: string,
    durationSeconds: number,
    backspaceCount = 0,
  ): TypingEvaluation {
    const totalStrokes = typed.length;

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
        repeatCount: 1,
        repetitions: [],
        diff: [],
      };
    }

    // ── prepare ONCE ─────────────────────────────────────────────────────────
    const preparedOriginal = preparePassage(correctTranscription);
    const hasParagraphs = preparedOriginal.includes(PARAGRAPH_SENTINEL);
    const preparedTyped = prepareTyped(typed, hasParagraphs);

    const origWords = preparedOriginal.split(/\s+/).filter(Boolean);

    // Strip trailing ¶ from typed end (Enter after last rep = not a mistake)
    const preparedTypedClean = preparedTyped.replace(/(\s*¶\s*)+$/, "").trim();
    const typedWords = preparedTypedClean.split(/\s+/).filter(Boolean);

    // ── split typed into per-rep chunks ───────────────────────────────────────
    const repChunks = splitIntoRepetitions(origWords, typedWords);
    const repeatCount = repChunks.length || 1;

    // ── score each rep ────────────────────────────────────────────────────────
    const repetitions: RepetitionResult[] = [];
    let totalFullMistakes = 0;
    let totalHalfMistakes = 0;
    const flatDiff: DiffToken[] = [];

    for (let ri = 0; ri < repChunks.length; ri++) {
      const { chunk, isComplete } = repChunks[ri]!;
      const isLastRep = ri === repChunks.length - 1;
      const isFirstRep = ri === 0;

      let ops = wordDiff(origWords, chunk);

      // Forgive untyped tail for incomplete last rep when rep > 1
      if (!isComplete && !isFirstRep && isLastRep) {
        ops = trimTrailingDeletes(ops);
      }

      const { diff, fullMistakes, halfMistakes } = opsToDiff(ops);

      const chunkStr = chunk.join(" ");
      const extraSpaces = countExtraSpaces(chunkStr);
      const repHalfMistakes = halfMistakes + extraSpaces;
      const repDiff = injectExtraSpaceTokens(chunkStr, diff);

      totalFullMistakes += fullMistakes;
      totalHalfMistakes += repHalfMistakes;

      repetitions.push({
        index: ri + 1,
        isComplete,
        fullMistakes,
        halfMistakes: repHalfMistakes,
        diff: repDiff,
      });

      if (ri > 0) flatDiff.push({ type: "paragraph" });
      flatDiff.push(...repDiff);
    }

    // ── Rajasthan HC scoring ──────────────────────────────────────────────────
    const penalties = 0;
    const grossErrors = totalFullMistakes + totalHalfMistakes / 2 + penalties;
    const errorStrokes = grossErrors * 5;
    const netStrokes = Math.max(0, totalStrokes - errorStrokes);
    const durationMinutes = Math.max(durationSeconds / 60, 0.0001);

    const grossWpm = parseFloat(
      (totalStrokes / 5 / durationMinutes).toFixed(2),
    );
    const netWpm = parseFloat((netStrokes / 5 / durationMinutes).toFixed(2));
    const netDph = Math.round((netStrokes / durationMinutes) * 60);
    const marksOutOf50 = parseFloat(
      Math.min(50, (20 / 8000) * netDph).toFixed(2),
    );
    const marksOutOf25 = parseFloat((marksOutOf50 / 2).toFixed(2));
    const accuracy =
      totalStrokes > 0
        ? parseFloat(((netStrokes / totalStrokes) * 100).toFixed(2))
        : 0;

    return {
      fullMistakes: totalFullMistakes,
      halfMistakes: totalHalfMistakes,
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
      repeatCount,
      repetitions,
      diff: flatDiff,
    };
  }

  compare(correctTranscription: string, typed: string): DiffToken[] {
    if (!typed?.trim()) return [];
    return this.evaluate(correctTranscription, typed, 300).diff;
  }
}

export const typingScoringEngine = new TypingScoringEngine();

// ─── drop-in function exports ─────────────────────────────────────────────────

export function evaluateTypingTest(
  correctTranscription: string,
  typed: string,
  durationSeconds: number,
  backspaceCount = 0,
): TypingEvaluation {
  return typingScoringEngine.evaluate(
    correctTranscription,
    typed,
    durationSeconds,
    backspaceCount,
  );
}

export function compareTranscriptions(
  correct: string,
  typed: string,
): DiffToken[] {
  return typingScoringEngine.compare(correct, typed);
}
