"use client";

// ─── app/admin/notifications/page.tsx ────────────────────────────────────────

import { useState, useMemo } from "react";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Globe,
  User,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { EditNotification } from "~/components/common/admin/send-notification";
import SendNotificationDialog from "~/components/common/admin/send-notification";

// ─── types ────────────────────────────────────────────────────────────────────

type Notification = {
  id: string;
  title: string;
  message: string;
  to: string;
  seenBy: string[] | null;
  link: string | null;
  isLinkExternal: boolean | null;
  createdAt: Date;
  userEmail: string | null;
  userName: string | null;
  userProfilePicUrl: string | null;
  userCode: string;
};

type DialogMode = "create" | "edit" | "view" | "delete" | "deleteMany" | null;

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

// ─── helpers ──────────────────────────────────────────────────────────────────

function RecipientBadge({
  to,
  userEmail,
}: {
  to: string;
  userEmail: string | null;
}) {
  const isEveryone = to === "everyone";
  return (
    <Badge
      variant="outline"
      className={`gap-1 font-mono text-[10px] ${
        isEveryone
          ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
          : "border-blue-500/30 bg-blue-500/10 text-blue-400"
      }`}
    >
      {isEveryone ? (
        <Globe className="h-2.5 w-2.5" />
      ) : (
        <User className="h-2.5 w-2.5" />
      )}
      {isEveryone ? "Everyone" : userEmail}
    </Badge>
  );
}

// ─── view dialog ──────────────────────────────────────────────────────────────

