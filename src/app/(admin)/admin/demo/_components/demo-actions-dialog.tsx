"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
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
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  KeyRound,
  ShieldOff,
  LogOut,
  Monitor,
  CalendarIcon,
  Copy,
  Check,
  Loader2,
  Trash2,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { trpc } from "~/trpc/react";
import { cn } from "~/lib/utils";
import type { DemoUserRow } from "../page";

// ─── Reset Password ───────────────────────────────────────────────────────────

function ResetPasswordSection({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const { mutate, isPending } = trpc.dus.resetPassword.useMutation({
    onSuccess: (data) => setResult(data.tempPassword),
    onError: (err) => toast.error(err.message),
  });

  function handleCopy() {
    if (!result) return;
    void navigator.clipboard.writeText(
      `Email: ${userEmail}\nPassword: ${result}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium">
          New temporary password
        </p>
        <div className="bg-muted/40 flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <code className="text-sm">{result}</code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <p className="text-muted-foreground text-[11px]">
          This won't be shown again after closing.
        </p>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setConfirm(true)}
        disabled={isPending}
      >
        <KeyRound className="h-3.5 w-3.5" />
        Reset password
      </Button>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password?</AlertDialogTitle>
            <AlertDialogDescription>
              Generate a new temporary password for{" "}
              <span className="text-foreground font-mono">{userEmail}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutate({ id: userId })}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Edit Expiry ──────────────────────────────────────────────────────────────

function EditExpirySection({
  userId,
  currentExpiry,
}: {
  userId: string;
  currentExpiry: Date | null;
}) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState<Date | undefined>(
    currentExpiry ?? undefined,
  );
  const [calOpen, setCalOpen] = useState(false);

  const { mutate, isPending } = trpc.dus.edit.useMutation({
    onSuccess: () => {
      toast.success("Expiry updated");
      void utils.dus.list.invalidate();
      setEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs">Expires</p>
          <p className="text-sm font-medium">
            {currentExpiry
              ? format(new Date(currentExpiry), "do MMM yyyy, HH:mm")
              : "Never"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">New expiry date</p>
      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4 opacity-50" />
            {date ? format(date, "do MMM, yyyy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) {
                const now = new Date();
                d.setHours(
                  now.getHours(),
                  now.getMinutes(),
                  now.getSeconds(),
                  0,
                );
              }
              setDate(d);
              setCalOpen(false);
            }}
            disabled={(d) => d < new Date()}
            initialFocus
          />
          <div className="border-t px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 w-full text-xs"
              onClick={() => {
                setDate(undefined);
                setCalOpen(false);
              }}
            >
              Clear (no expiry)
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => mutate({ id: userId, expiresAt: date ?? null })}
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDate(currentExpiry ?? undefined);
            setEditing(false);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function DemoUserActionsDialog({
  user,
  onClose,
}: {
  user: DemoUserRow | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { mutate: revoke, isPending: revoking } = trpc.dus.revoke.useMutation({
    onSuccess: () => {
      toast.success("Demo user revoked");
      void utils.dus.list.invalidate();
      setConfirmRevoke(false);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteUser, isPending: deleting } =
    trpc.dus.delete.useMutation({
      onSuccess: () => {
        toast.success("Demo user deleted");
        void utils.dus.list.invalidate();
        setConfirmDelete(false);
        onClose();
      },
      onError: (err) => toast.error(err.message),
    });

  if (!user) return null;

  return (
    <>
      <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">
              {user.userCode ?? user.email}
            </DialogTitle>
            <DialogDescription>{user.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Expiry */}
            <section className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Expiry
              </p>
              <EditExpirySection
                userId={user.id}
                currentExpiry={user.demoExpiresAt}
              />
            </section>

            <div className="border-t" />

            {/* Password */}
            <section className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Password
              </p>
              <ResetPasswordSection userId={user.id} userEmail={user.email} />
            </section>
            <div className="border-t" />
            <span className="flex items-center justify-between">
              {/* Revoke access — only if not already revoked */}
              {!user.demoRevoked && (
                <>
                  <section>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmRevoke(true)}
                      disabled={revoking}
                    >
                      <ShieldOff className="h-3.5 w-3.5" />
                      Revoke demo access
                    </Button>
                  </section>
                </>
              )}

              <section>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete demo user
                </Button>
              </section>
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke demo access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke all sessions for{" "}
              <span className="text-foreground font-mono">{user.email}</span>{" "}
              and prevent further logins. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={revoking}
              onClick={() => revoke({ id: user.id })}
            >
              {revoking ? "Revoking…" : "Revoke access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all sessions, credentials, and the account for{" "}
              <span className="text-foreground font-mono">{user.email}</span>.{" "}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => deleteUser({ id: user.id })}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
