// app/(user)/typing-tests/_components/typing-test-start-dialog.tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Clock,
  Loader2,
  PlayCircle,
  RotateCcw,
  Wifi,
  Maximize,
} from "lucide-react";

type TypingTestCard = {
  id: string;
  title: string;
  durationSeconds: number;
  isAssessed: boolean;
  userAttemptCount: number;
};

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

const warnings = [
  {
    icon: Maximize,
    text: "The test runs in fullscreen. Stay in fullscreen throughout.",
  },
  {
    icon: Wifi,
    text: "Ensure a stable internet connection before starting.",
  },
];

export function TypingTestStartDialog({
  open,
  onOpenChange,
  test,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  test: TypingTestCard;
}) {
  const router = useRouter();

  const createAttempt = trpc.typingTest.attempt.create.useMutation({
    onSuccess: (attempt) => {
      onOpenChange(false);
      router.push(`/user/typing-test/${test.id}/attempt/${attempt.id}`);
    },
    onError: (e) => toast.error(e.message ?? "Failed to start. Try again."),
  });

  const isPractice = test.isAssessed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant={isPractice ? "secondary" : "default"}>
              {isPractice ? "Practice" : "Test"}
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
            {test.title}
          </DialogTitle>
          {isPractice ? (
            <p className="text-muted-foreground text-sm">
              You&apos;ve already assessed this test ({test.userAttemptCount}{" "}
              attempt{test.userAttemptCount !== 1 ? "s" : ""}). This will be a
              practice run.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              This is your first attempt — it counts as your official test. You
              can practice freely afterwards.
            </p>
          )}
        </DialogHeader>

        {/* test info */}
        <div className="bg-muted/40 flex items-center gap-2 rounded-lg px-4 py-3">
          <Clock className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">
            {fmtDuration(test.durationSeconds)}
          </span>
          <span className="text-muted-foreground text-xs">typing window</span>
        </div>

        {/* warnings */}
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
            disabled={createAttempt.isPending}
            onClick={() => createAttempt.mutate({ testId: test.id })}
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
              <>
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                Start Test
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
