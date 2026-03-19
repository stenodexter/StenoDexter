"use client";

// ─── app/user/attempt/[attemptId]/_components/attempt-result-client.tsx ──────

import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { trpc } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import {
  Gauge,
  Target,
  AlertCircle,
  Trophy,
  FileText,
  ListChecks,
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  PlusCircle,
  Play,
  Pause,
  ChevronLeft,
  ArrowLeft,
} from "lucide-react";
import type { DiffToken } from "~/server/services/scoring.service";
import { useRouter } from "next/navigation"; // ✅ app router

// ─── Audio Waveform Player ────────────────────────────────────────────────────

const SPEEDS = [1, 1.5, 2] as const;
type Speed = (typeof SPEEDS)[number];

function AudioPlayer({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  useEffect(() => {
    const bars = 120;
    const data = Array.from({ length: bars }, (_, i) => {
      const base = Math.sin((i / bars) * Math.PI) * 0.6 + 0.1;
      const noise = Math.random() * 0.4;
      return Math.min(1, base + noise);
    });
    setWaveformData(data);
  }, [audioUrl]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const bars = waveformData.length;
    const barW = W / bars;
    const gap = barW * 0.25;
    const currentProgress = audio
      ? audio.currentTime / (audio.duration || 1)
      : 0;

    const probe = document.createElement("span");
    probe.className = "text-primary";
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
    const playedColor = getComputedStyle(probe).color || "#3b82f6";
    document.body.removeChild(probe);

    waveformData.forEach((amp, i) => {
      const x = i * barW + gap / 2;
      const w = Math.max(1.5, barW - gap);
      const barH = Math.max(3, amp * H * 0.9);
      const y = (H - barH) / 2;
      const played = i / bars < currentProgress;

      ctx.beginPath();
      ctx.roundRect(x, y, w, barH, 1.5);
      ctx.fillStyle = playedColor;
      ctx.globalAlpha = played ? 0.85 : 0.18;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }, [waveformData]);

  useEffect(() => {
    const loop = () => {
      const audio = audioRef.current;
      if (audio) {
        setCurrentTime(audio.currentTime);
      }
      drawWaveform();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawWaveform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => drawWaveform());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawWaveform]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (s: Speed) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardContent className="px-5 py-4">
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onEnded={() => setIsPlaying(false)}
        />
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 translate-x-px" />
            )}
          </Button>

          <div className="flex flex-col gap-1.5" style={{ flex: "0 0 85%" }}>
            <canvas
              ref={canvasRef}
              className="w-full cursor-pointer"
              style={{ height: "40px", display: "block" }}
              onClick={handleSeek}
            />
            <div
              className="flex justify-between tabular-nums"
              style={{ fontSize: "11px", color: "var(--muted-foreground)" }}
            >
              <span className="text-muted-foreground">{fmt(currentTime)}</span>
              <span className="text-muted-foreground">{fmt(duration)}</span>
            </div>
          </div>

          <div className="flex w-full flex-col items-center justify-end gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`h-8 w-full rounded-md px-2.5 text-xs font-medium transition-colors ${
                  speed === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Diff Renderer ────────────────────────────────────────────────────────────

function DiffView({ diff }: { diff: DiffToken[] }) {
  return (
    <div className="font-mono text-sm leading-8 tracking-wide break-words">
      {diff.map((token, i) => {
        if (token.type === "correct") {
          return (
            <span key={i} className="text-foreground">
              {token.original}{" "}
            </span>
          );
        }
        if (token.type === "replace") {
          return (
            <span
              key={i}
              className="mx-0.5 inline-flex flex-col items-start align-top"
            >
              <span className="bg-destructive/15 text-destructive decoration-destructive/50 rounded px-0.5 leading-5 line-through">
                {token.typed}
              </span>
              <span className="mt-0.5 rounded bg-emerald-500/10 px-0.5 text-[0.65rem] leading-4 text-emerald-600 dark:text-emerald-400">
                {token.original}
              </span>
            </span>
          );
        }
        if (token.type === "delete") {
          return (
            <span
              key={i}
              className="mx-0.5 inline-flex items-center rounded border border-dashed border-amber-400/40 bg-amber-500/10 px-1 text-[0.65rem] text-amber-600 dark:text-amber-400"
            >
              ↩&nbsp;{token.original}{" "}
            </span>
          );
        }
        if (token.type === "insert") {
          return (
            <span
              key={i}
              className="bg-destructive/10 text-destructive mx-0.5 inline-flex items-center rounded px-1 text-[0.65rem] line-through"
            >
              {token.typed}{" "}
            </span>
          );
        }
        return null;
      })}
    </div>
  );
}

// ─── Diff Legend ──────────────────────────────────────────────────────────────

function DiffLegend() {
  return (
    <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        Correct
      </span>
      <span className="flex items-center gap-1.5">
        <ArrowLeftRight className="text-destructive h-3 w-3" />
        Replaced
      </span>
      <span className="flex items-center gap-1.5">
        <XCircle className="h-3 w-3 text-amber-500" />
        Missed
      </span>
      <span className="flex items-center gap-1.5">
        <PlusCircle className="text-destructive h-3 w-3" />
        Extra
      </span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: "success" | "warning" | "danger";
}) {
  const valueClass =
    highlight === "success"
      ? "text-emerald-500"
      : highlight === "warning"
        ? "text-amber-500"
        : highlight === "danger"
          ? "text-destructive"
          : "text-foreground";

  return (
    <Card className="flex-1">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground mb-1 text-xs tracking-widest uppercase">
              {label}
            </p>
            <p className={`text-3xl font-bold tabular-nums ${valueClass}`}>
              {value}
            </p>
            {sub && (
              <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
            )}
          </div>
          <div className="bg-muted rounded-md p-2">
            <Icon className="text-muted-foreground h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function ResultSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <Skeleton className="h-4 w-16" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Separator />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex-1">
            <CardContent className="pt-5 pb-4">
              <Skeleton className="mb-2 h-4 w-16" />
              <Skeleton className="h-9 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

// ─── Inner — uses useSuspenseQuery ────────────────────────────────────────────

function ResultInner({ attemptId }: { attemptId: string }) {
  const router = useRouter(); // ✅ defined inside the component that uses it
  const [data] = trpc.result.getResult.useSuspenseQuery({ attemptId });

  const { attempt, test, result, diff } = data;

  const accuracyHighlight =
    result.accuracy >= 90
      ? "success"
      : result.accuracy >= 70
        ? "warning"
        : ("danger" as const);

  const formattedDate = attempt.submittedAt
    ? new Date(attempt.submittedAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      {/* ── Back ── */}
      <button
        onClick={() => router.back()}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* ── Header ── */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {test.title}
          </h1>
          <Badge variant="outline" className="capitalize">
            {test.type}
          </Badge>
          <Badge
            variant={attempt.type === "assessment" ? "default" : "secondary"}
            className="capitalize"
          >
            {attempt.type}
          </Badge>
        </div>
        {formattedDate && (
          <p className="text-muted-foreground text-sm">
            Submitted {formattedDate}
          </p>
        )}
      </div>

      <Separator />

      {/* ── Stat Cards ── */}
      <div className="flex gap-3">
        <StatCard
          icon={Trophy}
          label="Score"
          value={result.score}
          highlight="success"
        />
        <StatCard
          icon={Gauge}
          label="WPM"
          value={result.wpm}
          sub="words / min"
        />
        <StatCard
          icon={Target}
          label="Accuracy"
          value={`${result.accuracy}%`}
          highlight={accuracyHighlight}
        />
        <StatCard
          icon={AlertCircle}
          label="Mistakes"
          value={result.mistakes}
          sub="words"
          highlight={
            result.mistakes === 0
              ? "success"
              : result.mistakes > 10
                ? "danger"
                : "warning"
          }
        />
      </div>

      {/* ── Audio Player ── */}
      <AudioPlayer audioUrl={test.audioUrl} />

      {/* ── Tabs ── */}
      <Tabs defaultValue="matter" className="w-full space-y-4">
        <TabsList className="w-full">
          <TabsTrigger
            value="matter"
            className="flex flex-1 items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            Matter
          </TabsTrigger>
          <TabsTrigger
            value="outline"
            className="flex flex-1 items-center gap-1.5"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Outline
          </TabsTrigger>
          <TabsTrigger
            value="explanation"
            className="flex flex-1 items-center gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Explanation
          </TabsTrigger>
        </TabsList>

        {/* Matter */}
        <TabsContent value="matter" className="w-full space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative rounded-xl bg-gradient-to-r from-emerald-400/40 via-emerald-400/10 to-transparent p-[1px]">
              <Card className="bg-background rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
                    Original Matter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80 font-mono text-sm leading-7 whitespace-pre-wrap">
                    {test.matter}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
                  Your Answer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attempt.answerFinal ? (
                  <p className="text-foreground/80 font-mono text-sm leading-7 whitespace-pre-wrap">
                    {attempt.answerFinal}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    No answer submitted
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Outline */}
        <TabsContent value="outline" className="w-full">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
                Outline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/80 text-sm leading-7 whitespace-pre-wrap">
                {test.outline}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Explanation */}
        <TabsContent value="explanation" className="w-full">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
                  Your Answer — Annotated
                </CardTitle>
                <DiffLegend />
              </div>
            </CardHeader>
            <CardContent>
              <DiffView diff={diff} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AttemptResultClient({
  attemptId,
}: {
  attemptId: string;
}) {
  return (
    <Suspense fallback={<ResultSkeleton />}>
      <ResultInner attemptId={attemptId} />
    </Suspense>
  );
}