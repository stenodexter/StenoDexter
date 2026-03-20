"use client";

// ─── app/admin/invites/page.tsx ───────────────────────────────────────────────

import { useState, useEffect } from "react";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Ban,
  Link2,
  Users,
  Shield,
  ShieldOff,
  ShieldCheck,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "~/lib/utils";
import type { InviteStatus } from "~/server/api/routers/admin/invite/invite.schema";

// ─── types ────────────────────────────────────────────────────────────────────

type Invite = {
  id: string;
  token: string;
  maxUses: number;
  usedCount: number;
  expiresAt: Date | null;
  createdAt: Date;
  status: InviteStatus;
  createdBy: { id: string; name: string; username: string } | null;
};

type AdminRow = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  isSuper: boolean;
  isSystem: boolean;
  createdAt: Date;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function inviteUrl(token: string) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/admin/register?token=${token}`;
}

const STATUS_CONFIG: Record<InviteStatus, { label: string; cls: string }> = {
  active: {
    label: "Active",
    cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  },
  invalidated: {
    label: "Invalidated",
    cls: "bg-red-500/10 text-red-400 ring-red-500/20",
  },
  expired: {
    label: "Expired",
    cls: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20",
  },
  limit_reached: {
    label: "Limit reached",
    cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  },
};

function StatusBadge({ status }: { status: InviteStatus }) {
  const { label, cls } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-widest uppercase ring-1 ring-inset ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copy}>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

// ─── create invite dialog ─────────────────────────────────────────────────────

function CreateInviteDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [maxUses, setMaxUses] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [created, setCreated] = useState<Invite | null>(null);

  const utils = trpc.useUtils();
  const create = trpc.admin.invite.create.useMutation({
    onSuccess: (data) => {
      setCreated(data as unknown as Invite);
      void utils.admin.invite.list.invalidate();
    },
  });

  const handleCreate = () => {
    create.mutate({
      maxUses: parseInt(maxUses, 10),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
  };

  const handleClose = () => {
    setMaxUses("1");
    setExpiresAt("");
    setCreated(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="text-primary h-4 w-4" />
            Create invite link
          </DialogTitle>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="bg-muted/30 flex items-center gap-2 rounded-lg border p-3">
              <code className="text-primary min-w-0 flex-1 truncate font-mono text-xs">
                {inviteUrl(created.token)}
              </code>
              <CopyButton text={inviteUrl(created.token)} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  Max uses
                </p>
                <p className="mt-0.5 font-semibold">{created.maxUses}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  Expires
                </p>
                <p className="mt-0.5 font-semibold">
                  {created.expiresAt
                    ? format(new Date(created.expiresAt), "dd MMM yyyy")
                    : "Never"}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Share this link with the admin you want to invite. It won&apos;t
              be shown again.
            </p>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Max uses
              </label>
              <Input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="1"
                className="text-sm"
              />
              <p className="text-muted-foreground text-xs">
                How many admins can register with this link.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Expiry date{" "}
                <span className="font-normal normal-case">(optional)</span>
              </label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="text-sm"
              />
            </div>
            {create.error && (
              <p className="text-destructive text-xs">{create.error.message}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!maxUses || parseInt(maxUses) < 1 || create.isPending}
              >
                {create.isPending ? "Creating…" : "Create invite"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── edit invite dialog ───────────────────────────────────────────────────────

function EditInviteDialog({
  invite,
  open,
  onClose,
}: {
  invite: Invite | null;
  open: boolean;
  onClose: () => void;
}) {
  const [maxUses, setMaxUses] = useState(String(invite?.maxUses ?? 1));
  const [expiresAt, setExpiresAt] = useState(
    invite?.expiresAt
      ? format(new Date(invite.expiresAt), "yyyy-MM-dd'T'HH:mm")
      : "",
  );

  // Sync fields when a different invite is opened
  useEffect(() => {
    setMaxUses(String(invite?.maxUses ?? 1));
    setExpiresAt(
      invite?.expiresAt
        ? format(new Date(invite.expiresAt), "yyyy-MM-dd'T'HH:mm")
        : "",
    );
  }, [invite?.id]);

  const utils = trpc.useUtils();

  const update = trpc.admin.invite.update.useMutation({
    onSuccess: () => {
      void utils.admin.invite.list.invalidate();
      onClose();
    },
  });

  const invalidateMutation = trpc.admin.invite.update.useMutation({
    onSuccess: () => {
      void utils.admin.invite.list.invalidate();
      onClose();
    },
  });

  const handleSave = () => {
    if (!invite) return;
    update.mutate({
      id: invite.id,
      maxUses: parseInt(maxUses, 10),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
  };

  const handleInvalidate = () => {
    if (!invite) return;
    invalidateMutation.mutate({ id: invite.id, invalidate: true });
  };

  const isActive = invite?.status === "active";
  const busy = update.isPending || invalidateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="text-primary h-4 w-4" />
            Edit invite
          </DialogTitle>
        </DialogHeader>

        {invite && (
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <code className="text-primary font-mono text-xs font-semibold tracking-wider">
              {invite.token}
            </code>
            <StatusBadge status={invite.status} />
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Max uses
            </label>
            <Input
              type="number"
              min={invite?.usedCount ?? 1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="text-sm"
            />
            {invite && invite.usedCount > 0 && (
              <p className="text-muted-foreground text-xs">
                Already used {invite.usedCount} time
                {invite.usedCount > 1 ? "s" : ""}. Min value is{" "}
                {invite.usedCount}.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Expiry date{" "}
              <span className="font-normal normal-case">
                (leave blank for never)
              </span>
            </label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="text-sm"
            />
          </div>

          {(update.error ?? invalidateMutation.error) && (
            <p className="text-destructive text-xs">
              {update.error?.message ?? invalidateMutation.error?.message}
            </p>
          )}
        </div>

        {/* Footer: Invalidate left, Cancel + Save right */}
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {isActive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                    disabled={busy}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Invalidate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Invalidate this invite?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Token{" "}
                      <code className="text-foreground">{invite?.token}</code>{" "}
                      will stop accepting new registrations immediately. This
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-amber-500 text-white hover:bg-amber-400"
                      onClick={handleInvalidate}
                    >
                      Invalidate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!maxUses || parseInt(maxUses) < 1 || busy}
            >
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── invites table ────────────────────────────────────────────────────────────

function InvitesTable() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editInvite, setEditInvite] = useState<Invite | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();
  const { data: invites, isLoading } = trpc.admin.invite.list.useQuery(
    undefined,
    { staleTime: 30_000 },
  );

  const invalidate = trpc.admin.invite.update.useMutation({
    onSuccess: () => void utils.admin.invite.list.invalidate(),
  });
  const deleteOne = trpc.admin.invite.delete.useMutation({
    onSuccess: () => void utils.admin.invite.list.invalidate(),
  });
  const deleteMany = trpc.admin.invite.deleteMany.useMutation({
    onSuccess: () => {
      void utils.admin.invite.list.invalidate();
      setSelected(new Set());
    },
  });

  const toggleSelect = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected((p) =>
      p.size === (invites?.length ?? 0)
        ? new Set()
        : new Set(invites?.map((i) => i.id)),
    );

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              {[
                "",
                "Token",
                "Status",
                "Uses",
                "Expires",
                "Created by",
                "Created",
                "",
              ].map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-2.5 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j} className="py-3">
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const rows = (invites ?? []) as Invite[];

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete {selected.size} selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {selected.size} invite{selected.size > 1 ? "s" : ""}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    These invite links will stop working immediately. This
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() =>
                      deleteMany.mutate({ ids: Array.from(selected) })
                    }
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New invite
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Link2 className="text-muted-foreground/30 mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm">No invite links yet</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create first invite
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={toggleAll}
                  />
                </TableHead>
                {[
                  "Token",
                  "Status",
                  "Uses",
                  "Expires",
                  "Created by",
                  "Created",
                  "",
                ].map((h) => (
                  <TableHead key={h}>
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                      {h}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inv) => (
                <TableRow
                  key={inv.id}
                  className={cn(selected.has(inv.id) && "bg-muted/30")}
                >
                  {/* Checkbox */}
                  <TableCell className="py-3">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={selected.has(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                    />
                  </TableCell>

                  {/* Token + copy */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5">
                      <code className="text-primary font-mono text-xs font-semibold tracking-wider">
                        {inv.token}
                      </code>
                      <CopyButton text={inviteUrl(inv.token)} />
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3">
                    <StatusBadge status={inv.status} />
                  </TableCell>

                  {/* Uses */}
                  <TableCell className="py-3 tabular-nums">
                    <span className="text-sm">
                      {inv.usedCount}
                      <span className="text-muted-foreground">
                        /{inv.maxUses}
                      </span>
                    </span>
                  </TableCell>

                  {/* Expires — plain null check, no sentinel needed */}
                  <TableCell className="py-3">
                    {inv.expiresAt ? (
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          inv.status === "expired" && "text-red-400",
                        )}
                      >
                        {format(new Date(inv.expiresAt), "dd MMM yy")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>

                  {/* Created by */}
                  <TableCell className="text-muted-foreground py-3 text-xs">
                    {inv.createdBy?.name ?? "—"}
                  </TableCell>

                  {/* Created at */}
                  <TableCell className="text-muted-foreground py-3 text-xs tabular-nums">
                    {formatDistanceToNow(new Date(inv.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>

                  {/* 3-dot dropdown */}
                  <TableCell className="py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setEditInvite(inv)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>

                        {inv.status === "active" && (
                          <DropdownMenuItem
                            className="text-amber-500 focus:text-amber-500"
                            onClick={() =>
                              invalidate.mutate({
                                id: inv.id,
                                invalidate: true,
                              })
                            }
                          >
                            <Ban className="mr-2 h-3.5 w-3.5" />
                            Invalidate
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this invite?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Token{" "}
                                <code className="text-foreground">
                                  {inv.token}
                                </code>{" "}
                                will stop working immediately and cannot be
                                recovered.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteOne.mutate({ id: inv.id })}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateInviteDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <EditInviteDialog
        invite={editInvite}
        open={!!editInvite}
        onClose={() => setEditInvite(null)}
      />
    </>
  );
}

// ─── admins table ─────────────────────────────────────────────────────────────

function AdminsTable({ currentAdminId }: { currentAdminId: string }) {
  const utils = trpc.useUtils();
  const { data: admins, isLoading } = trpc.admin.invite.listAdmins.useQuery(
    undefined,
    { staleTime: 30_000 },
  );

  const promote = trpc.admin.invite.promoteToSuper.useMutation({
    onSuccess: () => void utils.admin.invite.listAdmins.invalidate(),
  });
  const demote = trpc.admin.invite.demoteFromSuper.useMutation({
    onSuccess: () => void utils.admin.invite.listAdmins.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="py-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-7 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const rows = (admins ?? []) as AdminRow[];

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-12" />
            {["Admin", "Role", "Joined", ""].map((h) => (
              <TableHead key={h}>
                <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  {h}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => {
            const isSelf = a.id === currentAdminId;
            const cantModify = a.isSystem || isSelf;
            return (
              <TableRow key={a.id}>
                <TableCell className="py-3 pl-4">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs font-semibold">
                      {initials(a.name)}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>

                <TableCell className="py-3">
                  <p className="text-sm leading-none font-medium">
                    {a.name}
                    {isSelf && (
                      <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    @{a.username}
                  </p>
                </TableCell>

                <TableCell className="py-3">
                  {a.isSystem ? (
                    <span className="inline-flex items-center gap-1 rounded bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-zinc-400 uppercase ring-1 ring-zinc-500/20">
                      <Shield className="h-2.5 w-2.5" />
                      System
                    </span>
                  ) : a.isSuper ? (
                    <span className="inline-flex items-center gap-1 rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-violet-400 uppercase ring-1 ring-violet-500/20">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      Super admin
                    </span>
                  ) : (
                    <span className="bg-muted text-muted-foreground ring-border inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-widest uppercase ring-1">
                      <Shield className="h-2.5 w-2.5" />
                      Admin
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-muted-foreground py-3 text-xs tabular-nums">
                  {formatDistanceToNow(new Date(a.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>

                <TableCell className="py-3 text-right">
                  {cantModify ? (
                    <span className="text-muted-foreground/30 text-xs">—</span>
                  ) : a.isSuper ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          Demote
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Demote {a.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            They will lose super admin privileges and won&apos;t
                            be able to manage invites or promote other admins.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => demote.mutate({ adminId: a.id })}
                          >
                            Demote
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" className="h-7 gap-1.5 text-xs">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Promote
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Promote {a.name} to super admin?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            They will be able to create invite links, manage
                            other admins, and access all super admin features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => promote.mutate({ adminId: a.id })}
                          >
                            Promote
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminInvitesPage() {
  const { data: me } = trpc.admin.auth.me.useQuery();

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Invites & Admins
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Manage invite links and admin role permissions.
        </p>
      </div>

      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <Link2 className="text-muted-foreground h-4 w-4" />
          <h2 className="text-base font-semibold">Invite links</h2>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(STATUS_CONFIG).map(([key, { label, cls }]) => (
            <span
              key={key}
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-widest uppercase ring-1 ring-inset ${cls}`}
            >
              {label}
            </span>
          ))}
        </div>
        <InvitesTable />
      </section>

      <Separator />

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Users className="text-muted-foreground h-4 w-4" />
          <h2 className="text-base font-semibold">Admin roster</h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Promote admins to super admin or revoke the role. System admins and
          your own account cannot be modified.
        </p>
        <AdminsTable currentAdminId={me?.id ?? ""} />
      </section>
    </div>
  );
}
