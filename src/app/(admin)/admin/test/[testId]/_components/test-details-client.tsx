"use client";

// ─── app/admin/test/[testId]/_components/test-detail-client.tsx ───────────────

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  Pencil,
  Trash2,
  Rocket,
  ArrowLeft,
  Mic,
  Pause,
  Clock,
  Users,
  Play,
  Gavel,
  FileText,
  ListChecks,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { AttemptsTable } from "./attempts-table";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSec(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

// ─── Audio Player ─────────────────────────────────────────────────────────────

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
      if (audio) setCurrentTime(audio.currentTime);
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
    isPlaying ? audio.pause() : void audio.play();
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
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-widest uppercase">
          <Mic className="h-3.5 w-3.5" />
          Dictation Audio
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
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
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-1.5">
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

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </span>
      <span className="text-[15px] font-bold tabular-nums">{value}</span>
    </div>
  );
}

// ─── Attempts Tab Skeleton ────────────────────────────────────────────────────

function AttemptsTabSkeleton() {
  return (
    <Card>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="ml-auto h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Page Skeleton ────────────────────────────────────────────────────────────

function TestDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Separator />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function TestDetailInner({ testId }: { testId: string }) {
  const router = useRouter();

  // Kick off attempts fetch in parallel with test fetch so data is ready
  // by the time the user clicks the Attempts tab — no loading state on tab switch
  trpc.result.getTestResults.useQuery(
    { testId, page: 0, limit: 20, sortBy: "score", sortOrder: "desc" },
    { staleTime: 30_000 },
  );

  const [data] = trpc.test.get.useSuspenseQuery({ id: testId });
  const utils = trpc.useUtils();

  const deleteMutation = trpc.test.delete.useMutation({
    onSuccess: () => {
      void utils.test.list.invalidate();
      router.push("/admin/tests");
    },
  });

  const updateMutation = trpc.test.update.useMutation({
    onSuccess: () => void utils.test.get.invalidate({ id: testId }),
  });

  const isDraft = data.status === "draft";
  const isLegal = data.type === "legal";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      {/* ── Back ── */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.back();
        }}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.title}
            </h1>

            <span
              className={[
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
                "text-[9px] font-bold tracking-widest uppercase ring-1",
                isLegal
                  ? "bg-amber-500/10 text-amber-400 ring-amber-500/25"
                  : "bg-sky-500/10 text-sky-400 ring-sky-500/25",
              ].join(" ")}
            >
              {isLegal ? (
                <Gavel className="h-2.5 w-2.5" />
              ) : (
                <FileText className="h-2.5 w-2.5" />
              )}
              {data.type}
            </span>

            <span
              className={[
                "rounded-md px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase",
                data.status === "active"
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30",
              ].join(" ")}
            >
              {data.status}
            </span>
          </div>

          <p className="text-muted-foreground text-sm">
            Created{" "}
            {formatDistanceToNow(new Date(data.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* ── Actions ── */}
        <div className="flex shrink-0 items-center gap-2">
          {isDraft && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/test/${testId}/edit`}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    <Rocket className="mr-1.5 h-3.5 w-3.5" />
                    Launch
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-emerald-500" />
                      Launch this test?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3 text-sm">
                        <p>
                          You&apos;re about to make{" "}
                          <span className="text-foreground font-medium">
                            &quot;{data.title}&quot;
                          </span>{" "}
                          live. Before you do, note the following:
                        </p>
                        <ul className="text-muted-foreground space-y-1.5 pl-1">
                          {[
                            "The test will be immediately visible to all users.",
                            "You will not be able to edit the title, matter, outline, audio, or timing once active.",
                            "This action cannot be undone — the test cannot be reverted to draft.",
                          ].map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                              {item}
                            </li>
                          ))}
                        </ul>
                        <p className="text-muted-foreground">
                          Make sure the audio, matter, and timing are correct
                          before proceeding.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Go back</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          ...data,
                          id: testId,
                          status: "active",
                        })
                      }
                    >
                      <Rocket className="mr-1.5 h-3.5 w-3.5" />
                      {updateMutation.isPending
                        ? "Launching…"
                        : "Yes, launch test"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this test?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{data.title}&quot; and all
                  associated attempts and results. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteMutation.mutate({ id: testId })}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      {/* ── Timing strip ── */}
      <div className="border-border bg-card flex gap-6 rounded-xl border px-5 py-4">
        <StatPill
          icon={Mic}
          label="Dictation"
          value={fmtSec(data.dictationSeconds)}
        />
        <Separator orientation="vertical" className="h-10 self-center" />
        <StatPill
          icon={Pause}
          label="Break"
          value={fmtSec(data.breakSeconds)}
        />
        <Separator orientation="vertical" className="h-10 self-center" />
        <StatPill
          icon={Clock}
          label="Writing"
          value={fmtSec(data.writtenDurationSeconds)}
        />
        <Separator orientation="vertical" className="h-10 self-center" />
        <StatPill
          icon={Clock}
          label="Total"
          value={fmtSec(
            data.dictationSeconds +
              data.breakSeconds +
              data.writtenDurationSeconds,
          )}
        />
      </div>

      {/* ── Audio ── */}
      <AudioPlayer audioUrl={data.audioUrl} />

      {/* ── Tabs ── */}
      <Tabs
        defaultValue={data.status === "active" ? "attempts" : "matter"}
        className="w-full space-y-4"
      >
        <TabsList className="w-full">
          {data.status === "active" && (
            <TabsTrigger
              value="attempts"
              className="flex flex-1 items-center gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              Attempts
            </TabsTrigger>
          )}
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
        </TabsList>

        <TabsContent value="matter">
          <div className="rounded-xl bg-gradient-to-r from-emerald-400/40 via-emerald-400/10 to-transparent p-[1px]">
            <Card className="bg-background rounded-xl">
              <CardContent className="pt-5">
                <p className="text-foreground/80 font-mono text-sm leading-7 whitespace-pre-wrap">
                  {data.matter}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outline">
          <Card>
            <CardContent className="pt-5">
              {data.outline ? (
                <p className="text-foreground/80 text-sm leading-7 whitespace-pre-wrap">
                  {data.outline}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  No outline provided
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attempts">
          <Suspense fallback={<AttemptsTabSkeleton />}>
            <AttemptsTable testId={testId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function TestDetailClient({ testId }: { testId: string }) {
  return (
    <Suspense fallback={<TestDetailSkeleton />}>
      <TestDetailInner testId={testId} />
    </Suspense>
  );
}
