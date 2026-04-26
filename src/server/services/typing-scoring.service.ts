// typing-scoring.engine.ts
// Rajasthan HC formula engine — repetition-aware, paragraph-safe

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
  | "paragraph";

export type DiffToken = {
  original?: string;
  typed?: string;
  type: DiffType;
};

export type RepetitionResult = {
  index: number; // 1-based
  isComplete: boolean; // false if student stopped mid-way through this rep
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
  diff: DiffToken[]; // flat combined diff (legacy / summary use)
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizeWord(w: string): string {
  return normalizePunctuation(w)
    .toLowerCase()
    .replace(/[^a-z0-9'¶-]/g, "");
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

// ─── word diff (Wagner-Fischer) ───────────────────────────────────────────────

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

// ─── build DiffToken[] from Op[] ─────────────────────────────────────────────

function opsToDiff(ops: Op[]): {
  diff: DiffToken[];
  fullMistakes: number;
  halfMistakes: number;
} {
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
      if (!isPara)
        diffTokens.push({ type: "correct", original: " ", typed: " " });
    } else if (op.op === "replace") {
      const kind = classifyWord(op.orig, op.typed);
      kind === "half" ? halfMistakes++ : fullMistakes++;
      diffTokens.push({ type: "replace", original: op.orig, typed: op.typed });
      diffTokens.push({ type: "correct", original: " ", typed: " " });
    } else if (op.op === "delete") {
      fullMistakes++;
      diffTokens.push({ type: "delete", original: op.orig });
      diffTokens.push({ type: "correct", original: " ", typed: " " });
    } else if (op.op === "insert") {
      fullMistakes++;
      diffTokens.push({ type: "insert", typed: op.typed });
      diffTokens.push({ type: "correct", original: " ", typed: " " });
    }
  }

  // trim trailing space token
  if (diffTokens.at(-1)?.original === " ") diffTokens.pop();

  return { diff: diffTokens, fullMistakes, halfMistakes };
}

// ─── trailing delete trimmer ─────────────────────────────────────────────────

/**
 * For incomplete repetitions (rep > 1): strip delete ops from the END of the
 * op list. These represent words the student never reached — not mistakes.
 * Stops trimming as soon as a non-delete op is encountered from the tail.
 */
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

// ─── repetition splitter ──────────────────────────────────────────────────────

/**
 * Split typed words into repetition-sized chunks matching the original.
 * The ¶ tokens that appear BETWEEN repetitions (student pressed Enter
 * to separate reps) are consumed as boundaries and NOT passed into any rep.
 * ¶ tokens INSIDE a rep (matching passage paragraph breaks) are kept.
 */
function splitIntoRepetitions(
  origWords: string[],
  typedWords: string[],
): { chunk: string[]; isComplete: boolean }[] {
  const origLen = origWords.length;
  const results: { chunk: string[]; isComplete: boolean }[] = [];

  let pos = 0;

  while (pos < typedWords.length) {
    // Skip a boundary ¶ between repetitions (not counted as mistake)
    if (typedWords[pos] === PARAGRAPH_SENTINEL && results.length > 0) {
      pos++;
      continue;
    }

    // Greedily consume up to origLen words for this repetition.
    // Stop early if we hit a ¶ that is NOT in the original at that position
    // (i.e. an extra paragraph break typed by the student between reps).
    const chunk: string[] = [];
    let origIdx = 0;

    while (pos < typedWords.length && origIdx < origLen) {
      const tw = typedWords[pos]!;

      // If typed word is ¶ but original position is not ¶ → boundary sentinel
      // between reps typed early — stop this rep here.
      if (
        tw === PARAGRAPH_SENTINEL &&
        origWords[origIdx] !== PARAGRAPH_SENTINEL
      ) {
        break;
      }

      chunk.push(tw);
      pos++;
      origIdx++;
    }

    const isComplete = origIdx >= origLen;
    results.push({ chunk, isComplete });
  }

  return results;
}

// ─── main engine ──────────────────────────────────────────────────────────────

export function evaluateTypingTest(
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

  // ── prepare ────────────────────────────────────────────────────────────────
  const preparedOriginal = preparePassage(correctTranscription);
  const hasParagraphs = preparedOriginal.includes(PARAGRAPH_SENTINEL);
  const preparedTyped = prepareTyped(typed, hasParagraphs);

  const origWords = preparedOriginal.split(/\s+/);

  // Strip trailing ¶ from typed (Enter pressed after last rep = not a mistake)
  const preparedTypedClean = preparedTyped.replace(/(\s*¶\s*)+$/, "").trim();
  const typedWords = preparedTypedClean.split(/\s+/);

  // ── split typed into per-repetition chunks ─────────────────────────────────
  const repChunks = splitIntoRepetitions(origWords, typedWords);
  const repeatCount = repChunks.length || 1;

  // ── score each repetition ──────────────────────────────────────────────────
  const repetitions: RepetitionResult[] = [];
  let totalFullMistakes = 0;
  let totalHalfMistakes = 0;
  const flatDiff: DiffToken[] = [];

  for (let ri = 0; ri < repChunks.length; ri++) {
    const { chunk, isComplete } = repChunks[ri]!;

    // Always diff against full original.
    // Incomplete last rep (ri > 0): trim trailing delete ops AFTER diff so
    // untyped tail is forgiven without misaligning word positions mid-rep.
    // First rep incomplete → keep all ops (penalize missing tail).
    const ops = wordDiff(origWords, chunk);
    const trimmedOps = !isComplete && ri > 0 ? trimTrailingDeletes(ops) : ops;
    const { diff, fullMistakes, halfMistakes } = opsToDiff(trimmedOps);

    // Extra spaces within this rep's typed chunk
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

    // Append to flat diff with a separator between reps
    if (ri > 0) flatDiff.push({ type: "paragraph" });
    flatDiff.push(...repDiff);
  }

  // ── scoring (Rajasthan HC) ─────────────────────────────────────────────────
  const penalties = 0;
  const grossErrors = totalFullMistakes + totalHalfMistakes / 2 + penalties;
  const errorStrokes = grossErrors * 5;
  const netStrokes = Math.max(0, totalStrokes - errorStrokes);
  const durationMinutes = Math.max(durationSeconds / 60, 0.0001);

  const grossWpm = parseFloat((totalStrokes / 5 / durationMinutes).toFixed(2));
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

export function compareTranscriptions(
  correct: string,
  typed: string,
): DiffToken[] {
  if (!typed?.trim()) return [];
  const { diff } = evaluateTypingTest(correct, typed, 300);
  return diff;
}
