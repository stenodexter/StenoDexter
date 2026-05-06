"use client";

import { useRef, useState, useEffect, useMemo } from "react";
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
  AlignLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { env } from "~/env";
import { resultRouter } from "~/server/api/routers/results/results.router";

// ─── types ────────────────────────────────────────────────────────────────────

type DiffToken = {
  original?: string;
  typed?: string;
  type:
    | "correct"
    | "replace"
    | "insert"
    | "delete"
    | "extra_space"
    | "paragraph"; // ✅ paragraph sentinel — replaces old "paragraph_break"
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
    el.paused ? void el.play() : el.pause();
  };
  const seek = (val: number[]) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = val[0] ?? 0;
    setCurrent(val[0] ?? 0);
  };
  const forward = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.min(el.currentTime + 5, duration);
    setCurrent(el.currentTime);
  };
  const backward = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(el.currentTime - 5, 0);
    setCurrent(el.currentTime);
  };
  const cycleSpeed = () => {
    const el = audioRef.current;
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1;
    setSpeed(next);
    if (el) el.playbackRate = next;
  };

  return (
    <div className="bg-card space-y-3 rounded-xl border px-5 py-4">
      <div className="flex items-center gap-2">
        <Volume2 className="text-primary h-4 w-4" />
        <p className="text-sm font-semibold">Explanation Session Audio</p>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {fmtTime(current)} / {fmtTime(duration)}
        </Badge>
      </div>
      <Slider
        min={0}
        max={duration || 1}
        step={0.5}
        value={[current]}
        onValueChange={seek}
        className="w-full"
      />
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground h-8 w-8 p-2 text-xs"
          onClick={backward}
          title="-5 seconds"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-xs">-5</span>
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
          size="icon"
          className="text-muted-foreground h-8 w-8 p-2 text-xs"
          onClick={forward}
          title="+5 seconds"
        >
          +5
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs tabular-nums"
          onClick={cycleSpeed}
        >
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
      href={`${env.NEXT_PUBLIC_APP_URL}/viewer?file=${encodeURIComponent(url)}`}
      target="_blank"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors ${cls}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-sm font-medium">{label}</span>
      <span className="ml-auto text-xs opacity-60">Open ↗</span>
    </a>
  );
}

// ─── Diff renderer ────────────────────────────────────────────────────────────

