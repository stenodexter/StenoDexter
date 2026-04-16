// components/common/typing-test/typing-test-results-page.tsx
"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { ChevronLeft, AlignLeft } from "lucide-react";
import { format } from "date-fns";
import type { DiffToken } from "~/server/services/typing-scoring.service";

// ─── types ────────────────────────────────────────────────────────────────────

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
    grossErrors: number; // stored ×2 in DB
    errorStrokes: number;
    totalStrokes: number;
    netStrokes: number;
    grossWpm: number;
    netWpm: number;
    accuracy: number;
    netDph: number;
    marksOutOf50: number; // stored ×100 in DB
    transcriptionTimeSeconds: number;
  };
  diff: DiffToken[];
};

// ─── diff renderer ────────────────────────────────────────────────────────────

function DiffView({ diff }: { diff: DiffToken[] }) {
  if (!diff?.length)
    return (
      <p className="text-muted-foreground text-sm italic">
        No content submitted.
      </p>
    );

  return (
    <p
      className="break-words select-none"
      style={{
        fontFamily: "'Calibri', 'Carlito', 'Liberation Sans', sans-serif",
        fontSize: "18px",
        lineHeight: "2.2",
      }}
    >
      {diff.map((token, i) => {
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
    </p>
  );
}

// ─── stat pill ────────────────────────────────────────────────────────────────

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

// ─── attempt card ─────────────────────────────────────────────────────────────

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

  // decode stored values
  const grossErrors = entry.result.grossErrors / 2; // stored ×2
  const marksOutOf50 = entry.result.marksOutOf50 / 100; // stored ×100
  const marksOutOf25 = marksOutOf50 / 2;
  const correctWords = entry.test.correctTranscription
    .trim()
    .split(/\s+/).length;
  const typedWords =
    entry.attempt.answerFinal?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const mins = Math.floor(entry.result.transcriptionTimeSeconds / 60);
  const secs = entry.result.transcriptionTimeSeconds % 60;
  const durationLabel = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;

  return (
    <div
      ref={cardRef}
      className={`bg-card overflow-hidden rounded-xl border transition-all duration-700 ${
        flashing ? "ring-primary bg-primary/5 ring-2 ring-offset-2" : ""
      }`}
    >
      {/* header */}
      <div
        className="hover:bg-muted/20 cursor-pointer px-5 py-4 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {format(
                new Date(entry.attempt.submittedAt),
                "do MMMM yyyy, hh:mm a",
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
            </div>
          </div>
          <span className="text-muted-foreground text-xs">
            {expanded ? "▲" : "▼"}
          </span>
        </div>

        {/* stats grid */}
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          <Stat label="Total Strokes" value={entry.result.totalStrokes} />
          <Stat
            label="Error Strokes"
            value={entry.result.errorStrokes}
            highlight="red"
          />
          <Stat
            label="Net Strokes"
            value={entry.result.netStrokes}
            highlight="green"
          />
          <Stat
            label="Full Mistakes"
            value={entry.result.fullMistakes}
            highlight="red"
          />
          <Stat
            label="Half Mistakes"
            value={entry.result.halfMistakes}
            highlight="amber"
          />
          <Stat
            label="Gross Errors"
            value={grossErrors.toFixed(1)}
            highlight="red"
          />
          <Stat label="Net DPH" value={entry.result.netDph} />
          <Stat
            label="Marks / 50"
            value={marksOutOf50.toFixed(2)}
            highlight="green"
          />
        </div>

        {/* second row */}
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-4">
          <Stat label="Gross WPM" value={entry.result.grossWpm} />
          <Stat label="Net WPM" value={entry.result.netWpm} highlight="green" />
          <Stat
            label="Accuracy"
            value={`${entry.result.accuracy}%`}
            highlight={
              entry.result.accuracy >= 90
                ? "green"
                : entry.result.accuracy >= 70
                  ? "amber"
                  : "red"
            }
          />
          <Stat
            label="Marks / 25"
            value={marksOutOf25.toFixed(2)}
            highlight="green"
          />
        </div>
      </div>

      {/* diff */}
      {expanded && (
        <div className="space-y-4 border-t px-5 py-5">
          {/* legend */}
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
              <span className="text-sm font-bold text-red-500">word</span> —
              Missing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-sm text-red-500 line-through">word</span> —
              Extra
            </span>
            <span className="flex items-center gap-1.5">
              <span className="mx-0.5 rounded-sm bg-orange-700/50 p-0.5 text-sm text-orange-500">
                ␣
              </span>{" "}
              — Extra space
            </span>
          </div>
          <Separator />
          <div className="text-muted-foreground mb-2 grid grid-cols-2 gap-4 text-xs">
            <span>
              Total words: <strong>{correctWords}</strong>
            </span>
            <span>
              Typed words: <strong>{typedWords}</strong>
            </span>
          </div>
          <DiffView diff={entry.diff} />
        </div>
      )}
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

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

// ─── result service additions needed ─────────────────────────────────────────
// Add to typing-attempt.service.ts:
//
// async getResult(attemptId: string, userId: string) { ... }
// async getResultAdmin(attemptId: string) { ... }
// async getUserAttempts(testId: string, userId: string) { ... }
// ─────────────────────────────────────────────────────────────────────────────

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
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
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
