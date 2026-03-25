"use client";

// ─── app/admin/admissions/_components/reject-dialog.tsx ──────────────────────

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { XCircle } from "lucide-react";

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userName: string;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}

export function RejectDialog({
  open,
  onOpenChange,
  userName,
  onConfirm,
  isLoading,
}: RejectDialogProps) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    onConfirm(reason.trim());
  }

  function handleOpenChange(v: boolean) {
    if (!v && !isLoading) {
      setReason("");
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Reject Payment
          </DialogTitle>
          <DialogDescription>
            You're rejecting the payment submitted by{" "}
            <span className="text-foreground font-medium">{userName}</span>.
            Optionally provide a reason — it helps them resubmit correctly.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="e.g. Screenshot unclear, amount doesn't match, transaction ID missing…"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isLoading}
          className="resize-none"
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={"destructive"}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Rejecting…
              </>
            ) : (
              <>Confirm Rejection</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
