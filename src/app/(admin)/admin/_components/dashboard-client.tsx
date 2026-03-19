"use client";

// ─── app/admin/_components/dashboard-client.tsx ───────────────────────────────

import { Suspense } from "react";
import { trpc } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  Users,
  FileText,
  Activity,
  BarChart3,
  Plus,
  Gavel,
  Layers,
  BookOpen,
  ArrowRight,
  Trophy,
  ExternalLink,
  TrendingUp,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function AccuracyText({ v }: { v: number }) {
  return (
    <span
      className={
        v >= 90
          ? "text-emerald-500"
          : v >= 70
            ? "text-amber-500"
            : "text-destructive"
      }
    >
      {v}%
    </span>
  );
}

// ─── Compact Section Label ────────────────────────────────────────────────────

function SectionLabel({
  icon: Icon,
  label,
  action,
}: {
  icon: React.ElementType;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          {label}
        </span>
      </div>
      {action}
    </div>
  );
}

// ─── KPI Bar ─────────────────────────────────────────────────────────────────
// All top-level numbers in one horizontal strip — no giant isolated cards

function KpiBar() {
  const [overview] = trpc.analytics.getPlatformOverview.useSuspenseQuery();
  const [engagement] = trpc.analytics.getEngagementMetrics.useSuspenseQuery();

  const dauWau =
    engagement.wau > 0
      ? `${((engagement.dau / engagement.wau) * 100).toFixed(0)}%`
      : "—";

  const kpis = [
    {
      label: "Total Users",
      value: fmtNum(overview.totalUsers),
      sub: `${overview.activeUsers.last1d} today`,
      icon: Users,
      color: "text-violet-500",
    },
    {
      label: "Active (7d)",
      value: overview.activeUsers.last7d,
      sub: `${overview.activeUsers.last30d} this month`,
      icon: Activity,
      color: "text-blue-500",
    },
    {
      label: "Total Tests",
      value: fmtNum(overview.totalTests),
      sub: `${fmtNum(overview.totalAttempts)} attempts`,
      icon: FileText,
      color: "text-amber-500",
    },
    {
      label: "Avg / User",
      value: Number(engagement.avgAttemptsPerUser).toFixed(1),
      sub: "attempts per user",
      icon: BarChart3,
      color: "text-emerald-500",
    },
    {
      label: "Stickiness",
      value: dauWau,
      sub: "DAU / WAU",
      icon: Zap,
      color: "text-rose-500",
    },
    {
      label: "DAU · WAU · MAU",
      value: `${engagement.dau} · ${engagement.wau} · ${engagement.mau}`,
      sub: "daily · weekly · monthly",
      icon: TrendingUp,
      color: "text-sky-500",
    },
  ];

  return (
    <div className="grid grid-cols-6 divide-x rounded-xl border">
      {kpis.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className="flex flex-col gap-1 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              {label}
            </span>
            <Icon className={`h-3.5 w-3.5 ${color}`} />
          </div>
          <span className="text-xl leading-none font-bold tabular-nums">
            {value}
          </span>
          <span className="text-muted-foreground text-[11px]">{sub}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Recent Attempts ──────────────────────────────────────────────────────────

function RecentAttempts() {
  const [{ data }] = trpc.result.getResults.useSuspenseQuery({
    page: 0,
    limit: 8,
    sortBy: "time",
    sortOrder: "desc",
  });

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel
        icon={TrendingUp}
        label="Recent Attempts"
        action={
          <Link
            href="/admin/attempts"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            Explore all <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Activity className="text-muted-foreground/30 h-8 w-8" />
            <p className="text-muted-foreground text-sm">No submissions yet</p>
            <p className="text-muted-foreground/60 text-xs">
              Completed attempts will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {/* header */}
          <div className="bg-muted/40 grid grid-cols-[1fr_1.2fr_90px_56px_56px_60px_88px_28px] gap-3 border-b px-4 py-2">
            {["User", "Test", "Type", "Score", "WPM", "Acc", "When", ""].map(
              (h, i) => (
                <span
                  key={i}
                  className={[
                    "text-muted-foreground text-[10px] font-semibold tracking-widest uppercase",
                    i >= 3 && i <= 6 ? "text-right" : "",
                  ].join(" ")}
                >
                  {h}
                </span>
              ),
            )}
          </div>

          {data.map((row, idx) => (
            <div
              key={row.attemptId}
              className={[
                "group hover:bg-muted/40 grid grid-cols-[1fr_1.2fr_90px_56px_56px_60px_88px_28px] items-center gap-3 px-4 py-2.5 transition-colors",
                idx !== data.length - 1 ? "border-b" : "",
              ].join(" ")}
            >
              {/* user */}
              <div className="min-w-0">
                <p className="truncate text-sm leading-none font-medium">
                  {row.user.name ?? row.user.email}
                </p>
                {row.user.name && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {row.user.email}
                  </p>
                )}
              </div>

              {/* test */}
              <Link
                href={`/admin/test/${row.test?.id}`}
                className="hover:text-primary min-w-0 truncate text-sm transition-colors"
              >
                {row.test?.title ?? "—"}
              </Link>

              {/* type */}
              <span
                className={[
                  "text-[10px] font-semibold tracking-wide uppercase",
                  row.type === "assessment"
                    ? "text-foreground"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {row.type}
              </span>

              {/* score */}
              <p className="text-right text-sm font-bold tabular-nums">
                {row.result.score}
              </p>

              {/* wpm */}
              <p className="text-muted-foreground text-right text-sm tabular-nums">
                {row.result.wpm}
              </p>

              {/* accuracy */}
              <p className="text-right text-sm font-semibold tabular-nums">
                <AccuracyText v={row.result.accuracy} />
              </p>

              {/* when */}
              <p className="text-muted-foreground text-right text-xs tabular-nums">
                {formatDistanceToNow(new Date(row.result.submittedAt), {
                  addSuffix: true,
                })}
              </p>

              {/* link */}
              <div className="flex justify-end">
                <Link href={`/user/attempt/${row.attemptId}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top Performers ───────────────────────────────────────────────────────────

const MEDALS = ["🥇", "🥈", "🥉"];

function TopPerformers() {
  const [data] = trpc.analytics.getGlobalTopPerformers.useSuspenseQuery({
    limit: 5,
  });

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel
        icon={Trophy}
        label="Top Performers"
        action={
          <Link
            href="/admin/leaderboard"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            Leaderboard <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      <div className="overflow-hidden rounded-xl border">
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Trophy className="text-muted-foreground/30 h-7 w-7" />
            <p className="text-muted-foreground text-sm">No data yet</p>
          </div>
        ) : (
          data.map((p, idx) => (
            <div
              key={p.user.id}
              className={[
                "hover:bg-muted/40 flex items-center gap-3 px-4 py-2.5 transition-colors",
                idx !== data.length - 1 ? "border-b" : "",
              ].join(" ")}
            >
              <span className="w-5 shrink-0 text-center text-sm">
                {p.rank <= 3 ? (
                  MEDALS[p.rank - 1]
                ) : (
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {p.rank}
                  </span>
                )}
              </span>

              <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border">
                <AvatarImage
                  src={p.user.profilePicUrl ?? ""}
                  alt={p.user.name ?? p.user.email ?? ""}
                />
                <AvatarFallback className="text-xs font-semibold">
                  {(p.user.name ?? p.user.email ?? "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm leading-none font-medium">
                  {p.user.name ?? p.user.email}
                </p>
                {p.user.name && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {p.user.email}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 gap-4 text-right">
                <div>
                  <p className="text-muted-foreground text-[9px] tracking-widest uppercase">
                    Pts
                  </p>
                  <p className="text-sm font-bold tabular-nums">
                    {Math.round(p.totalPoints)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[9px] tracking-widest uppercase">
                    Tests
                  </p>
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {p.testsPlayed}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[9px] tracking-widest uppercase">
                    #1s
                  </p>
                  <p
                    className={[
                      "text-sm font-semibold tabular-nums",
                      p.firstPlaces > 0
                        ? "text-amber-500"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {p.firstPlaces}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
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
    <div className="flex flex-col gap-3">
      <SectionLabel
        icon={Layers}
        label={`Active Tests (${tests.total})`}
        action={
          <Link
            href="/admin/tests?status=active"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            All <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      <div className="overflow-hidden rounded-xl border">
        {tests.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-muted-foreground text-sm">No active tests</p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/tests">Launch a draft</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-muted/40 grid grid-cols-[1fr_72px_76px_72px_68px] gap-3 border-b px-4 py-2">
              {["Test", "Attempts", "Avg Score", "Avg Acc", "Avg WPM"].map(
                (h, i) => (
                  <span
                    key={h}
                    className={[
                      "text-muted-foreground text-[10px] font-semibold tracking-widest uppercase",
                      i > 0 ? "text-right" : "",
                    ].join(" ")}
                  >
                    {h}
                  </span>
                ),
              )}
            </div>

            {tests.data.map((t, idx) => {
              const p = perfMap.get(t.id);
              return (
                <Link
                  key={t.id}
                  href={`/admin/test/${t.id}`}
                  className={[
                    "group hover:bg-muted/40 grid grid-cols-[1fr_72px_76px_72px_68px] items-center gap-3 px-4 py-2.5 transition-colors",
                    idx !== tests.data.length - 1 ? "border-b" : "",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={[
                        "shrink-0 rounded p-0.5",
                        t.type === "legal"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-sky-500/10 text-sky-400",
                      ].join(" ")}
                    >
                      {t.type === "legal" ? (
                        <Gavel className="h-2.5 w-2.5" />
                      ) : (
                        <FileText className="h-2.5 w-2.5" />
                      )}
                    </span>
                    <span className="truncate text-sm">{t.title}</span>
                  </div>

                  {p ? (
                    <>
                      <span className="text-right text-sm tabular-nums">
                        {p.attempts}
                      </span>
                      <span className="text-right text-sm font-semibold tabular-nums">
                        {Math.round(Number(p.avgScore))}
                      </span>
                      <span className="text-right text-sm font-semibold tabular-nums">
                        <AccuracyText v={Math.round(Number(p.avgAccuracy))} />
                      </span>
                      <span className="text-muted-foreground text-right text-sm tabular-nums">
                        {Math.round(Number(p.avgWpm))}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/40 col-span-4 text-right text-xs">
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
    <div className="flex flex-col gap-3">
      <SectionLabel
        icon={BookOpen}
        label="Drafts"
        action={
          <Link
            href="/admin/tests/new"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            <Plus className="h-3 w-3" /> New
          </Link>
        }
      />

      <div className="overflow-hidden rounded-xl border">
        {drafts.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-muted-foreground text-sm">No drafts</p>
            <Button size="sm" asChild>
              <Link href="/admin/tests/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Test
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {drafts.data.map((t, idx) => (
              <Link
                key={t.id}
                href={`/admin/test/${t.id}`}
                className={[
                  "hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-2.5 transition-colors",
                  idx !== drafts.data.length - 1 ? "border-b" : "",
                ].join(" ")}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(t.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <span
                  className={[
                    "shrink-0 text-[9px] font-bold tracking-widest uppercase",
                    t.type === "legal" ? "text-amber-400" : "text-sky-400",
                  ].join(" ")}
                >
                  {t.type}
                </span>
              </Link>
            ))}

            {drafts.totalPages > 1 && (
              <Link
                href="/admin/tests?status=draft"
                className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 border-t px-4 py-2.5 text-xs transition-colors"
              >
                View all {drafts.total} drafts{" "}
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
    <div className="grid grid-cols-6 divide-x rounded-xl border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 px-5 py-4">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y overflow-hidden rounded-xl border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-10" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardClient() {
  const today = format(new Date(), "EEEE, MMM d");

  // Preload before Suspense boundaries
  trpc.analytics.getPlatformOverview.useQuery(undefined, { staleTime: 60_000 });
  trpc.analytics.getEngagementMetrics.useQuery(undefined, {
    staleTime: 60_000,
  });
  trpc.analytics.getTestPerformance.useQuery(undefined, { staleTime: 60_000 });
  trpc.analytics.getGlobalTopPerformers.useQuery(
    { limit: 5 },
    { staleTime: 60_000 },
  );
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

  return (
    <div className="w-full space-y-7 px-6 py-7">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{today}</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/tests/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Test
          </Link>
        </Button>
      </div>

      {/* ── KPI bar ── */}
      <Suspense fallback={<KpiSkeleton />}>
        <KpiBar />
      </Suspense>

      {/* ── Recent attempts ── */}
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <ListSkeleton rows={6} />
          </div>
        }
      >
        <RecentAttempts />
      </Suspense>

      {/* ── Bottom 3-col grid ── */}
      <div className="grid grid-cols-3 gap-6">
        <Suspense
          fallback={
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <ListSkeleton rows={5} />
            </div>
          }
        >
          <TopPerformers />
        </Suspense>

        <Suspense
          fallback={
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <ListSkeleton rows={5} />
            </div>
          }
        >
          <DraftTests />
        </Suspense>

        <Suspense
          fallback={
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <ListSkeleton rows={5} />
            </div>
          }
        >
          <ActiveTests />
        </Suspense>
      </div>
    </div>
  );
}
