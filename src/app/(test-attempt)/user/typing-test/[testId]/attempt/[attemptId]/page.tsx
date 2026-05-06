"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useCookie } from "~/hooks/use-cookie";
import { useLeaveGuard } from "~/hooks/use-leave-guard";
import {
  Send,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";

const SYNC_LOCAL_MS = 3_000;
const SYNC_SERVER_MS = 15_000;
const FONT_MIN = 14;
const FONT_MAX = 48;
const FONT_STEP = 1;
const FONT_DEFAULT = 15;
const DRAFT_KEY = (id: string) => `typing_draft_${id}`;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${pad(m)}:${pad(s % 60)}`;
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-muted-foreground hidden text-xs tabular-nums sm:block">
      {format(now, "do MMMM, yyyy")}
      {" · "}
      {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

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
          Your typing has been recorded.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/user/typing-tests")}
        >
          Back to tests
        </Button>
        <Button
          size="sm"
          onClick={() =>
            router.push(
              `/user/typing-tests/${testId}/results?attemptId=${attemptId}`,
            )
          }
        >
          View result
        </Button>
      </div>
    </div>
  );
}

export default function TypingAttemptPage() {
  const params = useParams<{ testId: string; attemptId: string }>();
  const router = useRouter();
  const { get: getCookie, set: setCookie } = useCookie();

  const { data, isLoading, isError } =
    trpc.typingTest.attempt.getResume.useQuery(
      { attemptId: params.attemptId },
      { retry: false, refetchOnWindowFocus: false },
    );

  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  // ── deferred start: timer only runs after first keypress ──────────────────
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  // ── space-lock: cursor cannot move before last space position ─────────────
  const lastSpacePosRef = useRef(0);

  // ── Leave guard ──────────────────────────────────────────────────────────────
  const onNavigateAway = useCallback(async () => {
    if (submittedRef.current) return;
    stopIntervals();
    saveLocal();
    await submitMutation
      .mutateAsync({
        attemptId: params.attemptId,
        answerFinal: answerRef.current,
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { override: navigateSafe } = useLeaveGuard(!submitted, onNavigateAway);

  const [fontSize, setFontSize] = useState<number>(() => {
    const stored =
      typeof document !== "undefined" ? getCookie("typing_font_size") : null;
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return !Number.isNaN(parsed) && parsed >= FONT_MIN && parsed <= FONT_MAX
      ? parsed
      : FONT_DEFAULT;
  });

  const updateFontSize = useCallback(
    (next: number) => {
      setFontSize(next);
      setCookie("typing_font_size", String(next), { days: 365 });
    },
    [setCookie],
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const passageScrollRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef("");
  const lastServerSyncRef = useRef("");
  const localTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const serverTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);

  const lineHeightPx = Math.round(fontSize * 1.8);

  const syncMutation = trpc.typingTest.attempt.sync.useMutation({
    onMutate: () => setIsSyncing(true),
    onSettled: () => setIsSyncing(false),
  });

  const submitMutation = trpc.typingTest.attempt.submit.useMutation({
    onSuccess: () => {
      submittedRef.current = true;
      setSubmitted(true);
    },
    onError: () => toast.error("Submission failed — please try again."),
  });

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

  const startIntervals = useCallback(() => {
    localTimer.current = setInterval(saveLocal, SYNC_LOCAL_MS);
    serverTimer.current = setInterval(saveServer, SYNC_SERVER_MS);
  }, [saveLocal, saveServer]);

  const stopIntervals = useCallback(() => {
    if (localTimer.current) {
      clearInterval(localTimer.current);
      localTimer.current = null;
    }
    if (serverTimer.current) {
      clearInterval(serverTimer.current);
      serverTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    if (countdownTimer.current) return; // already running
    countdownTimer.current = setInterval(() => setTimeLeft((s) => s - 1), 1000);
  }, []);

  // Called on very first keypress to kick off timer + server mark
  const handleFirstKey = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    startCountdown();
    startIntervals();
    // Tell server writing has begun so it stamps writingStartedAt
    syncMutation.mutate({
      attemptId: params.attemptId,
      markWritingStarted: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    stopIntervals();
    saveLocal();
    submitMutation.mutate({
      attemptId: params.attemptId,
      answerFinal: answerRef.current,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Block clipboard / navigation shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        ["v", "x", "z", "y", "a"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        return;
      }
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ].includes(e.key)
      ) {
        e.preventDefault();
        return;
      }

      // Trigger deferred start on first real keystroke
      if (!startedRef.current) {
        handleFirstKey();
      }

      // Space-lock: block Backspace if it would cross the last committed space
      if (e.key === "Backspace") {
        if (answerRef.current.length <= lastSpacePosRef.current) {
          e.preventDefault();
          return;
        }
      }
    },
    [handleFirstKey],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      textareaRef.current?.focus();
    },
    [],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      textareaRef.current?.focus();
    },
    [],
  );

  const handleFocus = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {}
  }, []);

  const handleChange = useCallback((val: string) => {
    const prev = answerRef.current;
    // Only allow appending or deleting from end (no mid-string edits)
    if (!val.startsWith(prev) && !prev.startsWith(val)) return;

    // Space-lock: reject deletions that go before lastSpacePos
    if (val.length < lastSpacePosRef.current) return;

    // Track last space position when a space is appended
    if (val.length > prev.length) {
      const appended = val.slice(prev.length);
      if (appended.includes(" ")) {
        // Find the last space in the new value
        lastSpacePosRef.current = val.lastIndexOf(" ") + 1;
      }
    }

    answerRef.current = val;
    setAnswer(val);
  }, []);

  const scrollPassageByLine = useCallback(
    (direction: "up" | "down") => {
      passageScrollRef.current?.scrollBy({
        top: direction === "up" ? -lineHeightPx : lineHeightPx,
        behavior: "smooth",
      });
    },
    [lineHeightPx],
  );

  useEffect(() => {
    if (!data) return;
    const localDraft = (() => {
      try {
        return localStorage.getItem(DRAFT_KEY(params.attemptId));
      } catch {
        return null;
      }
    })();
    const initial = localDraft ?? data.attempt.answerDraft ?? "";
    answerRef.current = initial;
    lastServerSyncRef.current = data.attempt.answerDraft ?? "";
    setAnswer(initial);

    if (data.attempt.isSubmitted) {
      setSubmitted(true);
      return;
    }

    setTimeLeft(data.secondsLeft);

    // If writingStartedAt already set (resumed mid-test), start immediately
    if (data.attempt.writingStartedAt) {
      startedRef.current = true;
      setStarted(true);
      startCountdown();
      startIntervals();
    }
    // Otherwise wait for first keypress (handleFirstKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    document.documentElement.requestFullscreen().catch(() => null);
  }, []);

  // Auto-submit when countdown hits zero
  useEffect(() => {
    if (
      started &&
      timeLeft === 0 &&
      !submittedRef.current &&
      data &&
      !data.attempt.isSubmitted
    ) {
      doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, started]);

  useEffect(() => {
    return () => {
      stopIntervals();
      saveLocal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="bg-background fixed inset-0 flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm">Loading…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-background fixed inset-0 flex flex-col items-center justify-center gap-4">
        <p className="font-medium">Test not found</p>
        <Button
          variant="outline"
          onClick={() => navigateSafe(() => router.push("/user/typing-tests"))}
        >
          Back
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-background fixed inset-0">
        <SubmittedScreen testId={params.testId} attemptId={params.attemptId} />
      </div>
    );
  }

  const isLow = started && timeLeft < 60;
  const pct = !started
    ? 0
    : Math.min(
        100,
        ((data.test.durationSeconds - timeLeft) / data.test.durationSeconds) *
          100,
      );
  const R = 11;
  const circ = 2 * Math.PI * R;
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  const passageFont = {
    fontFamily: "'Calibri', 'Carlito', 'Liberation Sans', sans-serif",
    fontSize: `${fontSize}px`,
    lineHeight: "1.8",
  } as const;

  return (
    <div className="bg-background fixed inset-0 flex flex-col overflow-hidden">
      {/* ── top bar ── */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-3">
        <p className="truncate text-base font-semibold">{data.test.title}</p>
        <div className="flex items-center gap-3">
          <LiveClock />

          <Badge
            variant={data.attempt.type === "test" ? "default" : "secondary"}
            className="capitalize"
          >
            {data.attempt.type}
          </Badge>

          {/* Timer */}
          <div className="flex items-center gap-2">
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
                stroke={
                  isLow ? "hsl(var(--destructive))" : "hsl(var(--primary))"
                }
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct / 100)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <span
              className={`text-lg leading-none font-semibold tabular-nums ${isLow ? "text-destructive" : ""}`}
            >
              {started
                ? formatTime(timeLeft)
                : formatTime(data.test.durationSeconds)}
            </span>
            {isLow && (
              <Badge variant="destructive" className="text-[10px]">
                Low time
              </Badge>
            )}
            {!started && (
              <Badge variant="secondary" className="text-[10px]">
                Press any key to start
              </Badge>
            )}
          </div>

          {/* Font size control */}
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

          {/* Submit */}
          <Button
            size="sm"
            onClick={doSubmit}
            disabled={submitMutation.isPending || !answer.trim()}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {submitMutation.isPending ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>

      {/* ── progress line ── */}
      <div className="bg-border/40 h-[2px] w-full shrink-0">
        <div
          className={`h-full transition-all duration-1000 ${isLow ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* ── split panes ── */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* ── Passage pane (top) ── */}
        <div className="flex min-h-0 flex-1 flex-col border-b">
          <div
            ref={passageScrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-8 py-5"
          >
            <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-widest uppercase">
              Passage
            </p>
            <p
              className="leading-relaxed whitespace-pre-wrap"
              style={passageFont}
            >
              {data.test.correctTranscription}
            </p>
          </div>

          <div className="bg-muted/30 flex shrink-0 items-center justify-end gap-1.5 border-t px-4 py-1.5">
            <span className="text-muted-foreground mr-1 text-[11px]">
              Scroll passage
            </span>
            <button
              onClick={() => scrollPassageByLine("up")}
              className="text-muted-foreground hover:text-foreground hover:bg-muted bg-background flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
              aria-label="Scroll passage up one line"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => scrollPassageByLine("down")}
              className="text-muted-foreground hover:text-foreground hover:bg-muted bg-background flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
              aria-label="Scroll passage down one line"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Writing pane (bottom) ── */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-8 pt-4">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Your typing
            </p>
          </div>

          <textarea
            ref={textareaRef}
            className="placeholder:text-muted-foreground/40 min-h-0 flex-1 resize-none border-0 bg-transparent px-8 py-3 outline-none selection:bg-transparent"
            style={{
              ...passageFont,
              caretColor: "auto",
            }}
            placeholder="Begin typing here…"
            value={answer}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onFocus={handleFocus}
            onContextMenu={(e) => e.preventDefault()}
            spellCheck={false}
            autoFocus
          />

          <div className="bg-muted/30 flex shrink-0 items-center justify-between border-t px-5 py-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  isSyncing ? "animate-pulse bg-amber-400" : "bg-emerald-500"
                }`}
              />
              <span className="text-muted-foreground text-xs">
                {isSyncing ? "Saving…" : "Saved"}
              </span>
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {wordCount} words · {answer.length} chars
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