function DiffView({ diff }: { diff: DiffToken[] }) {
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
        // ✅ Correct paragraph break — student pressed Enter at right place
        if (token.type === "paragraph") return <br key={i} />;

        // ✅ Missing paragraph break — student skipped Enter (shown as delete)
        if (token.type === "delete" && token.original === "¶")
          return (
            <span
              key={i}
              className="mx-1 rounded-sm bg-red-500/20 px-1.5 py-0.5 text-sm font-bold text-red-500"
              title="Paragraph break missing — press Enter here"
            >
              ¶
            </span>
          );

        // ✅ Extra paragraph break — student pressed Enter where not needed
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

// ─── diff legend (shared) ─────────────────────────────────────────────────────

function DiffLegend() {
  return (
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
        <span className="text-sm font-bold text-red-500">word</span>— Missing
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-sm text-red-500 line-through">word</span>— Extra
      </span>
      <span className="flex items-center gap-1.5">
        <span className="mx-0.5 rounded-xs bg-orange-700/50 p-0.5 text-sm text-orange-500 dark:text-orange-400">
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

// ─── Attempt card ─────────────────────────────────────────────────────────────

function AttemptCard({
  entry,
  index,
  highlight = false,
  isAdmin = false,
  totalWords,
}: {
  entry: AttemptResult;
  index: number;
  totalWords: number;
  highlight?: boolean;
  isAdmin?: boolean;
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

  return (
    <div
      ref={cardRef}
      className={`bg-card overflow-hidden rounded-xl border transition-all duration-700 ${
        flashing ? "ring-primary bg-primary/5 ring-2 ring-offset-2" : ""
      }`}
    >
      <div
        className="hover:bg-muted/20 relative flex cursor-pointer items-center px-5 py-4 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {format(
              new Date(entry.attempt.submittedAt),
              "do MMMM, yyyy, hh:mm a",
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge
              variant={
                entry.attempt.type === "assessment" ? "default" : "secondary"
              }
              className="text-[10px] capitalize"
            >
              {entry.attempt.type === "assessment" ? "test" : "practise"}
            </Badge>
            <Badge variant="outline" className="text-[10px] tabular-nums">
              {entry.speed.wpm} WPM
            </Badge>
          </div>
        </div>

        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-4">
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums">{totalWords}</p>
            <p className="text-muted-foreground text-[10px] uppercase">
              Matter Words
            </p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums">{wordCount}</p>
            <p className="text-muted-foreground text-[10px] uppercase">
              Typed Words
            </p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="text-center">
            <p className="text-lg font-bold text-red-500 tabular-nums">
              {entry.result.mistakes}
            </p>
            <p className="text-muted-foreground text-[10px] uppercase">
              Mistakes
            </p>
          </div>
        </div>

        <div className="ml-auto">
          <span className="text-muted-foreground text-xs">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t px-5 py-5">
          <DiffLegend />
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

// ─── inner components ─────────────────────────────────────────────────────────

function UserResultsInner({
  testId,
  highlightId,
  testData,
}: {
  testId: string;
  highlightId: string | null;
  testData: any;
}) {
  const { data: attemptsData, isLoading: attemptsLoading } =
    trpc.user.getAttemptsPaginated.useQuery(
      { page: 0, limit: 50, testId },
      { staleTime: 30_000 },
    );

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

  return (
    <ResultsBody
      results={results}
      isLoading={attemptsLoading}
      testData={testData}
      highlightId={highlightId}
      isAdmin={false}
    />
  );
}

function AdminResultsInner({
  testId,
  userId,
  highlightId,
  testData,
}: {
  testId: string;
  userId: string;
  highlightId: string | null;
  testData: any;
}) {
  const { data: attemptsData, isLoading: attemptsLoading } =
    trpc.user.getAttemptsPaginatedAdmin.useQuery(
      { page: 0, limit: 50, userId, testId },
      { staleTime: 30_000 },
    );

  const attemptIds: string[] = attemptsLoading
    ? []
    : (attemptsData?.data ?? [])
        .map((a: any) => a.attemptId as string)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

  const resultQueries = trpc.useQueries((t) =>
    attemptIds.map((id) =>
      t.result.getResultAdmin({ attemptId: id }, { enabled: !!id }),
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

  return (
    <ResultsBody
      results={results}
      isLoading={attemptsLoading}
      testData={testData}
      highlightId={highlightId}
      isAdmin={true}
    />
  );
}

// ─── shared results body ──────────────────────────────────────────────────────

function ResultsBody({
  results,
  isLoading,
  testData,
  highlightId,
  isAdmin,
}: {
  results: AttemptResult[];
  isLoading: boolean;
  testData: any;
  highlightId: string | null;
  isAdmin: boolean;
}) {
  const hasSolutionAudio = !!testData?.solutionAudioUrl;
  const hasMatter = !!testData?.matterPdfUrl;
  const hasOutline = !!testData?.outlinePdfUrl;
  const hasResources = hasSolutionAudio || hasMatter || hasOutline;

  const words = useMemo(
    () => testData?.correctAnswer?.trim().split(/\s+/) ?? [],
    [testData?.correctAnswer],
  );

  if (isLoading) return <PageSkeleton />;

  return (
    <>
      {results.length > 0 && hasResources && (
        <section className="space-y-3">
          {hasSolutionAudio && (
            <SolutionAudio url={testData.solutionAudioUrl!} />
          )}
          {(hasMatter || hasOutline) && (
            <div
              className={`grid gap-3 ${hasMatter && hasOutline ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {hasMatter && (
                <PdfCard
                  label="Matter"
                  url={testData.matterPdfUrl!}
                  icon={FileText}
                  accent="violet"
                />
              )}
              {hasOutline && (
                <PdfCard
                  label="Outlines"
                  url={testData.outlinePdfUrl!}
                  icon={FilePlus}
                  accent="blue"
                />
              )}
            </div>
          )}
          <Separator />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlignLeft className="text-muted-foreground h-4 w-4" />
          <h2 className="text-sm font-semibold">
            {isAdmin ? "Student's Attempts" : "Your Attempts"}
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
            {!isAdmin && (
              <>
                <p className="text-muted-foreground/60 mt-1 text-xs">
                  Complete the test to see your results here.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/user">Find a test</Link>
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((entry, i) => (
              <AttemptCard
                key={entry.attempt.id}
                entry={entry}
                index={i}
                totalWords={words.length}
                highlight={entry.attempt.id === highlightId}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

export function TestResultsPage({
  userId,
  isAdmin = false,
}: {
  userId: string;
  isAdmin?: boolean;
}) {
  const params = useParams<{ testId: string }>();
  const searchParams = useSearchParams();
  const { testId } = params;
  const router = useRouter();
  const highlightId = searchParams.get("attemptId");

  const { data: testData, isLoading: testLoading } = trpc.test.get.useQuery(
    { id: testId },
    { staleTime: 60_000 },
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mb-2 -ml-2"
          onClick={() => {
            if (!isAdmin) router.push("/user/tests");
            else router.push("/admin/tests");
          }}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Tests
        </Button>
        {testLoading ? (
          <Skeleton className="h-7 w-64" />
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight">
              {testData?.title}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {isAdmin ? "Viewing student attempts" : "Your attempts"}
            </p>
          </>
        )}
      </div>

      {isAdmin ? (
        <AdminResultsInner
          testId={testId}
          userId={userId}
          highlightId={highlightId}
          testData={testData}
        />
      ) : (
        <UserResultsInner
          testId={testId}
          highlightId={highlightId}
          testData={testData}
        />
      )}
    </div>
  );
}
