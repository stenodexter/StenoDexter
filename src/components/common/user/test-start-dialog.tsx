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

// hasAttempted drives display only — server enforces the actual type
interface TestStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  testTitle: string;
  hasAttempted: boolean;
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
  hasAttempted,
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
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {hasAttempted ? "Practice" : "Assessment"}
            </span>
            {!hasAttempted && (
              <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                One-time only
              </span>
            )}
          </div>
          <DialogTitle className="text-lg leading-snug font-semibold">
            {testTitle}
          </DialogTitle>
          {!hasAttempted && (
            <p className="text-muted-foreground text-sm mt-1">
              You can only attempt this test once as an assessment. Practice
              mode unlocks after.
            </p>
          )}
        </DialogHeader>

        <div className="space-y-2.5 mb-5">
          {warnings.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="shrink-0 bg-muted rounded-md p-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground leading-snug">{text}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
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
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                Starting…
              </>
            ) : (
              <>Start {hasAttempted ? "practice" : "assessment"} →</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}