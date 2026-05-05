"use client";

// ─── app/admin/_components/dashboard-client.tsx ───────────────────────────────

import { Suspense, useState } from "react";
import { trpc } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Users,
  FileText,
  Activity,
  Plus,
  Gavel,
  Layers,
  BookOpen,
  ArrowRight,
  ExternalLink,
  TrendingUp,
  Clock,
  Target,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  CreditCard,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { RejectDialog } from "../admissions/_components/rejection-dialog";
import { ScreenshotDialog } from "../admissions/_components/screenshot-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function AccuracyBadge({ v }: { v: number }) {
  const cls =
    v >= 90
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : v >= 70
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-red-500/10 text-red-600 dark:text-red-400";
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        cls,
      )}
    >
      {v}%
    </span>
  );
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  legal: <Gavel className="h-3 w-3" />,
  general: <FileText className="h-3 w-3" />,
  special: <Target className="h-3 w-3" />,
};

const TYPE_COLOR: Record<string, string> = {
  legal: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  general: "bg-sky-500/10 text-sky-500 dark:text-sky-400",
  special: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

type TrendDir = "up" | "down" | "neutral";

export function StatCard({
  label,
  value,
  story,
  sub,
  icon: Icon,
  trend,
  trendDir = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  story?: string;
  sub?: string;
  icon: React.ElementType;
  trend?: string;
  trendDir?: TrendDir;
  href?: string;
}) {
  const trendStyles =
    trendDir === "up"
      ? "bg-emerald-500/15 text-emerald-500"
      : trendDir === "down"
        ? "bg-red-500/15 text-red-400"
        : "bg-muted text-muted-foreground";

  const trendArrow = trendDir === "up" ? "▲" : trendDir === "down" ? "▼" : "•";

  const CardContent = (
    <div
      className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border px-6 py-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background:
          "radial-gradient(ellipse at top right, color-mix(in oklch, var(--chart-1) 8%, var(--card)), var(--card))",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs leading-none font-medium">
          {label}
        </p>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${trendStyles}`}
          >
            {trendArrow} {trend}
          </span>
        )}
      </div>

      <p className="text-4xl leading-none font-bold tracking-tight tabular-nums">
        {value}
      </p>

      {(story || sub) && (
        <div className="space-y-1">
          {story && (
            <p className="text-foreground/80 flex items-center gap-1.5 text-sm font-semibold">
              {story}
              <Icon className="text-muted-foreground h-3.5 w-3.5" />
            </p>
          )}
          {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
        </div>
      )}
    </div>
  );

  // 👇 Conditional wrapper
  if (href) {
    return (
      <Link href={href} className="block focus:outline-none">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}

function KpiRow() {
  const [overview] = trpc.analytics.getPlatformOverview.useSuspenseQuery();

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Active Users"
        value={fmtNum(overview.activeUsers.last30d)}
        story="Last 30 days"
        sub={`1d: ${overview.activeUsers.last1d} • 7d: ${overview.activeUsers.last7d}`}
        icon={TrendingUp}
        trend="Engagement"
        trendDir="neutral"
        href="/admin/users?filter=active"
      />

      <StatCard
        label="Total Tests"
        value={fmtNum(overview.totalTests)}
        story="Available tests"
        sub="Across all categories"
        icon={ClipboardList}
        href="/admin/tests"
      />
      <StatCard
        label="Total Attempts"
        value={fmtNum(overview.totalAttempts)}
        story="All attempts"
        sub="Submitted by users"
        icon={Activity}
        trend={`+${overview.activeUsers.last1d}`}
        trendDir="up"
      />
      <StatCard
        label="Total Users"
        value={fmtNum(overview.totalUsers)}
        story="Registered users"
        sub="On the platform"
        icon={Users}
        trend={`+${overview.activeUsers.last7d}`}
        trendDir="up"
        href="/admin/users"
      />
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  count,
  href,
  hrefLabel = "View all",
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="bg-muted flex h-6 w-6 items-center justify-center rounded-md">
          <Icon className="text-muted-foreground h-3.5 w-3.5" />
        </span>
        <h2 className="text-sm font-semibold">
          {title}
          {count !== undefined && (
            <span className="text-muted-foreground ml-1.5 font-normal">
              ({count})
            </span>
          )}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
        >
          {hrefLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// ─── Pending Admissions ───────────────────────────────────────────────────────

type Payment = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  transactionId: string | null;
  screenshotURL: string;
  rejectionReason: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    userProfilePic: string | null;
  };
};

function PendingAdmissions() {
  const utils = trpc.useUtils();

  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [screenshotTarget, setScreenshotTarget] = useState<Payment | null>(
    null,
  );
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [{ data, meta }] = trpc.payment.list.useSuspenseQuery({
    status: "pending",
    page: 0,
    limit: 10,
  }) as unknown as [{ data: Payment[]; meta: { total: number } }];

  const verify = trpc.payment.verify.useMutation({
    onSuccess: () => utils.payment.list.invalidate(),
  });

  async function handleApprove(p: Payment) {
    setApprovingId(p.id);
    try {
      await verify.mutateAsync({ paymentId: p.id, action: "approve" });
      const name = p.user.name ?? p.user.email ?? "Student";
      toast.success(`${name} has been approved`, {
        description: "Their subscription is now active.",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to approve");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    setRejectingId(rejectTarget.id);
    try {
      await verify.mutateAsync({
        paymentId: rejectTarget.id,
        action: "reject",
        rejectionReason: reason || undefined,
      });
      const name =
        rejectTarget.user.name ?? rejectTarget.user.email ?? "Student";
      toast.error(`${name}'s payment rejected`, {
        description: reason || "No reason provided.",
      });
      setRejectTarget(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reject");
    } finally {
      setRejectingId(null);
    }
  }

  return (
    <div className="flex flex-col">
      <SectionHeader
        icon={CreditCard}
        title="Pending Admissions"
        count={meta?.total}
        href="/admin/admissions"
        hrefLabel="View all"
      />
      <div className="overflow-hidden rounded-2xl border">
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-11 text-center">
            <CheckCircle2 className="text-muted-foreground/20 h-7 w-7" />
            <p className="text-muted-foreground text-sm">All caught up!</p>
          </div>
        ) : (
          <>
            {data.map((p, idx) => {
              const isApproving = approvingId === p.id;
              const isRejecting = rejectingId === p.id;
              const isBusy = isApproving || isRejecting;
              const name = p.user.name ?? p.user.email ?? "Unknown";
              const initial = name[0]?.toUpperCase() ?? "?";

              return (
                <div
                  key={p.id}
                  className={cn(
                    "group hover:bg-muted/30 flex items-center gap-3 px-4 py-3 transition-colors",
                    idx !== data.length - 1 && "border-b",
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={p.user.userProfilePic ?? undefined}
                      alt={p.user.name ?? ""}
                    />
                    <AvatarFallback className="text-xs font-semibold uppercase">
                      {(p.user.name ?? p.user.email ?? "?")[0]}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name + amount */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[11px]">
                      <span className="font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-muted-foreground/40">·</span>
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(p.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* Actions — visible on hover or during loading */}
                  <div
                    className={cn(
                      "flex shrink-0 items-center gap-1 transition-opacity",
                      isBusy
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100",
                    )}
                  >
                    {/* Screenshot */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setScreenshotTarget(p)}
                    >
                      <ImageIcon className="h-3 w-3" />
                    </Button>

                    {/* Approve */}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isBusy}
                      onClick={() => handleApprove(p)}
                      className="h-6 w-6 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500"
                    >
                      {isApproving ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                    </Button>

                    {/* Reject */}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isBusy}
                      onClick={() => setRejectTarget(p)}
                      className="h-6 w-6 text-rose-600 hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      {isRejecting ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* View all footer link */}
            {meta && meta.total > 10 && (
              <Link
                href="/admin/admissions"
                className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 border-t px-4 py-2.5 text-xs transition-colors"
              >
                View all {meta.total} pending
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <RejectDialog
        open={!!rejectTarget}
        onOpenChange={(v) => !v && setRejectTarget(null)}
        userName={
          rejectTarget?.user.name ?? rejectTarget?.user.email ?? "this student"
        }
        onConfirm={handleRejectConfirm}
        isLoading={rejectingId === rejectTarget?.id}
      />
      <ScreenshotDialog
        open={!!screenshotTarget}
        onOpenChange={(v) => !v && setScreenshotTarget(null)}
        screenshotUrl={screenshotTarget?.screenshotURL ?? ""}
        userName={
          screenshotTarget?.user.name ??
          screenshotTarget?.user.email ??
          "Student"
        }
      />
    </div>
  );
}

// ─── Recent Attempts ──────────────────────────────────────────────────────────

export function RecentAttempts() {
  const [page, setPage] = useState(0);
  const limit = 10;

  const [{ data, meta }, { isFetching }] =
    trpc.result.getResults.useSuspenseQuery({
      page,
      limit,
      sortBy: "time",
      sortOrder: "desc",
    });

  const rows = data;
  const totalPages = meta.totalPages;

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">WPM</TableHead>
              <TableHead className="text-right">When</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-10 text-center"
                >
                  No submissions yet
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.attemptId}>
                  {/* User */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {(
                            row?.user?.name?.[0] ??
                            row?.user?.email?.[0] ??
                            "?"
                          ).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.user.name ?? row.user.email}
                        </p>
                        {row.user.name && (
                          <p className="text-muted-foreground truncate text-xs">
                            {row.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Test */}
                  <TableCell>
                    <Link
                      href={`/admin/test/${row.test.id}`}
                      className="hover:text-primary text-sm"
                    >
                      {row.test.title}
                    </Link>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <span className="text-xs uppercase">
                      {row.type === "assessment" ? "test" : "practice"}
                    </span>
                  </TableCell>

                  {/* WPM */}
                  <TableCell className="text-right tabular-nums">
                    {row.result.wpm}
                  </TableCell>

                  {/* When */}
                  <TableCell className="text-muted-foreground text-right text-xs">
                    {formatDistanceToNow(new Date(row.result.submittedAt), {
                      addSuffix: true,
                    })}
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/test/${row.test.id}/user/${row.user.id}/results?attemptId=${row.attemptId}`}
                    >
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Page {page + 1} of {totalPages}
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || isFetching}
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
          >
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Active Tests ─────────────────────────────────────────────────────────────

function ActiveTests() {
  const [tests] = trpc.test.getTests.useSuspenseQuery({
    page: 1,
    pageSize: 8,
    status: "active",
    sort: "newest",
  });
  const [perf] = trpc.analytics.getTestPerformance.useSuspenseQuery();
  const perfMap = new Map(perf.map((p) => [p.testId, p]));

  return (
    <div className="flex flex-col">
      <SectionHeader
        icon={Layers}
        title="Active Tests"
        count={tests.total}
        href="/admin/tests?status=active"
        hrefLabel="All"
      />
      <div className="overflow-hidden rounded-2xl border">
        {tests.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground text-sm">No active tests</p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/tests">Launch a draft</Link>
            </Button>
          </div>
        ) : (
          <>
            {tests.data.map((t, idx) => {
              const p = perfMap.get(t.id);
              return (
                <Link
                  key={t.id}
                  href={`/admin/test/${t.id}`}
                  className={cn(
                    "group hover:bg-muted/30 flex items-center justify-between gap-3 px-4 py-3 transition-colors",
                    idx !== tests.data.length - 1 && "border-b",
                  )}
                >
                  {/* Title + type badge */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded p-1",
                        TYPE_COLOR[t.type] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {TYPE_ICON[t.type] ?? <FileText className="h-3 w-3" />}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {t.title}
                    </span>
                  </div>

                  {/* Stats — right-aligned compact pill */}
                  {p ? (
                    <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs tabular-nums">
                      <span>{p.attempts} att.</span>
                      <AccuracyBadge v={Math.round(Number(p.avgAccuracy))} />
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 shrink-0 text-xs">
                      No attempts
                    </span>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Draft Tests ──────────────────────────────────────────────────────────────

function DraftTests() {
  const [drafts] = trpc.test.getTests.useSuspenseQuery({
    page: 1,
    pageSize: 6,
    status: "draft",
    sort: "newest",
  });

  return (
    <div className="flex flex-col">
      <SectionHeader
        icon={BookOpen}
        title="Drafts"
        href="/admin/tests/new"
        hrefLabel="New"
      />
      <div className="overflow-hidden rounded-2xl border">
        {drafts.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground text-sm">No drafts</p>
            <Button size="sm" asChild>
              <Link href="/admin/tests/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Test
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {drafts.data.map((t, idx) => (
              <Link
                key={t.id}
                href={`/admin/test/${t.id}/edit`}
                className={cn(
                  "hover:bg-muted/30 flex items-center justify-between gap-3 px-4 py-3 transition-colors",
                  idx !== drafts.data.length - 1 && "border-b",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(t.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                    TYPE_COLOR[t.type] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {TYPE_ICON[t.type]}
                  {t.type}
                </span>
              </Link>
            ))}

            {drafts.totalPages > 1 && (
              <Link
                href="/admin/tests?status=draft"
                className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 border-t px-4 py-2.5 text-xs transition-colors"
              >
                View all {drafts.total} drafts
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-5"
          style={{
            background: "#1c1c1f",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Skeleton className="mb-4 h-2.5 w-20 bg-white/10" />
          <Skeleton className="h-10 w-16 bg-white/10" />
          <div className="mt-3 space-y-1.5">
            <Skeleton className="h-3.5 w-28 bg-white/10" />
            <Skeleton className="h-2.5 w-20 bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="bg-muted/30 border-b px-5 py-2.5">
        <Skeleton className="h-2.5 w-40" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 px-5 py-3",
            i !== rows - 1 && "border-b",
          )}
        >
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function ColSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            i !== rows - 1 && "border-b",
          )}
        >
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardClient() {
  const today = format(new Date(), "EEEE, do MMMM, yyyy");

  // Preload before Suspense boundaries
  trpc.analytics.getPlatformOverview.useQuery(undefined, { staleTime: 60_000 });
  trpc.analytics.getTestPerformance.useQuery(undefined, { staleTime: 60_000 });
  trpc.result.getResults.useQuery(
    { page: 0, limit: 8, sortBy: "time", sortOrder: "desc" },
    { staleTime: 30_000 },
  );
  trpc.test.getTests.useQuery(
    { page: 1, pageSize: 6, status: "draft", sort: "newest" },
    { staleTime: 60_000 },
  );
  trpc.test.getTests.useQuery(
    { page: 1, pageSize: 8, status: "active", sort: "newest" },
    { staleTime: 60_000 },
  );
  trpc.payment.list.useQuery(
    { status: "pending", page: 0, limit: 10 },
    { staleTime: 30_000 },
  );

  return (
    <div className="w-full space-y-6 px-6 py-7">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{today}</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/tests/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Test
          </Link>
        </Button>
      </div>

      {/* ── KPI cards ── */}
      <Suspense fallback={<KpiSkeleton />}>
        <KpiRow />
      </Suspense>

      {/* ── Recent attempts ── */}
      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-4 w-32" />
            </div>
            <TableSkeleton rows={6} />
          </div>
        }
      >
        <RecentAttempts />
      </Suspense>

      {/* ── Bottom 3-col grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 1st: Pending Admissions */}
        <Suspense
          fallback={
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-36" />
              </div>
              <ColSkeleton rows={6} />
            </div>
          }
        >
          <div className="min-w-0 overflow-hidden">
            <PendingAdmissions />
          </div>
        </Suspense>

        {/* 2nd: Draft Tests */}
        <Suspense
          fallback={
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-28" />
              </div>
              <ColSkeleton rows={6} />
            </div>
          }
        >
          <div className="min-w-0 overflow-hidden">
            <DraftTests />
          </div>
        </Suspense>

        {/* 3rd: Active Tests */}
        <Suspense
          fallback={
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-28" />
              </div>
              <ColSkeleton rows={6} />
            </div>
          }
        >
          <div className="min-w-0 overflow-hidden">
            <ActiveTests />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
