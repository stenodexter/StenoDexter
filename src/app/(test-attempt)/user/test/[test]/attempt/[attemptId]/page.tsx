"use client";

// ─── app/(user)/test/[test]/attempt/[attemptId]/page.tsx ─────────────────────

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { useCookie } from "~/hooks/use-cookie";
import { SkipForward, Send, CheckCircle2, ZoomIn, ZoomOut } from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────

const COUNTDOWN_SECONDS = 5;
const SYNC_LOCAL_MS = 3_000;
const SYNC_SERVER_MS = 15_000;
const AUDIO_SYNC_MS = 5_000;

const FONT_MIN = 14;
const FONT_MAX = 48;
const FONT_STEP = 2;
const FONT_DEFAULT = 16;

const DRAFT_KEY = (attemptId: string) => `attempt_draft_${attemptId}`;

// ─── types ────────────────────────────────────────────────────────────────────

type Stage = "countdown" | "audio" | "break" | "writing" | "submitted";

// ─── helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${pad(m)}:${pad(s % 60)}`;
}

// ─── Circular progress ────────────────────────────────────────────────────────

function CircularProgress({
  pct,
  timeLeft,
  total,
  danger = false,
  size = 120,
}: {
  pct: number;
  timeLeft: number;
  total: number;
  danger?: boolean;
  size?: number;
}) {
  const R = size * 0.367;
  const circ = 2 * Math.PI * R;
  const cx = size / 2;
  const strokeW = Math.max(4, size * 0.05);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={cx}
          cy={cx}
          r={R}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeW}
        />
        <circle
          cx={cx}
          cy={cx}
          r={R}
          fill="none"
          stroke={danger ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-0.5">
        <span
          className={`leading-none font-bold tabular-nums ${danger ? "text-destructive" : "text-foreground"} ${size >= 140 ? "text-2xl" : "text-base"}`}
        >
          {formatTime(timeLeft)}
        </span>
        <span
          className={`text-muted-foreground ${size >= 140 ? "text-sm" : "text-[10px]"}`}
        >
          / {formatTime(total)}
        </span>
      </div>
    </div>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

function AudioWaveform({ isPlaying }: { isPlaying: boolean }) {
  const BAR_COUNT = 48;
  const baseHeights = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => 0.15 + Math.random() * 0.55),
    [],
  );
  const [heights, setHeights] = useState(baseHeights);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      setHeights(baseHeights.map((h) => h * 0.3));
      return;
    }
    const animate = (ts: number) => {
      if (ts - lastRef.current > 80) {
        lastRef.current = ts;
        setHeights((prev) =>
          prev.map((_, i) => {
            const base = baseHeights[i] ?? 0.3;
            return Math.max(
              0.08,
              Math.min(1, base + (Math.random() - 0.5) * 0.35),
            );
          }),
        );
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, baseHeights]);

  return (
    <div
      className="flex items-center justify-center gap-[3px]"
      style={{ height: 72 }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="bg-primary/70 rounded-full"
          style={{
            width: 3,
            height: `${Math.round(h * 72)}px`,
            transition: "height 0.08s ease",
            opacity: isPlaying ? 0.6 + h * 0.4 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

// ─── Countdown overlay ────────────────────────────────────────────────────────

function CountdownOverlay({
  count,
  testTitle,
  attemptType,
}: {
  count: number;
  testTitle: string;
  attemptType: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center select-none">
      <div className="space-y-2">
        <p className="text-lg font-semibold">{testTitle}</p>
        <Badge
          variant={attemptType === "assessment" ? "default" : "secondary"}
          className="capitalize"
        >
          {attemptType}
        </Badge>
      </div>
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">
          Get ready — audio begins shortly
        </p>
        <p className="text-muted-foreground text-xs">
          Find a quiet place and stay in fullscreen
        </p>
      </div>
      <span
        key={count}
        className="text-foreground animate-in zoom-in-50 text-[96px] leading-none font-bold tabular-nums duration-200"
      >
        {count}
      </span>
      <p className="text-muted-foreground text-[11px] tracking-widest uppercase">
        seconds remaining
      </p>
    </div>
  );
}

// ─── Audio stage ──────────────────────────────────────────────────────────────

function AudioStage({
  audioUrl,
  durationSeconds,
  secondsLeft,
  onEnded,
  onProgress,
  onSkip, // ← new
}: {
  audioUrl: string;
  durationSeconds: number;
  secondsLeft: number;
  onEnded: () => void;
  onProgress: (s: number) => void;
  onSkip: () => void; // ← new
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const elapsed = durationSeconds - secondsLeft;
  const pct = Math.min(100, (elapsed / durationSeconds) * 100);
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  onEndedRef.current = onEnded;
  onProgressRef.current = onProgress;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = elapsed;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => {
      setIsPlaying(false);
      onEndedRef.current();
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnd);
    void el.play().catch(() => null);

    const tick = setInterval(() => {
      if (el && !el.paused) onProgressRef.current(Math.floor(el.currentTime));
    }, AUDIO_SYNC_MS);

    return () => {
      clearInterval(tick);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${isPlaying ? "animate-pulse bg-red-500" : "bg-muted-foreground"}`}
        />
        <span className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
          {isPlaying ? "Playing" : "Paused"}
        </span>
      </div>

      <div className="w-full max-w-md px-8">
        <AudioWaveform isPlaying={isPlaying} />
      </div>

      <CircularProgress
        pct={pct}
        timeLeft={secondsLeft}
        total={durationSeconds}
      />

      {/* ── hint + skip — stacked, visually grouped ── */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-muted-foreground text-xs">
          A break follows once audio ends
        </p>
        <Button variant="outline" size="sm" onClick={onSkip} className="gap-2">
          <SkipForward className="h-3.5 w-3.5" />
          Skip audio
        </Button>
      </div>

      <audio ref={audioRef} src={audioUrl} className="hidden" />
    </div>
  );
}

// ─── Break stage ──────────────────────────────────────────────────────────────

function BreakStage({
  secondsLeft,
  totalSeconds,
  onSkip,
}: {
  secondsLeft: number;
  totalSeconds: number;
  onSkip: () => void;
}) {
  const pct =
    totalSeconds > 0
      ? Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100)
      : 0;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <p className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
        Break
      </p>

      <CircularProgress
        pct={pct}
        timeLeft={secondsLeft}
        total={totalSeconds}
        size={160}
      />

      <div className="space-y-1 text-center">
        <p className="text-sm font-medium">
          Use this time to gather your thoughts
        </p>
        <p className="text-muted-foreground text-xs">
          Writing begins automatically when break ends
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onSkip} className="gap-2">
        <SkipForward className="h-3.5 w-3.5" />
        Skip break
      </Button>
    </div>
  );
}

// ─── Writing stage ────────────────────────────────────────────────────────────

function WritingStage({
  secondsLeft,
  totalSeconds,
  answer,
  onChange,
  onSubmit,
  isSubmitting,
  isSyncing,
}: {
  secondsLeft: number;
  totalSeconds: number;
  answer: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isSyncing: boolean;
}) {
  const { get: getCookie, set: setCookie } = useCookie();

  // ── Font size — 2px steps, FONT_MIN–FONT_MAX, cookie-persisted ──────────────
  const [fontSize, setFontSize] = useState<number>(() => {
    const stored =
      typeof document !== "undefined" ? getCookie("attempt_font_size") : null;
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return !isNaN(parsed) && parsed >= FONT_MIN && parsed <= FONT_MAX
      ? parsed
      : FONT_DEFAULT;
  });

  const updateFontSize = (next: number) => {
    setFontSize(next);
    setCookie("attempt_font_size", String(next), { days: 365 });
  };

  const isLow = secondsLeft < 60;
  const pct = Math.min(
    100,
    ((totalSeconds - secondsLeft) / totalSeconds) * 100,
  );
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const charCount = answer.length;

  const R = 11;
  const circ = 2 * Math.PI * R;

  return (
    <div className="flex h-full flex-col">
      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-2.5">
        {/* Timer */}
        <div className="flex items-center gap-2.5">
          <svg width={26} height={26} className="-rotate-90">
            <circle
              cx={13}
              cy={13}
              r={R}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={2}
            />
            <circle
              cx={13}
              cy={13}
              r={R}
              fill="none"
              stroke={isLow ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <span
            className={`text-sm leading-none font-semibold tabular-nums ${isLow ? "text-destructive" : ""}`}
          >
            {formatTime(secondsLeft)}
          </span>
          {isLow && (
            <Badge variant="destructive" className="text-[10px]">
              Low time
            </Badge>
          )}
        </div>

        {/* Save status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors ${isSyncing ? "animate-pulse bg-amber-400" : "bg-emerald-500"}`}
          />
          <span className="text-muted-foreground text-[11px]">
            {isSyncing ? "Saving…" : "Saved"}
          </span>
        </div>

        {/* Zoom controls + stats + submit */}
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground hidden text-xs tabular-nums sm:block">
            {wordCount}w · {charCount}c
          </span>

          {/* ── Zoom: +/- buttons, 2px steps, 14–48px ── */}
          <div className="bg-muted/40 flex items-center gap-0.5 rounded-md border p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() =>
                updateFontSize(Math.max(FONT_MIN, fontSize - FONT_STEP))
              }
              disabled={fontSize <= FONT_MIN}
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="text-muted-foreground w-8 text-center text-[10px] tabular-nums">
              {fontSize}px
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() =>
                updateFontSize(Math.min(FONT_MAX, fontSize + FONT_STEP))
              }
              disabled={fontSize >= FONT_MAX}
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>

          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting || !answer.trim()}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>

      {/* ── Progress line ── */}
      <div className="bg-border h-0.5 w-full shrink-0">
        <div
          className={`h-full transition-all duration-1000 ${isLow ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* ── Writing area ── */}
      <Textarea
        className="flex-1 resize-none rounded-none border-0 px-8 py-6 leading-8 focus-visible:ring-0 focus-visible:ring-offset-0"
        style={{
          fontFamily: "'Calibri', 'Carlito', 'Liberation Sans', sans-serif",
          fontSize: `${fontSize}px`,
          lineHeight: "1.8",
        }}
        placeholder="Begin typing your transcription here…"
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        spellCheck={false}
      />

      {/* ── Footer ── */}
      <div className="flex shrink-0 items-center justify-between border-t px-6 py-2">
        <p className="text-muted-foreground text-[11px]">
          Draft saved automatically · Submit when done
        </p>
        <span className="text-muted-foreground text-xs tabular-nums sm:hidden">
          {wordCount}w · {charCount}c
        </span>
      </div>
    </div>
  );
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-muted-foreground hidden text-xs tabular-nums sm:block">
      {now.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
      {" · "}
      {now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

// ─── Submitted screen ─────────────────────────────────────────────────────────

function SubmittedScreen({
  testId,
  attemptId,
}: {
  testId: string;
  attemptId: string;
}) {
  const router = useRouter();
  useEffect(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 select-none">
      <div className="bg-primary/10 rounded-full p-5">
        <CheckCircle2 className="text-primary h-10 w-10" />
      </div>
      <div className="space-y-1.5 text-center">
        <h2 className="text-xl font-semibold">Submitted</h2>
        <p className="text-muted-foreground text-sm">
          Your answer has been recorded. Results will be available shortly.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/user")}
        >
          Back to tests
        </Button>
        <Button
          size="sm"
          onClick={() =>
            router.push(`/user/tests/${testId}/results?attemptId=${attemptId}`)
          }
        >
          View result
        </Button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AttemptPage() {
  const params = useParams<{ test: string; attemptId: string }>();
  const router = useRouter();

  const { data, isLoading, isError } = trpc.attempt.getResume.useQuery(
    { attemptId: params.attemptId },
    { retry: false, refetchOnWindowFocus: false },
  );

  const [stage, setStage] = useState<Stage>("countdown");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const syncMutation = trpc.attempt.sync.useMutation({
    onMutate: () => setIsSyncing(true),
    onSettled: () => setIsSyncing(false),
  });
  const submitMutation = trpc.attempt.submit.useMutation({
    onSuccess: () => setStage("submitted"),
    onError: () => toast.error("Submission failed — please try again."),
  });

  const answerRef = useRef("");
  const lastServerSyncRef = useRef("");
  const localSyncTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const serverSyncTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveLocal = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY(params.attemptId), answerRef.current);
    } catch {}
  }, [params.attemptId]);

  const saveServer = useCallback(() => {
    if (answerRef.current === lastServerSyncRef.current) return;
    lastServerSyncRef.current = answerRef.current;
    syncMutation.mutate({
      attemptId: params.attemptId,
      answerDraft: answerRef.current,
    });
  }, [params.attemptId, syncMutation]);

  const startSyncIntervals = useCallback(() => {
    localSyncTimer.current = setInterval(saveLocal, SYNC_LOCAL_MS);
    serverSyncTimer.current = setInterval(saveServer, SYNC_SERVER_MS);
  }, [saveLocal, saveServer]);

  const stopSyncIntervals = useCallback(() => {
    if (localSyncTimer.current) {
      clearInterval(localSyncTimer.current);
      localSyncTimer.current = null;
    }
    if (serverSyncTimer.current) {
      clearInterval(serverSyncTimer.current);
      serverSyncTimer.current = null;
    }
  }, []);

  const handleAnswerChange = useCallback((val: string) => {
    answerRef.current = val;
    setAnswer(val);
  }, []);

  useEffect(() => {
    return () => {
      stopSyncIntervals();
      saveLocal();
      if (answerRef.current !== lastServerSyncRef.current) {
        void syncMutation
          .mutateAsync({
            attemptId: params.attemptId,
            answerDraft: answerRef.current,
          })
          .catch(() => null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!data) return;
    const { attempt, secondsLeft, speed } = data;

    const localDraft = (() => {
      try {
        return localStorage.getItem(DRAFT_KEY(params.attemptId));
      } catch {
        return null;
      }
    })();
    const initialAnswer = localDraft ?? attempt.answerDraft ?? "";
    answerRef.current = initialAnswer;
    lastServerSyncRef.current = attempt.answerDraft ?? "";
    setAnswer(initialAnswer);

    if (attempt.stage === "submitted") {
      setStage("submitted");
      return;
    }

    if (attempt.stage === "audio" && !attempt.stageStartedAt) {
      setStage("countdown");
      setCountdown(COUNTDOWN_SECONDS);
      setTimeLeft(speed.dictationSeconds);
    } else if (attempt.stage === "audio") {
      setStage("audio");
      setTimeLeft(secondsLeft);
    } else if (attempt.stage === "break") {
      setStage("break");
      setTimeLeft(secondsLeft);
    } else if (attempt.stage === "writing") {
      setStage("writing");
      setTimeLeft(secondsLeft);
      startSyncIntervals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (stage === "countdown") {
      document.documentElement.requestFullscreen().catch(() => null);
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== "countdown") return;
    if (countdown === 0) {
      setStage("audio");
      syncMutation.mutate({
        attemptId: params.attemptId,
        stage: "audio",
        markAudioStarted: true,
      });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, countdown]);

  const handleStageEnd = useCallback(() => {
    if (stage === "audio") {
      const breakTotal = data?.speed.breakSeconds ?? 0;
      setStage("break");
      setTimeLeft(breakTotal);
      syncMutation.mutate({ attemptId: params.attemptId, stage: "break" });
    } else if (stage === "break") {
      const writingTotal = data?.speed.writtenDurationSeconds ?? 0;
      setStage("writing");
      setTimeLeft(writingTotal);
      startSyncIntervals();
      syncMutation.mutate({
        attemptId: params.attemptId,
        stage: "writing",
        markWritingStarted: true,
      });
    } else if (stage === "writing") {
      stopSyncIntervals();
      saveLocal();
      submitMutation.mutate({
        attemptId: params.attemptId,
        answerFinal: answerRef.current,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, data]);

  useEffect(() => {
    if (!["audio", "break", "writing"].includes(stage)) return;
    if (timeLeft <= 0) {
      handleStageEnd();
      return;
    }
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, timeLeft]);

  const handleSubmit = useCallback(() => {
    stopSyncIntervals();
    saveLocal();
    submitMutation.mutate({
      attemptId: params.attemptId,
      answerFinal: answerRef.current,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Skip audio → go straight to break ────────────────────────────────────────
  const handleSkipAudio = useCallback(() => {
    const breakTotal = data?.speed.breakSeconds ?? 0;
    setStage("break");
    setTimeLeft(breakTotal);
    syncMutation.mutate({
      attemptId: params.attemptId,
      stage: "break",
      audioSkipped: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleSkipBreak = useCallback(() => {
    const writingTotal = data?.speed.writtenDurationSeconds ?? 0;
    setStage("writing");
    setTimeLeft(writingTotal);
    startSyncIntervals();
    syncMutation.mutate({
      attemptId: params.attemptId,
      stage: "writing",
      breakSkipped: true,
      markWritingStarted: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-background fixed inset-0 flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm">
          Loading test…
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-background fixed inset-0 flex flex-col items-center justify-center gap-4">
        <p className="font-medium">Test not found</p>
        <Button variant="outline" onClick={() => router.push("/user")}>
          Back to tests
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background fixed inset-0 flex flex-col">
      {stage !== "countdown" && stage !== "submitted" && (
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-3">
          <p className="max-w-sm truncate text-sm font-medium">
            {data.test.title}
          </p>
          <div className="flex items-center gap-2.5">
            <LiveClock />
            <Badge
              variant={
                data.attempt.type === "assessment" ? "default" : "secondary"
              }
              className="capitalize"
            >
              {data.attempt.type}
            </Badge>
            <span className="text-muted-foreground text-xs capitalize">
              {stage}
            </span>
            <Badge variant="outline" className="text-[10px] tabular-nums">
              {data.speed.wpm} WPM
            </Badge>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {stage === "countdown" && (
          <CountdownOverlay
            count={countdown}
            testTitle={data.test.title}
            attemptType={data.attempt.type}
          />
        )}

        {stage === "audio" && (
          <AudioStage
            audioUrl={data.speed.audioUrl}
            durationSeconds={data.speed.dictationSeconds}
            secondsLeft={timeLeft}
            onEnded={handleStageEnd}
            onSkip={handleSkipAudio}
            onProgress={(s) =>
              syncMutation.mutate({
                attemptId: params.attemptId,
                audioProgressSeconds: s,
              })
            }
          />
        )}

        {stage === "break" && (
          <BreakStage
            secondsLeft={timeLeft}
            totalSeconds={data.speed.breakSeconds}
            onSkip={handleSkipBreak}
          />
        )}

        {stage === "writing" && (
          <WritingStage
            secondsLeft={timeLeft}
            totalSeconds={data.speed.writtenDurationSeconds}
            answer={answer}
            onChange={handleAnswerChange}
            onSubmit={handleSubmit}
            isSubmitting={submitMutation.isPending}
            isSyncing={isSyncing}
          />
        )}

        {stage === "submitted" && (
          <SubmittedScreen testId={data.test.id} attemptId={data.attempt.id} />
        )}
      </div>
    </div>
  );
}
