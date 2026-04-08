"use client";

// ─── components/common/send-notification-dialog.tsx ──────────────────────────
//
// Reusable "Send / Edit Notification" dialog.
//
// CREATE mode (default to Everyone):
//   <SendNotificationDialog open={open} onClose={() => setOpen(false)} />
//
// CREATE mode (pre-fill a specific user):
//   <SendNotificationDialog
//     open={open}
//     onClose={() => setOpen(false)}
//     initialRecipient={{ id, name, email, profilePicUrl }}
//   />
//
// EDIT mode:
//   <SendNotificationDialog
//     open={open}
//     onClose={() => setOpen(false)}
//     editNotification={{ id, title, message, to, link, isLinkExternal,
//                         userEmail, userName, userProfilePicUrl }}
//   />
//
// The recipient field is always editable — the admin can search for anyone
// or switch back to "Everyone" at any time, in both create and edit modes.

import { useState, useEffect, useRef } from "react";
import { trpc } from "~/trpc/react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Bell, Search, X, Users, Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

// ─── types ────────────────────────────────────────────────────────────────────

export type InitialRecipient = {
  id: string;
  name: string | null;
  email: string;
  userCode: string;
  profilePicUrl: string | null;
};

export type EditNotification = {
  id: string;
  title: string;
  message: string;
  /** "everyone" or a userId */
  to: string;
  link: string | null;
  isLinkExternal: boolean | null;
  userEmail: string | null;
  userName: string | null;
  userCode: string;
  userProfilePicUrl: string | null;
};

export type SendNotificationDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Pre-fill a specific user in create mode. Ignored when editNotification is set. */
  initialRecipient?: InitialRecipient;
  /** Pass to switch dialog into edit mode. */
  editNotification?: EditNotification;
  /** Called after a successful send or update so the parent can invalidate/refresh. */
  onSuccess?: () => void;
};

type Recipient =
  | { kind: "everyone" }
  | {
      kind: "user";
      id: string;
      name: string | null;
      email: string;
      userCode: string;
      profilePicUrl: string | null;
    };

const EVERYONE: Recipient = { kind: "everyone" };

function toValue(r: Recipient): string {
  return r.kind === "everyone" ? "everyone" : r.id;
}

function displayName(r: Recipient): string {
  return r.kind === "everyone" ? "Everyone" : (r.name ?? r.email);
}

function initials(name: string | null, email: string) {
  return (name ?? email)[0]?.toUpperCase() ?? "?";
}

// ─── recipient pill ───────────────────────────────────────────────────────────

