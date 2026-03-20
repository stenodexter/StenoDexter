"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Maximize, Wifi, RefreshCw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/react";
import { toast } from "sonner";

// isPractice drives display only — server enforces the actual type
interface TestStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  testTitle: string;
  isPractice: boolean;
}

const warnings = [
  {
    icon: Maximize,
    text: "The test runs in fullscreen. You can exit, but it's recommended to stay in fullscreen throughout.",
  },
  {
    icon: RefreshCw,
    text: "You can reload the page — your progress is saved and you'll resume where you left off.",
  },
  {
    icon: Wifi,
    text: "Make sure you're on a stable internet connection.",
  },
];

export function TestStartDialog({
  open,
  onOpenChange,
  testId,
  testTitle,
  isPractice,
}: TestStartDialogProps) {
  const router = useRouter();

  const createAttempt = trpc.attempt.create.useMutation({
    onSuccess: (attempt) => {
      onOpenChange(false);
      router.push(`/user/test/${testId}/attempt/${attempt.id}`);
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to start test. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-6">
        <DialogHeader className="mb-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {isPractice ? "Practice" : "Assessment"}
            </span>
            {!isPractice && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                One-time only
              </span>
            )}
          </div>
          <DialogTitle className="text-lg leading-snug font-semibold">
            {testTitle}
          </DialogTitle>
          {!isPractice && (
            <p className="text-muted-foreground mt-1 text-sm">
              You can only attempt this test once as an assessment. Practice
              mode unlocks after.
            </p>
          )}
        </DialogHeader>

        <div className="mb-5 space-y-2.5">
          {warnings.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="bg-muted shrink-0 rounded-md p-1.5">
                <Icon className="text-muted-foreground h-3.5 w-3.5" />
              </div>
              <p className="text-muted-foreground text-sm leading-snug">
                {text}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() => createAttempt.mutate({ testId })}
          >
            {createAttempt.isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Starting…
              </>
            ) : (
              <>Start {isPractice ? "practice" : "assessment"} →</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
