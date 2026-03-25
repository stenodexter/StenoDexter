"use client";

// ─── app/(user)/dashboard/page.tsx ───────────────────────────────────────────

import { Suspense, useState } from "react";
import { trpc } from "~/trpc/react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  CheckCircle2, RotateCcw, ArrowRight, ExternalLink,
  Flame, Target, Zap, Trophy, TrendingUp, TrendingDown,
  PlayCircle, Gavel, FileText, Star, Clock,
} from "lucide-react";
import {
  isAfter, subHours, subDays, format, startOfDay,
  endOfToday, eachDayOfInterval, getDay, formatDistanceToNow,
} from "date-fns";
import Link from "next/link";
import { TestStartDialog } from "~/components/common/user/test-start-dialog";

// ─── types ────────────────────────────────────────────────────────────────────

type Speed = {
  id: string; wpm: number;
  dictationSeconds: number; breakSeconds: number;
  writtenDurationSeconds: number; hasAssessed: boolean;
};
type TestItem = {
  id: string; title: string; type: "legal" | "general" | "special";
  createdAt: Date; attemptCount: number; hasAttempted: boolean; speeds: Speed[];
};
type Selected = { test: TestItem };

// ─── helpers ──────────────────────────────────────────────────────────────────

function isWithin24h(d: Date) { return isAfter(new Date(d), subHours(new Date(), 24)); }
function canAssess(t: TestItem) { return isWithin24h(t.createdAt) && t.speeds.some((s) => !s.hasAssessed); }
function accColor(a: number) {
  return a >= 90 ? "text-emerald-500" : a >= 70 ? "text-amber-500" : "text-destructive";
}

const TYPE_ICON = { legal: Gavel, general: FileText, special: Star };

// ─── chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover rounded-lg border px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.dataKey}
          </span>
          <span className="font-bold tabular-nums">{p.value}{p.dataKey === "Accuracy" ? "%" : ""}</span>
        </div>
      ))}
    </div>
  );
}

// ─── stat strip ───────────────────────────────────────────────────────────────

