"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

export function DeleteTypingTestDialog({
  open,
  onClose,
  testId,
  testTitle,
}: {
  open: boolean;
  onClose: () => void;
  testId: string;
  testTitle: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const del = trpc.typingTest.manage.delete.useMutation({
    onSuccess: () => {
      toast.success("Test deleted");
      utils.typingTest.manage.list.invalidate();
      onClose();
      router.push("/admin/typing-tests");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete typing test?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium">&ldquo;{testTitle}&rdquo;</span> and
            all its attempts and results will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-500"
            onClick={() => del.mutate({ id: testId })}
            disabled={del.isPending}
          >
            {del.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
