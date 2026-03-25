"use client";

// ─── app/(user)/test/[testId]/results/page.tsx ───────────────────────────────

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Slider } from "~/components/ui/slider";
import {
  ChevronLeft,
  FileText,
  FilePlus,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  CheckCircle2,
  XCircle,
  AlignLeft,
} from "lucide-react";
import { format } from "date-fns";

// ─── types ────────────────────────────────────────────────────────────────────

// Matches ScoringEngine.DiffToken exactly
type DiffToken = {
  original?: string;
  typed?: string;
  type: "correct" | "replace" | "insert" | "delete";
};

type AttemptResult = {
  attempt: {
    id: string;
    type: "assessment" | "practice";
    submittedAt: Date;
    answerFinal: string | null;
  };
  speed: { id: string; wpm: number; audioUrl: string };
  result: {
    accuracy: number;
    wpm: number;
    mistakes: number;
    score: number;
  };
  diff: DiffToken[];
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  const m = Math.floor(s / 60),
    sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── Solution audio player ────────────────────────────────────────────────────

function SolutionAudio({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  };

  const seek = (val: number[]) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = val[0] ?? 0;
    setCurrent(val[0] ?? 0);
  };

  const cycleSpeed = () => {
    const el = audioRef.current;
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length] ?? 1;
    setSpeed(next);
    if (el) el.playbackRate = next;
  };

  const replay = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play();
  };

  return (
    <div className="bg-card space-y-3 rounded-xl border px-5 py-4">
      <div className="flex items-center gap-2">
        <Volume2 className="text-primary h-4 w-4" />
        <p className="text-sm font-semibold">Solution Audio</p>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {fmtTime(current)} / {fmtTime(duration)}
        </Badge>
      </div>

      {/* Waveform-style progress slider */}
      <Slider
        min={0}
        max={duration || 1}
        step={0.5}
        value={[current]}
        onValueChange={seek}
        className="w-full"
      />

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={replay}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={toggle}
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs tabular-nums"
          onClick={cycleSpeed}
        >
          <FastForward className="h-3.5 w-3.5" />
          {speed}×
        </Button>
      </div>

      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
      />
    </div>
  );
}

// ─── PDF link card ────────────────────────────────────────────────────────────

function PdfCard({
  label,
  url,
  icon: Icon,
  accent,
}: {
  label: string;
  url: string;
  icon: React.ElementType;
  accent: "violet" | "blue";
}) {
  const cls =
    accent === "violet"
      ? "border-violet-400/40 hover:bg-violet-500/5 text-violet-600 dark:text-violet-400"
      : "border-blue-400/40 hover:bg-blue-500/5 text-blue-600 dark:text-blue-400";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors ${cls}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-sm font-medium">{label}</span>
      <span className="ml-auto text-xs opacity-60">Open ↗</span>
    </a>
  );
}

// ─── Diff renderer ────────────────────────────────────────────────────────────
// correct  → plain text
// wrong    → <span strikethrough (written)> <sup correct> — like the image shows
// missing  → underlined in red (word that should have been there)
// extra    → light strikethrough (written but shouldn't be)

// Punctuation that should attach to the previous word with no space before it
const ATTACH_LEFT = new Set([
  ",",
  ".",
  "!",
  "?",
  ";",
  ":",
  ")",
  "]",
  "}",
  "'s",
  "'",
]);
const ATTACH_RIGHT = new Set(["(", "[", "{"]);

function needsSpaceBefore(
  token: DiffToken,
  prev: DiffToken | undefined,
): boolean {
  const text = token.type === "insert" ? token.typed : token.original;
  if (!text) return false;
  if (ATTACH_LEFT.has(text)) return false;
  if (!prev) return false;
  const prevText = prev.type === "insert" ? prev.typed : prev.original;
  if (prevText && ATTACH_RIGHT.has(prevText)) return false;
  return true;
}

