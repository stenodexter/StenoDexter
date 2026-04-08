"use client";

// ─── components/user/user-navbar.tsx ─────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import {
  LogOut,
  User,
  Bell,
  ExternalLink,
  ArrowRight,
  Megaphone,
  Inbox,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "~/lib/utils";
import type { api } from "~/trpc/server";
import { trpc } from "~/trpc/react";
import { ThemeToggle } from "~/components/utils/theme-toggle";
import { authClient } from "~/server/better-auth/client";
import { useLocalStorage } from "~/hooks/use-local-storage";

// ─── types ────────────────────────────────────────────────────────────────────

interface NavbarProps {
  user: Awaited<ReturnType<typeof api.user.me>>;
}

type Notification = {
  id: string;
  title: string;
  message: string;
  to: string;
  link: string | null;
  isLinkExternal: boolean | null;
  createdAt: Date | string;
  seen: boolean;
};

// ─── notification item — sharp corners, modern style ─────────────────────────

function NotificationItem({
  notif,
  onRead,
  closeSheet,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  closeSheet: () => void;
}) {
  const router = useRouter();
  const hasLink = !!notif.link;

  const handleClick = () => {
    if (!notif.seen) onRead(notif.id);
    if (!notif.link) return;
    if (notif.isLinkExternal) {
      window.open(notif.link, "_blank", "noopener,noreferrer");
    } else {
      router.push(notif.link);
    }
    closeSheet();
  };

  const isBroadcast = notif.to === "everyone";

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex gap-0 border-b transition-colors last:border-0",
        hasLink ? "cursor-pointer" : "cursor-default",
      )}
    >
      {/* Unread accent bar */}
      <div
        className={cn(
          "w-[3px] shrink-0 self-stretch transition-colors",
          !notif.seen
            ? isBroadcast
              ? "bg-violet-500"
              : "bg-primary"
            : "bg-transparent",
        )}
      />

      <div
        className={cn(
          "flex flex-1 gap-3 px-4 py-4 transition-colors",
          hasLink && "group-hover:bg-muted/40",
          !notif.seen && "bg-muted/20",
        )}
      >
        {/* Icon square — no rounding */}
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center",
            isBroadcast
              ? "bg-violet-500/15 text-violet-400"
              : "bg-primary/10 text-primary",
          )}
        >
          {isBroadcast ? (
            <Megaphone className="h-3.5 w-3.5" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "text-sm leading-snug",
                notif.seen ? "text-foreground/75 font-medium" : "font-semibold",
              )}
            >
              {notif.title}
            </p>
            <span className="text-muted-foreground/50 shrink-0 text-[10px] tabular-nums">
              {formatDistanceToNow(new Date(notif.createdAt), {
                addSuffix: false,
              })}
            </span>
          </div>

          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
            {notif.message}
          </p>

          {hasLink && (
            <div
              className={cn(
                "mt-1.5 flex items-center gap-1 text-[10px] font-medium tracking-widest uppercase transition-opacity",
                "opacity-0 group-hover:opacity-100",
                notif.isLinkExternal ? "text-muted-foreground" : "text-primary",
              )}
            >
              {notif.isLinkExternal ? (
                <>
                  <ExternalLink className="h-2.5 w-2.5" /> Open link
                </>
              ) : (
                <>
                  <ArrowRight className="h-2.5 w-2.5" /> View
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── notification list ────────────────────────────────────────────────────────

function NotificationList({ close }: { close: () => void }) {
  const utils = trpc.useUtils();
  // FIX 2: useRef to ensure auto-mark only fires once per mount, even after data loads
  const hasAutoMarked = useRef(false);

  const { data, isLoading } = trpc.notification.list.useQuery(
    { page: 1, pageSize: 50 },
    { staleTime: 30_000 },
  );

  const markSeen = trpc.notification.markSeen.useMutation({
    onMutate: async ({ ids }) => {
      await utils.notification.list.cancel();
      await utils.notification.unreadCount.cancel();
      utils.notification.list.setData({ page: 1, pageSize: 50 }, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) =>
            ids.includes(n.id) ? { ...n, seen: true } : n,
          ),
        };
      });
    },
    onSettled: () => {
      void utils.notification.list.invalidate();
      void utils.notification.unreadCount.invalidate();
    },
  });

  const markAllSeen = trpc.notification.markAllSeen.useMutation({
    onMutate: async () => {
      await utils.notification.list.cancel();
      utils.notification.list.setData({ page: 1, pageSize: 50 }, (old) => {
        if (!old) return old;
        return { ...old, data: old.data.map((n) => ({ ...n, seen: true })) };
      });
    },
    onSettled: () => {
      void utils.notification.list.invalidate();
      void utils.notification.unreadCount.invalidate();
    },
  });

  const notifications: Notification[] = (data?.data ??
    []) as unknown as Notification[];

  useEffect(() => {
    if (hasAutoMarked.current || notifications.length === 0) return;
    const unreadIds = notifications
      .filter((n) => !n.seen) // ← all unread, not just no-link
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    hasAutoMarked.current = true;
    const t = setTimeout(() => markSeen.mutate({ ids: unreadIds }), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  const handleRead = (id: string) => {
    if (notifications.find((n) => n.id === id)?.seen) return;
    markSeen.mutate({ ids: [id] });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 border-b px-4 py-4">
            <Skeleton className="h-7 w-7 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="bg-muted flex h-12 w-12 items-center justify-center">
          <Inbox className="text-muted-foreground h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">All caught up</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            No notifications yet
          </p>
        </div>
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.seen).length;

  return (
    <>
      {/* Mark all read — only if there are unread */}
      {unread > 0 && (
        <div className="border-b px-4 py-2">
          <button
            onClick={() => markAllSeen.mutate()}
            disabled={markAllSeen.isPending}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[11px] font-medium transition-colors disabled:opacity-50"
          >
            <CheckCheck className="h-3 w-3" />
            Mark all as read
          </button>
        </div>
      )}

      <div className="flex flex-col">
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            notif={n}
            onRead={handleRead}
            closeSheet={close}
          />
        ))}
      </div>
    </>
  );
}

// ─── notification center bell ─────────────────────────────────────────────────

function NotificationCenter() {
  const [open, setOpen] = useState(false);

  // FIX 1: Badge count always comes from the server query.
  // markSeen / markAllSeen both invalidate unreadCount, so the badge
  // stays accurate without any local unread state or onUnreadCountChange prop.
  const { data: countData } = trpc.notification.unreadCount.useQuery(
    undefined,
    { staleTime: 20_000, refetchInterval: 60_000 },
  );
  const badgeCount = countData?.count ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {badgeCount > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold tabular-nums">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
        <SheetHeader className="border-b px-4 py-3.5">
          <SheetTitle className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
            <Bell className="h-4 w-4" />
            Notifications
            {badgeCount > 0 && (
              <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] leading-none font-bold tabular-nums">
                {badgeCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            {open && <NotificationList close={() => setOpen(false)} />}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── navbar ───────────────────────────────────────────────────────────────────

export function UserNavbar({ user }: NavbarProps) {
  const router = useRouter();

  const [_isOpen, setIsOpen] = useLocalStorage<boolean>("sidebar-open", true);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger onClick={() => setIsOpen((prev) => !prev)} />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <span className="text-sm font-semibold">Hi, {user.name}</span>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={user.profilePicUrl ?? ""} alt={user.name} />
              <AvatarFallback>
                {user?.name?.[0] ?? user?.email?.[0] ?? "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>

            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                authClient.signOut();
                router.push("/user/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
