"use client";

// ─── components/common/user/test-start-dialog.tsx ────────────────────────────

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  Maximize,
  Wifi,
  RefreshCw,
  Loader2,
  Zap,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/react";
import { toast } from "sonner";

function fmtSec(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60),
    r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

type Speed = {
  id: string;
  wpm: number;
  dictationSeconds: number;
  breakSeconds: number;
  writtenDurationSeconds: number;
  // null = user has never assessed this speed (eligible)
  // true = assessed, false = never attempted
  hasAssessed: boolean;
};

interface TestStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  testTitle: string;
  speeds: Speed[];
}

const warnings = [
  {
    icon: Maximize,
    text: "The test runs in fullscreen. Stay in fullscreen throughout for best results.",
  },
  {
    icon: RefreshCw,
    text: "You can reload the page — your progress is saved and you'll resume where you left off.",
  },
  {
    icon: Wifi,
    text: "Make sure you're on a stable internet connection before starting.",
  },
];

export function TestStartDialog({
  open,
  onOpenChange,
  testId,
  testTitle,
  speeds,
}: TestStartDialogProps) {
  const router = useRouter();
  const [selectedSpeedId, setSelectedSpeedId] = useState<string | null>(
    () => speeds.find((s) => !s.hasAssessed)?.id ?? speeds[0]?.id ?? null,
  );

  const selectedSpeed = speeds.find((s) => s.id === selectedSpeedId);
  const isPractice = selectedSpeed?.hasAssessed ?? false;

  const createAttempt = trpc.attempt.create.useMutation({
    onSuccess: (attempt) => {
      onOpenChange(false);
      router.push(`/user/test/${testId}/attempt/${attempt.id}`);
    },
    onError: (err) =>
      toast.error(err.message ?? "Failed to start test. Please try again."),
  });

  const handleStart = () => {
    if (!selectedSpeedId) return;
    createAttempt.mutate({ testId, speedId: selectedSpeedId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant={isPractice ? "secondary" : "default"}>
              {isPractice ? "Practice" : "Assessment"}
            </Badge>
            {!isPractice && (
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-600"
              >
                First attempt
              </Badge>
            )}
          </div>
          <DialogTitle className="text-base leading-snug">
            {testTitle}
          </DialogTitle>
          {!isPractice && (
            <p className="text-muted-foreground text-sm">
              Your first attempt at this speed counts as an assessment. You can
              practice freely after.
            </p>
          )}
        </DialogHeader>

        {speeds.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Choose speed
            </p>
            <div className="flex flex-wrap gap-2">
              {speeds.map((s) => {
                const selected = s.id === selectedSpeedId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSpeedId(s.id)}
                    className={`flex flex-col gap-0.5 rounded-lg border-2 px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap
                        className={`h-3 w-3 ${selected ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span className="text-sm font-bold tabular-nums">
                        {s.wpm} WPM
                      </span>
                      {s.hasAssessed && (
                        <Badge
                          variant="secondary"
                          className="px-1 py-0 text-[9px]"
                        >
                          Practiced
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground text-[10px]">
                      {fmtSec(
                        s.dictationSeconds +
                          s.breakSeconds +
                          s.writtenDurationSeconds,
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Warnings */}
        <div className="space-y-2">
          {warnings.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="bg-muted mt-0.5 shrink-0 rounded-md p-1.5">
                <Icon className="text-muted-foreground h-3.5 w-3.5" />
              </div>
              <p className="text-muted-foreground text-sm leading-snug">
                {text}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={createAttempt.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={createAttempt.isPending || !selectedSpeedId}
            onClick={handleStart}
          >
            {createAttempt.isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Starting…
              </>
            ) : isPractice ? (
              <>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Start Practice
              </>
            ) : (
              <>Start Assessment</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
