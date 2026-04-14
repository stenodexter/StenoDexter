export type TypingEvaluation = {
  totalStrokes: number;
  errorStrokes: number;
  netStrokes: number;
  grossWpm: number;
  netWpm: number;
  fullMistakes: number;
  halfMistakes: number;
  grossErrors: number;
  accuracy: number;
  netDph: number;
  marksOutOf50: number;
  marksOutOf25: number;
};

export function evaluateTypingTest(
  correct: string,
  typed: string,
  durationSeconds: number,
): TypingEvaluation {
  const correctWords = correct.trim().split(/\s+/);
  const typedWords = typed.trim().split(/\s+/);

  let fullMistakes = 0;
  let halfMistakes = 0;

  const maxLen = Math.max(correctWords.length, typedWords.length);

  for (let i = 0; i < maxLen; i++) {
    const c = correctWords[i];
    const t = typedWords[i];

    if (!c && t) {
      fullMistakes++;
      continue;
    }
    if (c && !t) {
      fullMistakes++;
      continue;
    }

    if (c === t) continue;

    const normalize = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalize(c!) === normalize(t!)) {
      halfMistakes++;
    } else {
      fullMistakes++;
    }
  }

  const grossErrors = fullMistakes + halfMistakes / 2;
  const errorStrokes = grossErrors * 5;

  const totalStrokes = typedWords.join("").length + typedWords.length - 1;

  const totalCharsTyped = typed.length;
  const netStrokes = Math.max(0, totalCharsTyped - errorStrokes);

  const durationMinutes = durationSeconds / 60;
  const grossWpm = Math.round(totalCharsTyped / 5 / durationMinutes);
  const netWpm = Math.round(netStrokes / 5 / durationMinutes);

  const netDph = (netStrokes / durationMinutes) * 60;
  const marksOutOf50 = Math.min(50, (20 / 8000) * netDph);
  const marksOutOf25 = marksOutOf50 / 2;

  const accuracy =
    totalCharsTyped > 0 ? Math.round((netStrokes / totalCharsTyped) * 100) : 0;

  return {
    totalStrokes: totalCharsTyped,
    errorStrokes,
    netStrokes,
    grossWpm,
    netWpm,
    fullMistakes,
    halfMistakes,
    grossErrors,
    accuracy,
    netDph: Math.round(netDph),
    marksOutOf50: parseFloat(marksOutOf50.toFixed(2)),
    marksOutOf25: parseFloat(marksOutOf25.toFixed(2)),
  };
}
