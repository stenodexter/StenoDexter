// components/common/typing-test/typing-test-results-page.tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { ChevronLeft, AlignLeft } from "lucide-react";
import { format } from "date-fns";
import type { RepetitionResult } from "~/server/services/typing-scoring.service";
import { MarksCalculationDialog } from "~/components/utils/marks-calculation-dialog";
import type { DiffToken } from "~/server/services/scoring.service";

type ExtendedDiffToken = DiffToken & {
  type:
    | "correct"
    | "replace"
    | "insert"
    | "delete"
    | "extra_space"
    | "paragraph";
};

type TypingAttemptResult = {
  attempt: {
    id: string;
    type: "test" | "practice";
    submittedAt: Date;
    answerFinal: string | null;
  };
  test: {
    id: string;
    title: string;
    correctTranscription: string;
    durationSeconds: number;
  };
  result: {
    fullMistakes: number;
    halfMistakes: number;
    grossErrors: number;
    errorStrokes: number;
    totalStrokes: number;
    netStrokes: number;
    grossWpm: number;
    netWpm: number;
    accuracy: number;
    netDph: number;
    marksOutOf50: number;
    marksOutOf25: number;
    transcriptionTimeSeconds: number;
    repeatCount: number;
    repetitions: RepetitionResult[];
  };
  diff: ExtendedDiffToken[];
};

// ─── Legend ───────────────────────────────────────────────────────────────────

function DiffLegend() {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
      <span className="flex items-center gap-1.5">
        <span className="bg-foreground/70 h-2 w-2 rounded-full" /> Correct
      </span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-medium text-red-500 line-through">
          wrong
        </span>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
          correct
        </span>
        — Substitution
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-red-500">word</span> — Missing
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-sm text-red-500 line-through">word</span> — Extra
      </span>
      <span className="flex items-center gap-1.5">
        <span className="mx-0.5 rounded-sm bg-orange-700/50 p-0.5 text-sm text-orange-500">
          ␣
        </span>
        — Extra space
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded-sm bg-red-500/20 px-1 text-sm font-bold text-red-500">
          ¶
        </span>
        — Missing paragraph break
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded-sm bg-orange-500/20 px-1 text-sm font-bold text-orange-500 line-through">
          ¶
        </span>
        — Extra paragraph break
      </span>
    </div>
  );
}

// ─── DiffView ─────────────────────────────────────────────────────────────────

function DiffView({ diff }: { diff: ExtendedDiffToken[] }) {
  if (!diff?.length)
    return (
      <p className="text-muted-foreground text-sm italic">
        No content submitted.
      </p>
    );

  return (
    <div
      className="break-words select-none"
      style={{
        fontFamily: "'Calibri', 'Carlito', 'Liberation Sans', sans-serif",
        fontSize: "18px",
        lineHeight: "2.2",
      }}
    >
      {diff.map((token, i) => {
        if (token.type === "paragraph") return <br key={i} />;
        if (token.type === "delete" && token.original === "¶")
          return (
            <span
              key={i}
              className="mx-1 rounded-sm bg-red-500/20 px-1.5 py-0.5 text-sm font-bold text-red-500"
              title="Paragraph break missing"
            >
              ¶
            </span>
          );
        if (token.type === "insert" && token.typed === "¶")
          return (
            <span
              key={i}
              className="mx-1 rounded-sm bg-orange-500/20 px-1.5 py-0.5 text-sm font-bold text-orange-500 line-through"
              title="Paragraph break not required here"
            >
              ¶
            </span>
          );
        if (token.type === "correct")
          return <span key={i}>{token.original}</span>;
        if (token.type === "replace")
          return (
            <span key={i}>
              <span className="text-red-500 line-through decoration-red-500 decoration-2">
                {token.typed}
              </span>{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {token.original}
              </span>
            </span>
          );
        if (token.type === "delete")
          return (
            <span key={i} className="font-extrabold text-red-500">
              {token.original}
            </span>
          );
        if (token.type === "insert")
          return (
            <span
              key={i}
              className="text-red-500 line-through decoration-red-500 decoration-2"
            >
              {token.typed}
            </span>
          );
        if (token.type === "extra_space")
          return (
            <span
              key={i}
              className="mx-0.5 rounded-sm bg-orange-700/50 p-0.5 text-sm text-orange-500 dark:text-orange-400"
              title="extra space"
            >
              ␣
            </span>
          );
        return null;
      })}
    </div>
  );
}

// ─── Stat box ─────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "red" | "green" | "amber";
}) {
  const color =
    highlight === "red"
      ? "text-red-500"
      : highlight === "green"
        ? "text-emerald-600 dark:text-emerald-400"
        : highlight === "amber"
          ? "text-amber-500"
          : "text-foreground";
  return (
    <div className="bg-muted/40 flex flex-col gap-1 rounded-lg px-4 py-3 text-center">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
    </div>
  );
}