function StatStrip() {
  const [report]   = trpc.user.getReport.useSuspenseQuery({ type: "assessment" });
  const [bests]    = trpc.user.getPersonalBests.useSuspenseQuery({ type: "assessment" });
  const [series]   = trpc.user.getProgressSeries.useSuspenseQuery({ limit: 10, type: "assessment" });

  const total    = Number(report?.totalAttempts ?? 0);
  const avgAcc   = Math.round(Number(report?.avgAccuracy ?? 0));
  const avgWpm   = Math.round(Number(report?.avgWpm ?? 0));
  const latest   = series[series.length - 1]?.accuracy ?? null;
  const prev     = series[series.length - 2]?.accuracy ?? null;
  const delta    = latest !== null && prev !== null ? latest - prev : null;

  const stats = [
    {
      label: "Assessments",
      value: total,
      icon: CheckCircle2,
      sub: "total submitted",
    },
    {
      label: "Avg Accuracy",
      value: avgAcc ? `${avgAcc}%` : "—",
      icon: Target,
      sub: delta !== null
        ? `${delta >= 0 ? "+" : ""}${delta}% vs last`
        : "assessments only",
      delta,
    },
    {
      label: "Best Accuracy",
      value: bests?.bestAccuracy != null ? `${bests.bestAccuracy}%` : "—",
      icon: Trophy,
      sub: "personal best",
    },
    {
      label: "Best WPM",
      value: bests?.bestWpm ?? "—",
      icon: Zap,
      sub: "personal best",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label}
            className="flex flex-col gap-3 rounded-2xl border bg-card px-5 py-4"
            style={{ background: `radial-gradient(ellipse at top right, color-mix(in oklch, var(--chart-1) 7%, var(--card)), var(--card))` }}>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">{s.label}</p>
              {"delta" in s && s.delta !== null && s.delta !== 0
                ? (s.delta ?? 0) > 0
                  ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  : <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                : <Icon className="text-muted-foreground/40 h-3.5 w-3.5" />}
            </div>
            <p className="text-3xl font-bold leading-none tabular-nums tracking-tight">{s.value}</p>
            <p className="text-muted-foreground text-xs">{s.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── progress chart ───────────────────────────────────────────────────────────

function ProgressChart() {
  const [series] = trpc.user.getProgressSeries.useSuspenseQuery({ limit: 40 });

  const chartData = series.map((r) => ({
    date:     format(new Date(r.submittedAt), "d MMM"),
    Accuracy: r.accuracy,
    Mistakes: r.mistakes,
  }));

  if (chartData.length < 2) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed">
        <div className="text-center">
          <TrendingUp className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">Complete more tests to see your progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Progress Over Time</p>
          <p className="text-muted-foreground text-xs">Last {chartData.length} attempts</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />Accuracy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />Mistakes
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="dashAccGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--chart-1)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dashMistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--chart-2)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="Accuracy" stroke="var(--chart-1)" strokeWidth={2} fill="url(#dashAccGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="Mistakes"  stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="4 3" fill="url(#dashMistGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── heatmap ──────────────────────────────────────────────────────────────────

const HEAT_COLORS = [
  "color-mix(in oklch, var(--muted) 40%, transparent)",
  "color-mix(in oklch, var(--chart-1) 25%, transparent)",
  "color-mix(in oklch, var(--chart-1) 50%, transparent)",
  "color-mix(in oklch, var(--chart-1) 75%, transparent)",
  "var(--chart-1)",
];

function MiniHeatmap() {
  const MAX_DAYS = 91; // 13 weeks
  const from     = startOfDay(subDays(new Date(), MAX_DAYS - 1));
  const to       = endOfToday();

  const [data] = trpc.user.getHeatmap.useSuspenseQuery({ from, to, includePractice: true });

  const dataMap  = new Map(data.map((d) => [String(d.date).slice(0, 10), Number(d.count)]));
  const allDays  = eachDayOfInterval({ start: from, end: to });
  const firstDow = getDay(allDays[0]!);
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(firstDow).fill(null);
  for (const day of allDays) {
    week.push(day);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

  const totalAttempts = data.reduce((s, d) => s + Number(d.count), 0);
  const activeDays    = data.filter((d) => Number(d.count) > 0).length;
  const todayKey      = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">Activity</p>
        <p className="text-muted-foreground text-[13px] tabular-nums">
          {totalAttempts} attempts · {activeDays} active days
        </p>
      </div>

      {/* Grid stretches to full width — each column is 1fr */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${weeks.length}, 1fr)`,
          gap: 3,
        }}
      >
        {weeks.map((w, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {w.map((day, di) => {
              if (!day) return <div key={di} style={{ aspectRatio: "1" }} />;
              const key     = format(day, "yyyy-MM-dd");
              const count   = dataMap.get(key) ?? 0;
              const isToday = key === todayKey;
              const intens  = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
              return (
                <div key={di}
                  title={`${format(day, "MMM d")}: ${count} attempt${count !== 1 ? "s" : ""}`}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 3,
                    backgroundColor: HEAT_COLORS[intens],
                    outline: isToday ? "2px solid var(--chart-2)" : undefined,
                    outlineOffset: isToday ? "1px" : undefined,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-[9px]">Less</span>
          {HEAT_COLORS.map((c, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c }} />
          ))}
          <span className="text-muted-foreground text-[9px]">More</span>
        </div>
        <Link href="/user/report-card" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[13px] transition-colors">
          Full report <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}

// ─── recent attempts panel ────────────────────────────────────────────────────

function RecentAttemptsPanel() {
  const [{ data }] = trpc.user.getAttemptsPaginated.useSuspenseQuery({ page: 0, limit: 4 });

  if (!data?.length) return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <p className="text-muted-foreground text-xs">No attempts yet</p>
    </div>
  );

  return (
    <div className="space-y-1">
      {(data as any[]).map((row: any) => {
        const acc = row.result?.accuracy ?? 0;
        return (
          <Link key={row.attemptId}
            href={`/user/test/${row.testId}/results?attemptId=${row.attemptId}`}
            className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{row.testTitle ?? row.testId}</p>
              <p className="text-muted-foreground text-[10px]">
                {formatDistanceToNow(new Date(row.result.submittedAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={row.type === "assessment" ? "default" : "secondary"} className="text-[10px] capitalize">{row.type}</Badge>
              <span className={`text-xs font-bold tabular-nums ${accColor(acc)}`}>{acc}%</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100" />
            </div>
          </Link>
        );
      })}
      <div className="pt-1">
        <Button asChild variant="ghost" size="sm" className="w-full text-xs">
          <Link href="/user/attempts">View all attempts <ArrowRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      </div>
    </div>
  );
}

// ─── today's tests ────────────────────────────────────────────────────────────

function TodaysTests({ onSelect }: { onSelect: (s: Selected) => void }) {
  const [{ data }] = trpc.test.listForUser.useSuspenseQuery({ page: 1, pageSize: 6 });
  const todayTests = ((data ?? []) as unknown as TestItem[]).filter((t) => isWithin24h(new Date(t.createdAt)));

  if (todayTests.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-500" />
        <p className="text-sm font-semibold">Today's Tests</p>
        <Badge variant="secondary" className="text-[10px]">{todayTests.length} new</Badge>
      </div>
      <div className="space-y-2">
        {todayTests.map((t) => {
          const Icon    = TYPE_ICON[t.type];
          const eligible = canAssess(t);
          return (
            <div key={t.id}
              className="flex items-center gap-4 rounded-xl border bg-card px-5 py-3.5"
              style={{ background: `radial-gradient(ellipse at top right, color-mix(in oklch, var(--chart-1) 5%, var(--card)), var(--card))` }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{t.title}</p>
                  <Badge variant="outline" className="gap-1 text-[10px] shrink-0">
                    <Icon className="h-2.5 w-2.5" />{t.type}
                  </Badge>
                  <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-600 shrink-0">New</Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {t.speeds.map((s) => (
                    <Badge key={s.id} variant={s.hasAssessed ? "secondary" : "outline"}
                      className="text-[10px] tabular-nums">
                      {s.wpm} WPM{s.hasAssessed ? " ✓" : ""}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/user/test/${t.id}/leaderboard`}>
                    <Trophy className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button size="sm" variant={eligible ? "default" : "outline"}
                  onClick={() => onSelect({ test: t })}>
                  {eligible
                    ? <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Assess</>
                    : <><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Practice</>}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── in-progress attempts ─────────────────────────────────────────────────────

function InProgress() {
  // Active attempts = submitted=false, stage != submitted
  const [{ data }] = trpc.user.getAttemptsPaginated.useSuspenseQuery({ page: 0, limit: 3 });
  // Filter for non-submitted — getAttemptsPaginated returns results rows (submitted only)
  // So this won't show in-progress. The proper way is a dedicated endpoint.
  // For now skip and return null if nothing; the slot is reserved.
  return null;
}

// ─── leaderboard positions ────────────────────────────────────────────────────

function MyLeaderboardStandings() {
  const [rows] = trpc.user.getTestWisePerformance.useSuspenseQuery({ limit: 5 });

  if (!rows?.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">My Rankings</p>
        </div>
        <p className="text-muted-foreground text-xs">Tests I've assessed</p>
      </div>
      <div className="space-y-1.5">
        {(rows as any[]).map((r: any) => {
          const acc = Math.round(Number(r.bestAccuracy));
          return (
            <div key={r.testId} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.testTitle ?? r.testId}</p>
                <p className="text-muted-foreground text-xs">{r.attempts} attempt{Number(r.attempts) !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className={`text-sm font-bold tabular-nums ${accColor(acc)}`}>{acc}%</p>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Best</p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/user/test/${r.testId}/leaderboard`}>
                    <Trophy className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── skeletons ────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border p-5">
            <Skeleton className="h-3 w-16" /><Skeleton className="h-8 w-20" /><Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border p-5"><Skeleton className="h-48 w-full rounded-lg" /></div>
        <div className="space-y-3 rounded-xl border p-5">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
        </div>
      </div>
    </div>
  );
}

// ─── inner ────────────────────────────────────────────────────────────────────

function DashboardInner() {
  const [selected, setSelected] = useState<Selected | null>(null);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <Suspense fallback={<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl" />)}</div>}>
        <StatStrip />
      </Suspense>

      {/* Today's tests */}
      <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
        <TodaysTests onSelect={setSelected} />
      </Suspense>

      {/* Main 2-col: chart + right panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" style={{ minHeight: 300 }}>
        {/* Chart — 2/3 */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5" style={{ minHeight: 280 }}>
          <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
            <ProgressChart />
          </Suspense>
        </div>

        {/* Right panel — 1/3 */}
        <div className="flex flex-col gap-4">
          {/* Recent attempts */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold">Recent Attempts</p>
            </div>
            <Suspense fallback={<Skeleton className="h-32 w-full" />}>
              <RecentAttemptsPanel />
            </Suspense>
          </div>

          {/* Heatmap */}
          <div className="rounded-xl border bg-card p-4">
            <Suspense fallback={<Skeleton className="h-24 w-full" />}>
              <MiniHeatmap />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Rankings */}
      <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
        <MyLeaderboardStandings />
      </Suspense>

      <TestStartDialog
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        testId={selected?.test.id ?? ""}
        testTitle={selected?.test.title ?? ""}
        speeds={selected?.test.speeds ?? []}
      />
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function UserDashboard() {
  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Your performance at a glance</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-lg font-semibold">{new Date().toLocaleDateString("en-IN", { weekday: "long" })}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardInner />
      </Suspense>
    </div>
  );
}