function ViewDialog({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notification details</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Title
            </p>
            <p className="text-sm font-medium">{notification.title}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Message
            </p>
            <p className="text-sm leading-relaxed">{notification.message}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Recipient
            </p>
            <RecipientBadge
              to={notification.to}
              userEmail={notification.userEmail ?? null}
            />
          </div>
          {notification.link && (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Link
              </p>
              <a
                href={notification.link}
                target={notification.isLinkExternal ? "_blank" : "_self"}
                rel="noreferrer"
                className="flex items-center gap-1 text-sm text-blue-400 underline-offset-4 hover:underline"
              >
                <LinkIcon className="h-3 w-3" />
                {notification.link}
              </a>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Seen by
              </p>
              <p className="text-sm font-semibold">
                {notification.seenBy?.length ?? 0} user
                {(notification.seenBy?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Created
              </p>
              <p className="text-sm">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── delete confirm ───────────────────────────────────────────────────────────

function DeleteDialog({
  ids,
  onConfirm,
  onClose,
  loading,
}: {
  ids: string[];
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const isBulk = ids.length > 1;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            {isBulk
              ? `Delete ${ids.length} notifications?`
              : "Delete notification?"}
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  // ── pagination / filter state ──────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── selection ──────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── dialog state ───────────────────────────────────────────────────────────
  const [mode, setMode] = useState<DialogMode>(null);
  const [activeNotif, setActiveNotif] = useState<Notification | null>(null);

  // ── data ───────────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.notification.listAll.useQuery({
    page,
    pageSize,
  });

  const filtered = useMemo(() => {
    if (!data?.data) return [];
    if (!debouncedSearch) return data.data;
    const q = debouncedSearch.toLowerCase();
    return data.data.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.to.toLowerCase().includes(q),
    );
  }, [data, debouncedSearch]);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 300);
  };

  const invalidate = () => utils.notification.listAll.invalidate();

  // ── mutations (delete only — send/update handled by dialog) ───────────────

  const del = trpc.notification.delete.useMutation({
    onSuccess: () => {
      toast.success("Deleted");
      setMode(null);
      setSelected(new Set());
      void invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const delMany = trpc.notification.deleteMany.useMutation({
    onSuccess: () => {
      toast.success(`Deleted ${selected.size} notifications`);
      setMode(null);
      setSelected(new Set());
      void invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const isDeleting = del.isPending || delMany.isPending;

  // ── handlers ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setActiveNotif(null);
    setMode("create");
  };

  const openEdit = (n: Notification) => {
    setActiveNotif(n);
    setMode("edit");
  };

  const openView = (n: Notification) => {
    setActiveNotif(n);
    setMode("view");
  };

  const openDelete = (n: Notification) => {
    setActiveNotif(n);
    setMode("delete");
  };

  const openDeleteMany = () => setMode("deleteMany");

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((n) => n.id)));
    }
  };

  // Build EditNotification shape from the active notification
  const editPayload: EditNotification | undefined =
    mode === "edit" && activeNotif
      ? {
          id: activeNotif.id,
          title: activeNotif.title,
          message: activeNotif.message,
          to: activeNotif.to,
          link: activeNotif.link,
          isLinkExternal: activeNotif.isLinkExternal,
          userEmail: activeNotif.userEmail,
          userName: activeNotif.userName ?? null,
          userProfilePicUrl: activeNotif.userProfilePicUrl ?? null,
          userCode: activeNotif.userCode,
        }
      : undefined;

  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const visiblePages = () => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-5 px-6 py-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="text-muted-foreground text-sm">
            {meta ? `${meta.total} total` : "Manage system notifications"}
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Send notification
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search title, message, recipient…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={openDeleteMany}
            className="shrink-0 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {selected.size}
          </Button>
        )}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v) as PageSize);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border">
        {/* Head */}
        <div className="bg-muted/40 grid grid-cols-[32px_1fr_200px_80px_120px_44px] items-center gap-3 border-b px-4 py-2">
          <Checkbox
            checked={filtered.length > 0 && selected.size === filtered.length}
            onCheckedChange={toggleAll}
            aria-label="Select all"
          />
          {["Title & Message", "Recipient", "Seen by", "Sent", ""].map(
            (h, i) => (
              <span
                key={i}
                className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase"
              >
                {h}
              </span>
            ),
          )}
        </div>

        {/* Body */}
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[32px_1fr_200px_80px_120px_44px] items-center gap-3 border-b px-4 py-3 last:border-0"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-3.5 w-8" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              {debouncedSearch
                ? "No notifications match your search"
                : "No notifications yet"}
            </p>
          </div>
        ) : (
          filtered.map((n, idx) => (
            <div
              key={n.id}
              className={[
                "group hover:bg-muted/40 grid grid-cols-[32px_1fr_200px_80px_120px_44px] items-center gap-3 px-4 py-3 transition-colors",
                idx !== filtered.length - 1 ? "border-b" : "",
                selected.has(n.id) ? "bg-primary/5" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Checkbox
                checked={selected.has(n.id)}
                onCheckedChange={() => toggleSelect(n.id)}
                aria-label="Select row"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{n.title}</p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {n.message}
                </p>
              </div>

              <RecipientBadge to={n.to} userEmail={n.userEmail} />

              <p className="text-muted-foreground text-sm tabular-nums">
                {n.seenBy?.length ?? 0}
              </p>

              <p className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(n.createdAt), {
                  addSuffix: true,
                })}
              </p>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => openView(n as any)}>
                    <Eye className="mr-2 h-3.5 w-3.5" /> View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(n as any)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => openDelete(n as any)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-muted-foreground text-xs tabular-nums">
            {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, meta?.total ?? 0)} of {meta?.total ?? 0}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {visiblePages().map((pg) => (
              <Button
                key={pg}
                variant={pg === page ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 text-xs"
                onClick={() => setPage(pg)}
              >
                {pg}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Send / Edit dialog (shared) ──────────────────────────────────── */}
      <SendNotificationDialog
        open={mode === "create" || mode === "edit"}
        onClose={() => setMode(null)}
        editNotification={editPayload}
        onSuccess={() => {
          setMode(null);
          void invalidate();
        }}
      />

      {/* ── View dialog ──────────────────────────────────────────────────── */}
      {mode === "view" && activeNotif && (
        <ViewDialog notification={activeNotif} onClose={() => setMode(null)} />
      )}

      {/* ── Delete single ────────────────────────────────────────────────── */}
      {mode === "delete" && activeNotif && (
        <DeleteDialog
          ids={[activeNotif.id]}
          loading={isDeleting}
          onClose={() => setMode(null)}
          onConfirm={() => del.mutate({ id: activeNotif.id })}
        />
      )}

      {/* ── Delete many ──────────────────────────────────────────────────── */}
      {mode === "deleteMany" && (
        <DeleteDialog
          ids={Array.from(selected)}
          loading={isDeleting}
          onClose={() => setMode(null)}
          onConfirm={() => delMany.mutate({ ids: Array.from(selected) })}
        />
      )}
    </div>
  );
}