// ─── RepetitionCard ───────────────────────────────────────────────────────────

function RepetitionCard({
  rep,
  totalReps,
}: {
  rep: RepetitionResult;
  totalReps: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalMistakes = rep.fullMistakes + rep.halfMistakes;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div
        className="hover:bg-muted/20 flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold">
            Repetition {rep.index}
            {totalReps > 1 && (
              <span className="text-muted-foreground font-normal">
                {" "}
                / {totalReps}
              </span>
            )}
          </span>
          {!rep.isComplete && (
            <Badge
              variant="outline"
              className="border-amber-500/40 text-[10px] text-amber-500"
            >
              Incomplete
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">
            {totalMistakes === 0 ? (
              <span className="font-medium text-emerald-500">✓ Perfect</span>
            ) : (
              <>
                <span className="font-medium text-red-500">
                  {rep.fullMistakes} full
                </span>
                {rep.halfMistakes > 0 && (
                  <span className="font-medium text-amber-500">
                    {" "}
                    · {rep.halfMistakes} half
                  </span>
                )}
              </>
            )}
          </span>
          <span className="text-muted-foreground text-xs">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-4">
          <DiffView diff={rep.diff as ExtendedDiffToken[]} />
        </div>
      )}
    </div>
  );
}

// ─── AttemptCard ──────────────────────────────────────────────────────────────

