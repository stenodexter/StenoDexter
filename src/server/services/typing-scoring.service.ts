// typing-scoring.engine.ts
// Rajasthan HC formula engine — repetition-aware, paragraph-safe
// Uses NW (Needleman-Wunsch) alignment per rep for accurate within-rep diff

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
    .replace(/^[^a-zA-Z0-9¶]+|[^a-zA-Z0-9¶]+$/g, "")
    .toLowerCase();
}

function editDistance(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
  return dp[m]![n]!;
}

/**
 * Classify relationship between original and typed word:
 * - "correct": exact match
 * - "half": same after normalization (case/punct diff) OR within fuzzy threshold
 * - "full": clearly wrong
 */
function classifyWord(
  orig: string,
  typed: string,
): "correct" | "half" | "full" {
  if (orig === PARAGRAPH_SENTINEL || typed === PARAGRAPH_SENTINEL)
    return orig === typed ? "correct" : "full";
  if (orig === typed) return "correct";
  const no = normalizeWord(orig);
  const nt = normalizeWord(typed);
  if (no === nt) return "half";
  const maxLen = Math.max(no.length, nt.length);
  const threshold = maxLen >= 6 ? 2 : maxLen >= 3 ? 1 : 0;
  if (editDistance(no, nt) <= threshold) return "half";
  return "full";
}

function wordsMatch(a: string, b: string): boolean {
  return classifyWord(a, b) !== "full";
}

// ─── NW alignment ─────────────────────────────────────────────────────────────
// NW with fuzzy diagScore keeps mistyped words aligned to correct passage
// position instead of skipping ahead greedily like Wagner-Fischer does.

type Op =
  | { op: "keep"; orig: string; typed: string }
  | { op: "replace"; orig: string; typed: string }
  | { op: "insert"; typed: string }
  | { op: "delete"; orig: string };

function nwAlign(origWords: string[], typedWords: string[]): Op[] {
  const m = origWords.length;
  const n = typedWords.length;

  const MATCH = 2;
  const MISMATCH = -1;
  const GAP = -1;
  const EPS = 1e-6;

  function diagScore(a: string, b: string): number {
    if (a === PARAGRAPH_SENTINEL || b === PARAGRAPH_SENTINEL)
      return a === b ? MATCH : MISMATCH;
    const cls = classifyWord(a, b);
    if (cls !== "full") return MATCH; // correct or half — align here
    // partial prefix: softer penalty to keep alignment anchored
    const na = normalizeWord(a),
      nb = normalizeWord(b);
    if (
      na.length > 0 &&
      nb.length > 0 &&
      (nb.startsWith(na) || na.startsWith(nb))
    )
      return 0;
    return MISMATCH;
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i * GAP;
  for (let j = 0; j <= n; j++) dp[0]![j] = j * GAP;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const bias = EPS * (m + n - i - j + 1);
      dp[i]![j] = Math.max(
        dp[i - 1]![j - 1]! +
          diagScore(origWords[i - 1]!, typedWords[j - 1]!) +
          bias,
        dp[i - 1]![j]! + GAP,
        dp[i]![j - 1]! + GAP,
      );
    }
  }

  const ops: Op[] = [];
  let i = m,
    j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const bias = EPS * (m + n - i - j + 1);
      const diagVal =
        dp[i - 1]![j - 1]! +
        diagScore(origWords[i - 1]!, typedWords[j - 1]!) +
        bias;
      const delVal = dp[i - 1]![j]! + GAP;
      const insVal = dp[i]![j - 1]! + GAP;
      const best = Math.max(diagVal, delVal, insVal);

      if (diagVal >= best - EPS * 0.1) {
        const cls = classifyWord(origWords[i - 1]!, typedWords[j - 1]!);
        ops.push(
          cls === "correct"
            ? { op: "keep", orig: origWords[i - 1]!, typed: typedWords[j - 1]! }
            : {
                op: "replace",
                orig: origWords[i - 1]!,
                typed: typedWords[j - 1]!,
              },
        );
        i--;
        j--;
        continue;
      }
      if (insVal >= best - EPS * 0.1) {
        ops.push({ op: "insert", typed: typedWords[j - 1]! });
        j--;
        continue;
      }
    }
    if (i > 0 && (j === 0 || dp[i]![j]! <= dp[i - 1]![j]! + GAP + EPS * 0.1)) {
      ops.push({ op: "delete", orig: origWords[i - 1]! });
      i--;
    } else {
      ops.push({ op: "insert", typed: typedWords[j - 1]! });
      j--;
    }
  }

  return ops.reverse();
}

// ─── constants for rep boundary detection ─────────────────────────────────────

