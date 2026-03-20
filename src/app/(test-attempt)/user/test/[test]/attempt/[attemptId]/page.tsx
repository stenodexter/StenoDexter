"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { SkipForward, Send, CheckCircle2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = "countdown" | "audio" | "break" | "writing" | "submitted";

// ─── Config ───────────────────────────────────────────────────────────────────
const COUNTDOWN_SECONDS = 5; // tweak this to change the pre-test countdown

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(s: number) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ─── Circular progress ────────────────────────────────────────────────────────
function CircularProgress({
  pct,
  timeLeft,
  total,
}: {
  pct: number;
  timeLeft: number;
  total: number;
}) {
  const R = 44;
  const circ = 2 * Math.PI * R;
  const dash = circ * (1 - pct / 100);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 120, height: 120 }}
    >
      <svg width={120} height={120} className="-rotate-90">
        {/* Track */}
        <circle
          cx={60}
          cy={60}
          r={R}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={6}
        />
        {/* Progress */}
        <circle
          cx={60}
          cy={60}
          r={R}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-foreground text-sm leading-none font-bold tabular-nums">
          {formatTime(timeLeft)}
        </span>
        <span className="text-muted-foreground mt-0.5 text-[10px]">
          / {formatTime(total)}
        </span>
      </div>
    </div>
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function AudioWaveform({ isPlaying }: { isPlaying: boolean }) {
  const BAR_COUNT = 48;

  // Generate stable random heights per bar using useMemo
  const baseHeights = useMemo(
    () => Array.from({ length: BAR_COUNT }, () => 0.15 + Math.random() * 0.55),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            const jitter = (Math.random() - 0.5) * 0.35;
            return Math.max(0.08, Math.min(1, base + jitter));
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

// ─── Countdown ────────────────────────────────────────────────────────────────
function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 select-none">
      <div className="space-y-1.5 text-center">
        <p className="text-foreground text-base font-semibold">
          Get ready — audio begins shortly
        </p>
        <p className="text-muted-foreground text-xs">
          Find a quiet place and keep this window in fullscreen
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
}: {
  audioUrl: string;
  durationSeconds: number;
  secondsLeft: number;
  onEnded: () => void;
  onProgress: (s: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const elapsed = durationSeconds - secondsLeft;
  const pct = Math.min(100, (elapsed / durationSeconds) * 100);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    // Seek to resume position, lock controls
    el.currentTime = elapsed;
    el.addEventListener("play", () => setIsPlaying(true));
    el.addEventListener("pause", () => setIsPlaying(false));
    el.addEventListener("ended", () => {
      setIsPlaying(false);
      onEnded();
    });

    void el
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => null);

    const tick = setInterval(() => {
      if (el && !el.paused) onProgress(Math.floor(el.currentTime));
    }, 2000);

    return () => {
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10">
      {/* Label */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${isPlaying ? "animate-pulse bg-red-500" : "bg-muted-foreground"}`}
        />
        <span className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
          {isPlaying ? "Playing" : "Paused"}
        </span>
      </div>

      {/* Waveform */}
      <div className="w-full max-w-md px-8">
        <AudioWaveform isPlaying={isPlaying} />
      </div>

      {/* Circular timer */}
      <CircularProgress
        pct={pct}
        timeLeft={secondsLeft}
        total={durationSeconds}
      />

      <p className="text-muted-foreground text-xs">
        A break follows once audio ends
      </p>

      {/* Hidden audio — no controls exposed */}
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
  const pct = Math.min(
    100,
    ((totalSeconds - secondsLeft) / totalSeconds) * 100,
  );

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <p className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
        Break
      </p>

      <CircularProgress pct={pct} timeLeft={secondsLeft} total={totalSeconds} />

      <div className="space-y-1 text-center">
        <p className="text-foreground text-sm font-medium">
          Use this time to review your notes
        </p>
        <p className="text-muted-foreground text-xs">
          Writing begins automatically when the break ends
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onSkip}
        className="gap-2 text-xs"
      >
        <SkipForward className="h-3 w-3" />
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
  const pct = Math.min(
    100,
    ((totalSeconds - secondsLeft) / totalSeconds) * 100,
  );
  const isLow = secondsLeft < 60;
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const R = 14;
  const circ = 2 * Math.PI * R;

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-3 px-6 py-4">
      {/* ── Header row ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        {/* Left: timer ring + time */}
        <div className="flex items-center gap-3">
          <div
            className="relative flex shrink-0 items-center justify-center"
            style={{ width: 36, height: 36 }}
          >
            <svg width={36} height={36} className="-rotate-90">
              <circle
                cx={18}
                cy={18}
                r={R}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={2.5}
              />
              <circle
                cx={18}
                cy={18}
                r={R}
                fill="none"
                stroke={
                  isLow ? "hsl(var(--destructive))" : "hsl(var(--primary))"
                }
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct / 100)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span
              className={`text-sm leading-none font-semibold tabular-nums ${isLow ? "text-destructive" : "text-foreground"}`}
            >
              {formatTime(secondsLeft)}
            </span>
            <span className="text-muted-foreground mt-0.5 text-[10px] leading-none">
              remaining
            </span>
          </div>
        </div>

        {/* Center: save status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${isSyncing ? "animate-pulse bg-amber-400" : "bg-emerald-500"}`}
          />
          <span className="text-muted-foreground text-[11px]">
            {isSyncing ? "Saving draft…" : "Draft saved"}
          </span>
        </div>

        {/* Right: word count + submit */}
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs tabular-nums">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting || !answer.trim()}
            className="shrink-0 gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>

      {/* ── Progress line ── */}
      <div className="bg-border h-px w-full shrink-0 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isLow ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* ── Textarea ── */}
      <Textarea
        className="border-border bg-muted/20 placeholder:text-muted-foreground/40 focus-visible:ring-ring min-h-0 flex-1 resize-none rounded-lg p-4 font-mono text-sm leading-7 focus-visible:ring-1"
        placeholder="Begin typing your transcription here…"
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        spellCheck={false}
      />

      {/* ── Footer hint ── */}
      <p className="text-muted-foreground shrink-0 text-center text-[11px]">
        Draft is saved automatically every 5 seconds · Submit when you are done
      </p>
    </div>
  );
}

// ─── Submitted ────────────────────────────────────────────────────────────────
function SubmittedScreen({ attemptId }: { attemptId: string }) {
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
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/user")}
        >
          Back to dashboard
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/user/attempt/${attemptId}`)}
        >
          View Report
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
    { retry: false },
  );

  const [stage, setStage] = useState<Stage>("countdown");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answer, setAnswer] = useState("");

  const syncMutation = trpc.attempt.sync.useMutation();
  const submitMutation = trpc.attempt.submit.useMutation({
    onSuccess: () => setStage("submitted"),
    onError: () => toast.error("Submission failed — please try again."),
  });

  // ── Debounce: ref-based so it's always fresh, no stale closure issues ──
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedAnswerRef = useRef<string>("");

  const handleAnswerChange = useCallback(
    (val: string) => {
      setAnswer(val);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (val === lastSyncedAnswerRef.current) return;
        lastSyncedAnswerRef.current = val;
        syncMutation.mutate({
          attemptId: params.attemptId,
          answerDraft: val,
        });
      }, 5000);
    },
    [params.attemptId, syncMutation],
  );

  // Flush draft on unmount (navigation away) so nothing is lost
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Hydrate on load
  useEffect(() => {
    if (!data) return;
    const { attempt, secondsLeft } = data;

    // Restore draft answer
    setAnswer(attempt.answerDraft ?? "");

    if (attempt.stage === "audio" && !attempt.stageStartedAt) {
      // Attempt created but countdown never finished — start from countdown
      setStage("countdown");
      setCountdown(COUNTDOWN_SECONDS);
      setTimeLeft(data.test.dictationSeconds);
    } else if (attempt.stage === "audio") {
      setStage("audio");
      setTimeLeft(secondsLeft);
    } else if (attempt.stage === "break") {
      setStage("break");
      setTimeLeft(secondsLeft);
    } else if (attempt.stage === "writing") {
      setStage("writing");
      setTimeLeft(secondsLeft);
    } else if (attempt.stage === "submitted") {
      setStage("submitted");
    }
  }, [data]);

  // Fullscreen — request on countdown, never terminate on exit
  useEffect(() => {
    if (stage === "countdown") {
      document.documentElement.requestFullscreen().catch(() => null);
    }
  }, [stage]);

  // Countdown tick
  useEffect(() => {
    if (stage !== "countdown") return;
    if (countdown === 0) {
      setStage("audio");
      // Stamp the real audio start time — countdown is excluded from the timer
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

  // Stage timer
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

  // Route-change auto-submit: flush draft when navigating away mid-writing
  // (handled by the unmount flush in handleAnswerChange's cleanup)

  const handleAutoSubmit = useCallback(() => {
    // On abrupt submit (timeout / route change), use the last synced draft
    // as the final answer if the in-memory answer is somehow empty
    const finalAnswer = answer || lastSyncedAnswerRef.current;
    submitMutation.mutate({
      attemptId: params.attemptId,
      answerFinal: finalAnswer,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);

  const handleStageEnd = useCallback(() => {
    if (stage === "audio") {
      const breakTotal = data?.test.breakSeconds ?? 0;
      setStage("break");
      setTimeLeft(breakTotal);
      syncMutation.mutate({ attemptId: params.attemptId, stage: "break" });
    } else if (stage === "break") {
      const writingTotal = data?.test.writtenDurationSeconds ?? 0;
      setStage("writing");
      setTimeLeft(writingTotal);
      syncMutation.mutate({ attemptId: params.attemptId, stage: "writing" });
    } else if (stage === "writing") {
      handleAutoSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, data]);

  const handleSkipBreak = () => {
    const writingTotal = data?.test.writtenDurationSeconds ?? 0;
    setStage("writing");
    setTimeLeft(writingTotal);
    syncMutation.mutate({
      attemptId: params.attemptId,
      stage: "writing",
      breakSkipped: true,
      markWrittingStarted: true,
    });
  };

  const handleSubmit = () => {
    submitMutation.mutate({ attemptId: params.attemptId, answerFinal: answer });
  };

  // ── Loading / error ──
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
        <p className="text-foreground font-medium">Test not found</p>
        <Button variant="outline" onClick={() => router.push("/user")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background fixed inset-0 flex flex-col">
      {/* Top bar — hidden during countdown and submitted */}
      {stage !== "countdown" && stage !== "submitted" && (
        <div className="border-border flex shrink-0 items-center justify-between border-b px-6 py-3">
          <p className="text-foreground max-w-sm truncate text-sm font-medium">
            {data.test.title}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
                data.attempt.type === "assessment"
                  ? "bg-amber-500/10 text-amber-500 ring-amber-500/20"
                  : "bg-primary/10 text-primary ring-primary/20"
              }`}
            >
              {data.attempt.type}
            </span>
            <span className="text-muted-foreground text-xs capitalize">
              {stage}
            </span>
          </div>
        </div>
      )}

      {/* Stage content */}
      <div className="flex-1 overflow-hidden">
        {stage === "countdown" && <CountdownOverlay count={countdown} />}

        {stage === "audio" && (
          <AudioStage
            audioUrl={data.test.audioUrl ?? ""}
            durationSeconds={data.test.dictationSeconds}
            secondsLeft={timeLeft}
            onEnded={handleStageEnd}
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
            totalSeconds={data.test.breakSeconds}
            onSkip={handleSkipBreak}
          />
        )}

        {stage === "writing" && (
          <WritingStage
            secondsLeft={timeLeft}
            totalSeconds={data.test.writtenDurationSeconds}
            answer={answer}
            onChange={handleAnswerChange}
            onSubmit={handleSubmit}
            isSubmitting={submitMutation.isPending}
            isSyncing={syncMutation.isPending}
          />
        )}

        {stage === "submitted" && (
          <SubmittedScreen attemptId={params.attemptId} />
        )}
      </div>
    </div>
  );
}
