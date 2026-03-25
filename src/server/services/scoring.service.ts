export type DiffType = "correct" | "replace" | "insert" | "delete";

export type DiffToken = {
  original?: string;
  typed?: string;
  type: DiffType;
};

function tokenize(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+|\s|[^\s\p{L}\p{N}]/gu) ?? [];
}

// Exact match only, case-sensitive.
function isMatch(a: string, b: string): boolean {
  return a === b;
}

function lcsAlign(A: string[], B: string[]): DiffToken[] {
  const m = A.length;
  const n = B.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (isMatch(A[i - 1]!, B[j - 1]!)) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  const result: DiffToken[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && isMatch(A[i - 1]!, B[j - 1]!)) {
      result.push({ original: A[i - 1], typed: B[j - 1], type: "correct" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      result.push({ typed: B[j - 1], type: "insert" });
      j--;
    } else {
      result.push({ original: A[i - 1], type: "delete" });
      i--;
    }
  }

  result.reverse();

  const final: DiffToken[] = [];
  let k = 0;

  while (k < result.length) {
    const cur = result[k]!;
    const next = result[k + 1];

    if (cur.type === "delete" && next?.type === "insert") {
      final.push({
        original: cur.original,
        typed: next.typed,
        type: "replace",
      });
      k += 2;
    } else {
      final.push(cur);
      k++;
    }
  }

  return final;
}

export default class ScoringEngine {
  compare(original: string, typed: string): DiffToken[] {
    typed = typed.trim();
    original = original.trim();
    const A = tokenize(original);
    const B = tokenize(typed);
    return lcsAlign(A, B);
  }

  evaluate(original: string, typed: string, durationSeconds: number) {
    typed = typed.trim();
    original = original.trim();

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