const WINDOW_SIZE = 6;
const START_THRESHOLD = 0.4;
const COMPLETE_THRESHOLD = 0.8;
const MAX_PREFIX_SCAN = 30;
const CONFIDENT_THRESHOLD = 0.65;

// ─── rep boundary detection ───────────────────────────────────────────────────

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

function findRepStarts(origWords: string[], typedWords: string[]): number[] {
  const origLen = origWords.length;
  const starts: number[] = [0];
  const minGap = Math.max(Math.floor(origLen * 0.5), 1);

  let scanFrom = minGap;

  while (scanFrom < typedWords.length) {
    const scanEnd = Math.min(
      scanFrom + Math.floor(origLen * 0.6) + 1,
      typedWords.length,
    );

    let bestPos = -1;
    let bestScore = START_THRESHOLD;

    for (let i = scanFrom; i < scanEnd; i++) {
      const score = windowMatchScore(origWords, typedWords, i);
      if (score >= CONFIDENT_THRESHOLD) {
        bestPos = i;
        break;
      }
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

function findTrueChunkStart(origWords: string[], chunk: string[]): number {
  const w = Math.min(WINDOW_SIZE, origWords.length);
  const needed = Math.min(Math.max(3, Math.ceil(w * START_THRESHOLD)), w);
  const maxScan = Math.min(MAX_PREFIX_SCAN, Math.floor(chunk.length * 0.2));

  for (let p = 0; p <= maxScan; p++) {
    const window = Math.min(w, chunk.length - p);
    if (window < 2) break;
    let matches = 0;
    for (let k = 0; k < window; k++) {
      if (wordsMatch(origWords[k]!, chunk[p + k]!)) matches++;
    }
    if (matches >= needed) return p;
  }
  return 0;
}

function chunkIsComplete(origWords: string[], chunk: string[]): boolean {
  if (chunk.length === 0) return false;
  const ops = nwAlign(origWords, chunk);
  const origCovered = ops.filter(
    (o) => o.op === "keep" || o.op === "replace",
  ).length;
  return origCovered >= origWords.length * COMPLETE_THRESHOLD;
}

function splitIntoRepetitions(
  origWords: string[],
  typedWords: string[],
): { chunk: string[]; isComplete: boolean }[] {
  if (typedWords.length === 0) return [{ chunk: [], isComplete: false }];

  const repStarts = findRepStarts(origWords, typedWords);

  const rawChunks: string[][] = repStarts.map((start, ri) => {
    const end = repStarts[ri + 1] ?? typedWords.length;
    return typedWords.slice(start, end);
  });

  const cleanedChunks: string[][] = rawChunks.map((c) => [...c]);

  for (let ri = 1; ri < cleanedChunks.length; ri++) {
    const chunk = cleanedChunks[ri]!;
    const trueStart = findTrueChunkStart(origWords, chunk);
    if (trueStart > 0) {
      const prefix = chunk.splice(0, trueStart);
      cleanedChunks[ri - 1]!.push(...prefix);
    }
  }

  const results: { chunk: string[]; isComplete: boolean }[] = [];
  for (const chunk of cleanedChunks) {
    if (chunk.length === 0) continue;
    results.push({ chunk, isComplete: chunkIsComplete(origWords, chunk) });
  }

  return results.length > 0
    ? results
    : [{ chunk: typedWords, isComplete: false }];
}

// ─── ops → DiffToken[] with Rajasthan HC half/full classification ─────────────

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
      const cls = classifyWord(op.orig, op.typed);
      if (cls === "half") halfMistakes++;
      else fullMistakes++;
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

    const preparedOriginal = preparePassage(correctTranscription);
    const hasParagraphs = preparedOriginal.includes(PARAGRAPH_SENTINEL);
    const preparedTyped = prepareTyped(typed, hasParagraphs);

    const origWords = preparedOriginal.split(/\s+/).filter(Boolean);

    const preparedTypedClean = preparedTyped.replace(/(\s*¶\s*)+$/, "").trim();
    const typedWords = preparedTypedClean.split(/\s+/).filter(Boolean);

    const repChunks = splitIntoRepetitions(origWords, typedWords);
    const repeatCount = repChunks.length || 1;

    const repetitions: RepetitionResult[] = [];
    let totalFullMistakes = 0;
    let totalHalfMistakes = 0;
    const flatDiff: DiffToken[] = [];

    for (let ri = 0; ri < repChunks.length; ri++) {
      const { chunk, isComplete } = repChunks[ri]!;
      const isLastRep = ri === repChunks.length - 1;
      const isFirstRep = ri === 0;

      let ops = nwAlign(origWords, chunk);

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