function AttemptCard({
  entry,
  index,
  highlight,
}: {
  entry: TypingAttemptResult;
  index: number;
  highlight: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(index === 0);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setExpanded(true);
      setFlashing(true);
      const off = setTimeout(() => setFlashing(false), 2500);
      return () => clearTimeout(off);
    }, 300);
    return () => clearTimeout(t);
  }, [highlight]);

  const correctWords = entry.test.correctTranscription
    .trim()
    .split(/\s+/)
    .filter((w) => w !== "¶").length;
  const typedWords =
    entry.attempt.answerFinal
      ?.trim()
      .split(/\s+/)
      .filter((w) => Boolean(w) && w !== "¶").length ?? 0;
  const mins = Math.floor(entry.result.transcriptionTimeSeconds / 60);
  const secs = entry.result.transcriptionTimeSeconds % 60;
  const durationLabel = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;

  const {
    fullMistakes,
    halfMistakes,
    marksOutOf50,
    grossWpm,
    netWpm,
    accuracy,
    repeatCount,
    repetitions,
  } = entry.result;

  return (
    <div
      ref={cardRef}
      className={`bg-card overflow-hidden rounded-xl border transition-all duration-700 ${flashing ? "ring-primary bg-primary/5 ring-2 ring-offset-2" : ""}`}
    >
      {/* ── header row ── */}
      <div
        className="hover:bg-muted/20 cursor-pointer px-5 py-4 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {format(
                new Date(entry.attempt.submittedAt),
                "do MMMM, yyyy, hh:mm a",
              )}
            </p>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  entry.attempt.type === "test" ? "default" : "secondary"
                }
                className="text-[10px] capitalize"
              >
                {entry.attempt.type}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {durationLabel}
              </span>
              {repeatCount > 1 && (
                <span className="text-muted-foreground text-xs">
                  · {repeatCount}× repetitions
                </span>
              )}
            </div>
          </div>
          <span className="text-muted-foreground text-xs">
            {expanded ? "▲" : "▼"}
          </span>
        </div>

        {/* ── stats grid ── */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <Stat label="Gross WPM" value={grossWpm} />
          <Stat label="Net WPM" value={netWpm} highlight="green" />
          <Stat label="Full Mistakes" value={fullMistakes} highlight="red" />
          <Stat label="Half Mistakes" value={halfMistakes} highlight="amber" />
          <Stat
            label="Accuracy"
            value={`${accuracy}%`}
            highlight={
              accuracy >= 90 ? "green" : accuracy >= 70 ? "amber" : "red"
            }
          />
          <Stat
            label="Marks / 50"
            value={(marksOutOf50 / 100).toFixed(2)}
            highlight="green"
          />
        </div>
      </div>

      {/* ── expanded diff section ── */}
      {expanded && (
        <div className="space-y-4 border-t px-5 py-5">
          <DiffLegend />
          <Separator />

          {/* Per-repetition cards */}
          {repetitions && repetitions.length > 1 ? (
            <div className="space-y-3">
              {repetitions.map((rep) => (
                <RepetitionCard
                  key={rep.index}
                  rep={rep}
                  totalReps={repetitions.length}
                />
              ))}
            </div>
          ) : (
            // Single rep or no repetitions data → flat diff view
            <DiffView diff={entry.diff} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-64" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TypingTestResultsPage({
  userId,
  isAdmin = false,
}: {
  userId: string;
  isAdmin?: boolean;
}) {
  const params = useParams<{ testId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { testId } = params;
  const highlightId = searchParams.get("attemptId");

  const { data: testData, isLoading: testLoading } =
    trpc.typingTest.manage.get.useQuery({ id: testId }, { staleTime: 60_000 });

  const { data: attemptsData, isLoading: attemptsLoading } = isAdmin
    ? trpc.typingTest.result.getUserAttemptsAdmin.useQuery(
        { testId, userId },
        { staleTime: 30_000 },
      )
    : trpc.typingTest.result.getUserAttempts.useQuery(
        { testId },
        { staleTime: 30_000 },
      );

  const attemptIds: string[] = attemptsLoading
    ? []
    : (attemptsData ?? []).map((a: { attemptId: string }) => a.attemptId);

  const resultQueries = trpc.useQueries((t) =>
    attemptIds.map((id) =>
      isAdmin
        ? t.typingTest.result.getResultAdmin(
            { attemptId: id },
            { enabled: !!id },
          )
        : t.typingTest.result.getResult({ attemptId: id }, { enabled: !!id }),
    ),
  );

  const results = resultQueries
    .filter((q) => q.data != null)
    .map((q) => q.data as unknown as TypingAttemptResult)
    .sort(
      (a, b) =>
        new Date(b.attempt.submittedAt).getTime() -
        new Date(a.attempt.submittedAt).getTime(),
    );

  const isLoading = testLoading || attemptsLoading;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 overflow-x-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground mb-2 -ml-2"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </Button>
          {testLoading ? (
            <Skeleton className="h-7 w-64" />
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                {testData?.title}
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {isAdmin ? "Student's attempts" : "Your attempts"}
              </p>
            </>
          )}
        </div>
        <div className="shrink-0 pt-8">
          <MarksCalculationDialog />
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <AlignLeft className="text-muted-foreground/30 mb-3 h-7 w-7" />
          <p className="text-muted-foreground text-sm font-medium">
            No attempts yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((entry, i) => (
            <AttemptCard
              key={entry.attempt.id}
              entry={entry}
              index={i}
              highlight={entry.attempt.id === highlightId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
