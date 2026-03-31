"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Trash2 } from "lucide-react";
import { trpc } from "~/trpc/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeleteTestDialogProps {
  open: boolean;
  onClose: () => void;
  testId: string;
  testTitle: string;
}

export function DeleteTestDialog({
  open,
  onClose,
  testId,
  testTitle,
}: DeleteTestDialogProps) {
  const router = useRouter();
  const [confirmValue, setConfirmValue] = useState("");

  const { mutate: deleteTest, isPending } = trpc.test.delete.useMutation({
    onSuccess: () => {
      toast.success("Test deleted successfully");
      router.push("/admin/tests");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to delete test");
    },
  });

  const handleClose = () => {
    setConfirmValue("");
    onClose();
  };

  const isConfirmed = confirmValue.trim() === "confirm";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <Trash2 className="h-4 w-4 text-red-500" />
            </span>
            <DialogTitle>Delete Test</DialogTitle>
          </div>
          <DialogDescription>
            This action is{" "}
            <span className="text-foreground font-medium">permanent</span> and
            cannot be undone. All associated speeds and attempt data will be
            removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label htmlFor="confirm-title" className="text-sm">
            Type
            <span className="text-foreground select-all italic font-extrabold">
              "confirm"
            </span>
            to confirm
          </Label>
          <Input
            id="confirm-title"
            placeholder={testTitle}
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            className="text-sm"
            autoComplete="off"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteTest({ id: testId })}
            disabled={!isConfirmed || isPending}
          >
            {isPending ? "Deleting…" : "Delete Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
