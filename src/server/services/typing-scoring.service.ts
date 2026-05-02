// typing-scoring.engine.ts
// Rajasthan HC formula engine — repetition-aware, paragraph-safe
//
// KEY DESIGN:
//   • Passage has internal ¶ paragraph breaks — NOT rep boundaries.
//   • Student types passage N times continuously (no separator needed).
//
//   THE CORE INSIGHT (from bug diagnosis):
//   ─────────────────────────────────────
//   Old approach: split first → score each chunk.
//   Problem: splits are inexact → chunks get PREFIX garbage.
//
//   Example of the bug:
//     Rep 1 typed: "...caused the death of her husbnan. The present matter..."
//                                           ^^^^^^^^^^^^^
//                  findRepStarts detects "The present matter" as rep2 start.
//                  But "of her husbnan." are BEFORE that signal → they get
//                  assigned as PREFIX of rep2 chunk.
//                  wordDiff then greedily matches "her"→"official", "husbnan."→"duty."
//                  deep in the passage. Wrong scoring.
//
//   REAL FIX: for each non-first chunk, scan the first N words forward to find
//   where origWords[0..] cleanly starts matching. Strip everything before that.
//   Stripped words = tail of previous rep → append back to previous chunk.
//   Previous rep scores them as mistakes (replace/insert at tail). Correct.
//
//   ALGORITHM:
//   1. findRepStarts — sliding window score, min-gap enforced
//   2. Build raw chunks from start positions
//   3. For each chunk[1..N]: findTrueChunkStart → strip prefix → append to prev
//   4. Score cleaned chunks; last rep(>1) gets trimTrailingDeletes forgiveness

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
      if (wordsMatch(origWords[i - 1]!, typedWords[j - 1]!)) {
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
    if (i > 0 && j > 0 && wordsMatch(origWords[i - 1]!, typedWords[j - 1]!)) {
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

// ─── constants ────────────────────────────────────────────────────────────────

const WINDOW_SIZE = 6;
// Score threshold to confirm "origWords[0..] starts here"
const START_THRESHOLD = 0.5;
// Fraction of orig covered by keep+replace to call a rep "complete"
const COMPLETE_THRESHOLD = 0.8;
// Hard cap on how far into a chunk we scan for prefix garbage (words)
const MAX_PREFIX_SCAN = 20;

// ─── rep boundary detection ───────────────────────────────────────────────────

/**
 * Score how well typedWords[pos..pos+W] matches origWords[0..W].
 * Returns 0.0–1.0.
 */
function windowMatchScore(
  origWords: string[],
  typedWords: string[],
  pos: number,
  windowSize: number = WINDOW_SIZE,
): number {
  const w = Math.min(windowSize, origWords.length, typedWords.length - pos);
  if (w <= 0) return 0;
  let matches = 0;
  for (let k = 0; k < w; k++) {
    if (wordsMatch(origWords[k]!, typedWords[pos + k]!)) matches++;
  }
  return matches / w;
}

/**
 * Pass 1: find candidate rep-start positions in typedWords.
 *
 * - Always starts with [0].
 * - Enforces minimum gap = 60% of origLen between consecutive starts.
 * - In each scan window picks the BEST scoring position (score peak).
 */
function findRepStarts(origWords: string[], typedWords: string[]): number[] {
  const origLen = origWords.length;
  const starts: number[] = [0];
  const minGap = Math.max(Math.floor(origLen * 0.6), 1);

  let scanFrom = minGap;

  while (scanFrom < typedWords.length) {
    const scanEnd = Math.min(
      scanFrom + Math.floor(origLen * 0.4) + 1,
      typedWords.length,
    );

    let bestPos = -1;
    let bestScore = START_THRESHOLD;

    for (let i = scanFrom; i < scanEnd; i++) {
      const score = windowMatchScore(origWords, typedWords, i);
      if (score > bestScore) {
        bestScore = score;
        bestPos = i;
      }
    }

    if (bestPos !== -1) {
      starts.push(bestPos);
      scanFrom = bestPos + minGap;
    } else {
      scanFrom += Math.max(Math.floor(minGap * 0.5), 1);
    }
  }

  return starts;
}

/**
 * Pass 2: find the true start of a chunk (strip prefix garbage).
 *
 * Scans FORWARD from position 0 up to MAX_PREFIX_SCAN.
 * First position p where origWords[0..W] matches chunk[p..p+W] with
 * sufficient confidence = true start. Return p.
 *
 * If p=0 → no prefix to strip.
 * If p>0 → chunk[0..p) is garbage that belongs to previous rep.
 */
function findTrueChunkStart(origWords: string[], chunk: string[]): number {
  const w = Math.min(WINDOW_SIZE, origWords.length);
  // Need at least 3 matches OR ceil(w * threshold), whichever is smaller
  const needed = Math.min(Math.max(3, Math.ceil(w * START_THRESHOLD)), w);
  const maxScan = Math.min(MAX_PREFIX_SCAN, Math.floor(chunk.length * 0.2));

  for (let p = 0; p <= maxScan; p++) {
    const window = Math.min(w, chunk.length - p);
    if (window < 2) break; // not enough words to test

    let matches = 0;
    for (let k = 0; k < window; k++) {
      if (wordsMatch(origWords[k]!, chunk[p + k]!)) matches++;
    }
    if (matches >= needed) {
      return p;
    }
  }

  return 0;
}

/**
 * Determine if chunk "completes" the passage.
 * Uses NW keep+replace count vs origLen.
 */
function chunkIsComplete(origWords: string[], chunk: string[]): boolean {
  if (chunk.length === 0) return false;
  const ops = wordDiff(origWords, chunk);
  const origCovered = ops.filter(
    (o) => o.op === "keep" || o.op === "replace",
  ).length;
  return origCovered >= origWords.length * COMPLETE_THRESHOLD;
}

/**
 * Main splitter.
 *
 * 1. findRepStarts → raw boundaries
 * 2. Build raw chunks
 * 3. For each non-first chunk: findTrueChunkStart
 *    - prefix (before true start) → append to previous chunk
 *    - chunk starts clean at origWords[0]
 * 4. Return { chunk, isComplete }[]
 */
function splitIntoRepetitions(
  origWords: string[],
  typedWords: string[],
): { chunk: string[]; isComplete: boolean }[] {
  if (typedWords.length === 0) {
    return [{ chunk: [], isComplete: false }];
  }

  // Step 1
  const repStarts = findRepStarts(origWords, typedWords);

  // Step 2: raw chunks
  const rawChunks: string[][] = repStarts.map((start, ri) => {
    const end = repStarts[ri + 1] ?? typedWords.length;
    return typedWords.slice(start, end);
  });

  // Step 3: clean prefix garbage from each non-first chunk
  // Work on mutable copies so we can append to previous
  const cleanedChunks: string[][] = rawChunks.map((c) => [...c]);

  for (let ri = 1; ri < cleanedChunks.length; ri++) {
    const chunk = cleanedChunks[ri]!;
    const trueStart = findTrueChunkStart(origWords, chunk);

    if (trueStart > 0) {
      // prefix belongs to previous rep
      const prefix = chunk.splice(0, trueStart); // mutates chunk in-place
      cleanedChunks[ri - 1]!.push(...prefix);
    }
  }

  // Step 4: build results
  const results: { chunk: string[]; isComplete: boolean }[] = [];
  for (const chunk of cleanedChunks) {
    if (chunk.length === 0) continue;
    results.push({ chunk, isComplete: chunkIsComplete(origWords, chunk) });
  }

  return results.length > 0
    ? results
    : [{ chunk: typedWords, isComplete: false }];
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

// ─── trim trailing deletes (forgive untyped tail, last rep > 1 only) ─────────

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

    // ── prepare ───────────────────────────────────────────────────────────────
    const preparedOriginal = preparePassage(correctTranscription);
    const hasParagraphs = preparedOriginal.includes(PARAGRAPH_SENTINEL);
    const preparedTyped = prepareTyped(typed, hasParagraphs);

    const origWords = preparedOriginal.split(/\s+/).filter(Boolean);

    // Strip trailing ¶ from typed end (Enter after last rep = not a mistake)
    const preparedTypedClean = preparedTyped.replace(/(\s*¶\s*)+$/, "").trim();
    const typedWords = preparedTypedClean.split(/\s+/).filter(Boolean);

    // ── split into reps ───────────────────────────────────────────────────────
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

      // Forgive untyped tail ONLY for last rep when there are multiple reps
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