function RecipientPill({
  recipient,
  onClear,
}: {
  recipient: Recipient;
  onClear: () => void;
}) {
  if (recipient.kind === "everyone") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 px-3 py-2 ring-1 ring-violet-500/20">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
          <Users className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-violet-300">Everyone</p>
          <p className="text-xs text-violet-400/60">All registered users</p>
        </div>
        <button
          onClick={onClear}
          className="text-violet-400/50 transition-colors hover:text-violet-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }
  return (
    <div className="bg-muted/30 flex items-center gap-2.5 rounded-lg border px-3 py-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={recipient.profilePicUrl ?? undefined} />
        <AvatarFallback className="text-xs font-semibold">
          {initials(recipient.name, recipient.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">{recipient.name ?? recipient.email}</p>
          <span className="bg-muted shrink-0 rounded-md px-2 py-0.5 font-mono text-xs">
            {recipient.userCode.toUpperCase()}
          </span>
        </div>
        {recipient.name && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {recipient.email}
          </p>
        )}
      </div>
      <button
        onClick={onClear}
        className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── recipient search ─────────────────────────────────────────────────────────

function RecipientSearch({ onSelect }: { onSelect: (r: Recipient) => void }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(query.trim()), 300);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data, isFetching } = trpc.analytics.getUsers.useQuery(
    {
      query: debounced,
      page: 1,
      pageSize: 8,
      sortField: "name",
      sortOrder: "asc",
    },
    { enabled: open, staleTime: 15_000 },
  );
  const users = data?.data ?? [];

  const pick = (r: Recipient) => {
    onSelect(r);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
        <Input
          value={query}
          placeholder="Change recipient — search by name or email…"
          className="h-9 pr-9 pl-9 text-sm"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {isFetching && open ? (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 animate-spin" />
        ) : query ? (
          <button
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && (
        <div className="bg-popover border-border absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-xl">
          {/* Everyone — always first */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              pick(EVERYONE);
            }}
            className="hover:bg-muted/50 flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
              <Users className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Everyone</p>
              <p className="text-muted-foreground text-xs">
                Notify all users at once
              </p>
            </div>
          </button>

          {users.length > 0 && (
            <>
              <div className="bg-muted/20 border-y px-3 py-1.5">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  Users
                </p>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick({
                        kind: "user",
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        userCode: u.userCode,
                        profilePicUrl: u.profilePicUrl,
                      });
                    }}
                    className="hover:bg-muted/50 flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={u.profilePicUrl ?? undefined} />
                      <AvatarFallback className="text-[10px] font-semibold">
                        {initials(u.name, u.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {u.name ?? u.email}
                      </p>
                      <span className="bg-muted shrink-0 rounded-md px-2 py-0.5 font-mono text-xs">
                        {u.userCode.toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {!isFetching && users.length === 0 && debounced && (
            <div className="px-3 py-5 text-center">
              <p className="text-muted-foreground text-sm">
                No users match &quot;{debounced}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main dialog ──────────────────────────────────────────────────────────────

export default function SendNotificationDialog({
  open,
  onClose,
  initialRecipient,
  editNotification,
  onSuccess,
}: SendNotificationDialogProps) {
  const isEditMode = !!editNotification;

  const [recipient, setRecipient] = useState<Recipient>(EVERYONE);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [isLinkExternal, setIsLinkExternal] = useState(false);
  const [done, setDone] = useState(false);

  // Reset / populate state whenever the dialog opens or the target notification changes
  useEffect(() => {
    if (!open) return;
    setDone(false);

    if (isEditMode && editNotification) {
      setTitle(editNotification.title);
      setMessage(editNotification.message);
      setLink(editNotification.link ?? "");
      setIsLinkExternal(editNotification.isLinkExternal ?? false);
      setRecipient(
        editNotification.to === "everyone"
          ? EVERYONE
          : {
              kind: "user",
              id: editNotification.to,
              name: editNotification.userName,
              userCode: editNotification.userCode,
              email: editNotification.userEmail ?? editNotification.to,
              profilePicUrl: editNotification.userProfilePicUrl,
            },
      );
    } else {
      setTitle("");
      setMessage("");
      setLink("");
      setIsLinkExternal(false);
      setRecipient(
        initialRecipient ? { kind: "user", ...initialRecipient } : EVERYONE,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditMode, editNotification?.id, initialRecipient?.id]);

  // ── mutations ────────────────────────────────────────────────────────────

  const send = trpc.notification.send.useMutation({
    onSuccess: () => {
      setDone(true);
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.notification.update.useMutation({
    onSuccess: () => {
      setDone(true);
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = send.isPending || update.isPending;

  // ── handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) return;
    const linkValue = link.trim() || undefined;

    if (isEditMode && editNotification) {
      update.mutate({
        id: editNotification.id,
        title: title.trim(),
        message: message.trim(),
        link: linkValue ?? null,
        isLinkExternal: linkValue ? isLinkExternal : undefined,
      });
    } else {
      send.mutate({
        title: title.trim(),
        message: message.trim(),
        to: toValue(recipient),
        link: linkValue,
        isLinkExternal: linkValue ? isLinkExternal : undefined,
      });
    }
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const canSubmit =
    title.trim().length > 0 && message.trim().length > 0 && !isPending;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            {isEditMode ? (
              <>
                <Pencil className="h-4 w-4" />
                Edit notification
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Send notification
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          /* ── success state ─────────────────────────────────────────────── */
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/20">
              <Check className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold">
                {isEditMode ? "Notification updated!" : "Notification sent!"}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {isEditMode ? (
                  "Your changes have been saved."
                ) : (
                  <>
                    Delivered to{" "}
                    <span className="text-foreground font-medium">
                      {displayName(recipient)}
                    </span>
                  </>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        ) : (
          /* ── form ──────────────────────────────────────────────────────── */
          <div className="flex flex-col gap-4">
            {/* To — shown in both modes; recipient switching is always available */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                To
              </Label>
              <RecipientPill
                recipient={recipient}
                onClear={() => setRecipient(EVERYONE)}
              />
              <RecipientSearch onSelect={setRecipient} />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Title
              </Label>
              <Input
                placeholder="e.g. New test available, Score updated…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
                maxLength={120}
                className="text-sm"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Message
              </Label>
              <Textarea
                placeholder="Write the notification body…"
                className="min-h-[90px] resize-none text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isPending}
                maxLength={1000}
              />
              <p className="text-muted-foreground text-right text-xs">
                {message.length}/1000
              </p>
            </div>

            {/* Link (optional) */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Link <span className="font-normal normal-case">(optional)</span>
              </Label>
              <Input
                placeholder="https://…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={isPending}
                type="url"
                className="text-sm"
              />
            </div>

            {/* External toggle — only when a link is entered */}
            {link.trim() && (
              <div className="flex items-center gap-2">
                <Switch
                  id="ext"
                  checked={isLinkExternal}
                  onCheckedChange={setIsLinkExternal}
                  disabled={isPending}
                />
                <Label
                  htmlFor="ext"
                  className="cursor-pointer text-sm font-normal"
                >
                  Open in new tab
                </Label>
              </div>
            )}

            {/* Inline error */}
            {(send.error ?? update.error) && (
              <p className="text-destructive text-xs">
                {(send.error ?? update.error)?.message}
              </p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {isEditMode ? "Saving…" : "Sending…"}
                  </>
                ) : isEditMode ? (
                  <>
                    <Pencil className="h-3.5 w-3.5" /> Save changes
                  </>
                ) : (
                  <>
                    <Bell className="h-3.5 w-3.5" /> Send
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