function DiffView({ diff }: { diff: DiffToken[] }) {
  if (!diff || diff.length === 0)
    return (
      <p className="text-muted-foreground text-sm italic">
        No content submitted.
      </p>
    );

  return (
    <p
      className="text-[20px] break-words"
      style={{
        fontFamily: "'Calibri', 'Carlito', 'Liberation Sans', sans-serif",
        lineHeight: "2.2",
      }}
    >
      {diff.map((token, i) => {
        const prev = diff[i - 1];
        const space = needsSpaceBefore(token, prev) ? " " : "";

        if (token.type === "correct") {
          return (
            <span key={i}>
              {space}
              {token.original}
            </span>
          );
        }

        if (token.type === "replace") {
          return (
            <span key={i}>
              {space}
              <span className="text-red-500 line-through decoration-red-500 decoration-2">
                {token.typed}
              </span>{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {token.original}
              </span>
            </span>
          );
        }

        if (token.type === "delete") {
          return (
            <span
              key={i}
              className="font-bold text-blue-500 dark:text-blue-400"
            >
              {space}
              {token.original}
            </span>
          );
        }

        if (token.type === "insert") {
          return (
            <span
              key={i}
              className="text-amber-500 line-through decoration-amber-500 decoration-2"
            >
              {space}
              {token.typed}
            </span>
          );
        }

        return null;
      })}
    </p>
  );
}

// ─── Attempt card ─────────────────────────────────────────────────────────────

function AttemptCard({
  entry,
  index,
  correctAnswer,
  highlight = false,
}: {
  entry: AttemptResult;
  index: number;
  correctAnswer: string;
  highlight?: boolean;
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

  const wordCount =
    entry.attempt.answerFinal?.trim().split(/\s+/).filter(Boolean).length ?? 0;

  const accuracyColor =
    entry.result.accuracy >= 90
      ? "text-emerald-600 dark:text-emerald-400"
      : entry.result.accuracy >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-500";

  return (
    <div
      ref={cardRef}
      className={`bg-card overflow-hidden rounded-xl border transition-all duration-700 ${
        flashing ? "ring-primary bg-primary/5 ring-2 ring-offset-2" : ""
      }`}
    >
      {/* Header — always visible */}
      <div
        className="hover:bg-muted/20 flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Date & time */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {format(
              new Date(entry.attempt.submittedAt),
              "dd MMM yyyy, hh:mm a",
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge
              variant={
                entry.attempt.type === "assessment" ? "default" : "secondary"
              }
              className="text-[10px] capitalize"
            >
              {entry.attempt.type}
            </Badge>
            <Badge variant="outline" className="text-[10px] tabular-nums">
              {entry.speed.wpm} WPM
            </Badge>
            <span className="text-muted-foreground text-xs">
              {wordCount} words
            </span>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="text-center">
            <p className={`text-lg font-bold tabular-nums ${accuracyColor}`}>
              {entry.result.accuracy}%
            </p>
            <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
              Accuracy
            </p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="text-center">
            <p className="text-lg font-bold text-red-500 tabular-nums">
              {entry.result.mistakes}
            </p>
            <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
              Mistakes
            </p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums">
              {wordCount - entry.result.mistakes > 0
                ? wordCount - entry.result.mistakes
                : 0}
            </p>
            <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
              Correct
            </p>
          </div>
        </div>

        <span className="text-muted-foreground ml-2 text-xs">
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded: diff view */}
      {expanded && (
        <div className="space-y-4 border-t px-5 py-5">
          {/* Legend */}
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-foreground/70 h-2 w-2 rounded-full" />
              Correct
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
              <span className="text-sm font-bold text-blue-500">word</span>—
              Missing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-sm text-amber-500 line-through">word</span>—
              Extra
            </span>
          </div>

          <Separator />

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
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
      <Separator />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ─── main component (shared between user + admin) ─────────────────────────────

interface TestResultsPageProps {
  /** The user whose results to show. For user view = ctx.user.id (passed from server). For admin = from URL param. */
  userId: string;
  isAdmin?: boolean;
}

export function TestResultsPage({
  userId,
  isAdmin = false,
}: TestResultsPageProps) {
  const params = useParams<{ testId: string }>();
  const searchParams = useSearchParams();
  const { testId } = params;
  const router = useRouter();

  // ?attemptId=xxx — scroll to and highlight that attempt
  const highlightId = searchParams.get("attemptId");

  const { data: testData, isLoading: testLoading } = trpc.test.get.useQuery(
    { id: testId },
    { staleTime: 60_000 },
  );

  // Admin uses getAttemptsPaginatedAdmin, user uses getAttemptsPaginated
  const userAttemptsQuery = trpc.user.getAttemptsPaginated.useQuery(
    { page: 0, limit: 50, testId },
    { enabled: !isAdmin, staleTime: 30_000 },
  );
  const adminAttemptsQuery = trpc.user.getAttemptsPaginatedAdmin.useQuery(
    { page: 0, limit: 50, userId, testId },
    { enabled: isAdmin, staleTime: 30_000 },
  );

  const attemptsData = isAdmin
    ? adminAttemptsQuery.data
    : userAttemptsQuery.data;
  const attemptsLoading = isAdmin
    ? adminAttemptsQuery.isLoading
    : userAttemptsQuery.isLoading;

  const isLoading = testLoading || attemptsLoading;

  // Only extract IDs once attempts have loaded — prevents useQueries firing with undefined
  const attemptIds: string[] = attemptsLoading
    ? []
    : (attemptsData?.data ?? [])
        .map((a: any) => a.attemptId as string)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

  const resultQueries = trpc.useQueries((t) =>
    attemptIds.map((id) =>
      t.result.getResult({ attemptId: id }, { enabled: !!id }),
    ),
  );

  const results: AttemptResult[] = resultQueries
    .filter((q) => q.data != null)
    .map((q) => q.data as unknown as AttemptResult)
    .sort(
      (a, b) =>
        new Date(b.attempt.submittedAt).getTime() -
        new Date(a.attempt.submittedAt).getTime(),
    );

  const hasSolutionAudio = !!testData?.solutionAudioUrl;
  const hasMatter = !!testData?.matterPdfUrl;
  const hasOutline = !!testData?.outlinePdfUrl;
  const hasResources = hasSolutionAudio || hasMatter || hasOutline;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mb-2 -ml-2"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        {testLoading ? (
          <Skeleton className="h-7 w-64" />
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight">
              {testData?.title}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {isAdmin ? "Student attempt history" : "Your attempt history"}
            </p>
          </>
        )}
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : (
        <>
          {/* ── Resources ── */}
          {hasResources && (
            <section className="space-y-3">
              {hasSolutionAudio && (
                <SolutionAudio url={testData!.solutionAudioUrl!} />
              )}

              {(hasMatter || hasOutline) && (
                <div
                  className={`grid gap-3 ${hasMatter && hasOutline ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  {hasMatter && (
                    <PdfCard
                      label="Matter PDF"
                      url={testData!.matterPdfUrl!}
                      icon={FileText}
                      accent="violet"
                    />
                  )}
                  {hasOutline && (
                    <PdfCard
                      label="Outline PDF"
                      url={testData!.outlinePdfUrl!}
                      icon={FilePlus}
                      accent="blue"
                    />
                  )}
                </div>
              )}

              <Separator />
            </section>
          )}

          {/* ── Attempts ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <AlignLeft className="text-muted-foreground h-4 w-4" />
              <h2 className="text-sm font-semibold">
                Your Attempts
                <span className="text-muted-foreground ml-2 font-normal">
                  ({results.length})
                </span>
              </h2>
            </div>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                <AlignLeft className="text-muted-foreground/30 mb-3 h-7 w-7" />
                <p className="text-muted-foreground text-sm font-medium">
                  No attempts yet
                </p>
                <p className="text-muted-foreground/60 mt-1 text-xs">
                  Complete the test to see your results here.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/user">Find a test</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((entry, i) => (
                  <AttemptCard
                    key={entry.attempt.id}
                    entry={entry}
                    index={i}
                    correctAnswer={testData?.correctAnswer ?? ""}
                    highlight={entry.attempt.id === highlightId}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
