"use client";

// ─── components/common/report-card-client.tsx ────────────────────────────────

import { Suspense, useMemo, useState } from "react";
import { trpc } from "~/trpc/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import {
  Activity,
  Target,
  Zap,
  AlertCircle,
  Trophy,
  TrendingUp,
  BarChart2,
  Flame,
  ExternalLink,
} from "lucide-react";
import {
  format,
  isDate,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getDay,
  formatDistanceToNow,
} from "date-fns";
import Link from "next/link";

// ─── helpers ──────────────────────────────────────────────────────────────────

function accColor(a: number) {
  return a >= 90
    ? "text-emerald-500"
    : a >= 70
      ? "text-amber-500"
      : "text-destructive";
}
function accLabel(a: number) {
  return a >= 95
    ? "Excellent"
    : a >= 85
      ? "Good"
      : a >= 70
        ? "Fair"
        : "Needs work";
}

// ─── stat card ────────────────────────────────────────────────────────────────

type TrendDir = "up" | "down" | "neutral";

function StatCard({
  label,
  value,
  story,
  sub,
  icon: Icon,
  trend,
  trendDir = "neutral",
}: {
  label: string;
  value: string | number;
  story?: string;
  sub?: string;
  icon: React.ElementType;
  trend?: string;
  trendDir?: TrendDir;
}) {
  const trendCls =
    trendDir === "up"
      ? "bg-emerald-500/15 text-emerald-500"
      : trendDir === "down"
        ? "bg-red-500/15 text-red-400"
        : "bg-muted text-muted-foreground";
  const trendArrow = trendDir === "up" ? "↗" : trendDir === "down" ? "↘" : "→";

  return (
    <div
      className="relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border px-6 py-5"
      style={{
        background: `radial-gradient(ellipse at top right, color-mix(in oklch, var(--chart-1) 8%, var(--card)), var(--card))`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs leading-none font-medium">
          {label}
        </p>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${trendCls}`}
          >
            {trendArrow} {trend}
          </span>
        )}
      </div>
      <p className="text-4xl leading-none font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {(story || sub) && (
        <div>
          {story && (
            <p className="text-foreground/80 flex items-center gap-1.5 text-sm font-semibold">
              {story} <Icon className="text-muted-foreground h-3.5 w-3.5" />
            </p>
          )}
          {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
        </div>
      )}
    </div>
  );
}

// ─── chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover rounded-lg border px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div
          key={p.dataKey}
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
            <span className="text-muted-foreground">{p.dataKey}</span>
          </div>
          <span className="font-bold tabular-nums">
            {p.value}
            {p.dataKey === "Accuracy" ? "%" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── progress chart ───────────────────────────────────────────────────────────

function ProgressChart({
  userId,
  includePractice,
}: {
  userId?: string;
  includePractice: boolean;
}) {
  const [series] = userId
    ? trpc.user.getProgressSeriesAdmin.useSuspenseQuery({
        userId,
        limit: 60,
        type: includePractice ? undefined : "assessment",
      })
    : trpc.user.getProgressSeries.useSuspenseQuery({
        limit: 60,
        type: includePractice ? undefined : "assessment",
      });

  const chartData = series.map((r) => ({
    date: format(new Date(r.submittedAt), "d MMM"),
    Accuracy: r.accuracy,
    Mistakes: r.mistakes,
  }));

  if (chartData.length < 2) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">Not enough data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart
        data={chartData}
        margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="mistGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="Accuracy"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#accGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="Mistakes"
          stroke="var(--chart-2)"
          strokeWidth={2}
          strokeDasharray="4 3"
          fill="url(#mistGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── heatmap ──────────────────────────────────────────────────────────────────

const CELL = 16;
const GAP = 3;
const WEEKS_SHOWN = 26;

// Intensity → CSS color string (must use hsl() not bare var())
const HEAT_COLORS = [
  "color-mix(in oklch, var(--muted) 40%, transparent)",
  "color-mix(in oklch, var(--chart-1) 25%, transparent)",
  "color-mix(in oklch, var(--chart-1) 50%, transparent)",
  "color-mix(in oklch, var(--chart-1) 75%, transparent)",
  "var(--chart-1)",
];

function HeatmapCell({
  count,
  date,
  isToday,
}: {
  count: number;
  date: Date;
  isToday: boolean;
}) {
  const intensity =
    count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
  return (
    <div
      title={`${format(date, "EEE, MMM d")}: ${count} attempt${count !== 1 ? "s" : ""}`}
      style={{
        width: CELL,
        height: CELL,
        borderRadius: 4,
        backgroundColor: HEAT_COLORS[intensity],
        outline: isToday ? `2px solid var(--chart-2)` : undefined,
        outlineOffset: isToday ? "1px" : undefined,
        transition: "background-color 0.2s",
      }}
    />
  );
}

export function ActivityHeatmap({
  heatmapData,
}: {
  heatmapData: { date: Date | string; count: number }[];
}) {
  const today = useMemo(() => new Date(), []);

  const todayDow = getDay(today);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (6 - todayDow));

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - WEEKS_SHOWN * 7 + 1);

  const dataMap = useMemo(
    () =>
      new Map(
        heatmapData.map((d) => {
          const key = isDate(d.date)
            ? format(d.date as Date, "yyyy-MM-dd")
            : String(d.date).slice(0, 10);
          return [key, Number(d.count)];
        }),
      ),
    [heatmapData],
  );

  const allDays = useMemo(
    () => eachDayOfInterval({ start: startDate, end: endDate }),
    [],
  );
  const firstDow = getDay(allDays[0]!);

  const weeks = useMemo(() => {
    const result: (Date | null)[][] = [];
    let week: (Date | null)[] = Array(firstDow).fill(null);
    for (const day of allDays) {
      week.push(day);
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      result.push(week);
    }
    return result;
  }, [allDays, firstDow]);

  const monthLabels = useMemo(() => {
    const out: { label: string; weekIdx: number }[] = [];
    let last = -1;
    weeks.forEach((w, wi) => {
      const first = w.find((d) => d !== null);
      if (!first) return;
      const m = first.getMonth();
      if (m !== last) {
        out.push({ label: format(first, "MMM"), weekIdx: wi });
        last = m;
      }
    });
    return out;
  }, [weeks]);

  const totalAttempts = heatmapData.reduce((s, d) => s + Number(d.count), 0);
  const activeDays = heatmapData.filter((d) => Number(d.count) > 0).length;
  const todayKey = format(today, "yyyy-MM-dd");
  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        <span className="text-foreground font-semibold">{totalAttempts}</span>{" "}
        attempts across{" "}
        <span className="text-foreground font-semibold">{activeDays}</span> days
      </p>

      <div className="flex gap-1.5">
        <div className="flex flex-col pt-5" style={{ gap: GAP }}>
          {DAY_LABELS.map((d, i) => (
            <span
              key={i}
              style={{ height: CELL, lineHeight: `${CELL}px` }}
              className="text-muted-foreground w-3 text-center text-[8px] select-none"
            >
              {i % 2 === 1 ? d : ""}
            </span>
          ))}
        </div>

        <div>
          <div className="mb-1 flex" style={{ gap: GAP }}>
            {weeks.map((_, wi) => {
              const ml = monthLabels.find((m) => m.weekIdx === wi);
              return (
                <div key={wi} style={{ width: CELL }}>
                  {ml && (
                    <span className="text-muted-foreground text-[8px] whitespace-nowrap">
                      {ml.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((day, di) => {
                  if (!day)
                    return (
                      <div key={di} style={{ width: CELL, height: CELL }} />
                    );
                  const key = format(day, "yyyy-MM-dd");
                  const count = dataMap.get(key) ?? 0;
                  const isToday = key === todayKey;
                  const future = day > today;
                  return (
                    <div key={di} style={{ opacity: future ? 0.3 : 1 }}>
                      <HeatmapCell date={day} count={count} isToday={isToday} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-[9px]">Less</span>
        {HEAT_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: color,
            }}
          />
        ))}
        <span className="text-muted-foreground text-[9px]">More</span>
      </div>
    </div>
  );
}

// ─── per-test breakdown ───────────────────────────────────────────────────────

function TestBreakdown({
  userId,
  includePractice,
  isAdmin = false,
}: {
  userId?: string;
  includePractice: boolean;
  isAdmin?: boolean;
}) {
  const [rows] = userId
    ? trpc.user.getTestWisePerformanceAdmin.useSuspenseQuery({
        userId,
        limit: 20,
        type: includePractice ? undefined : "assessment",
      })
    : trpc.user.getTestWisePerformance.useSuspenseQuery({
        limit: 20,
        type: includePractice ? undefined : "assessment",
      });

  if (!rows?.length)
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
        <BarChart2 className="text-muted-foreground/30 mb-2 h-6 w-6" />
        <p className="text-muted-foreground text-sm">No test data yet</p>
      </div>
    );

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const acc = Math.round(Number(r.bestAccuracy));
        return (
          <div
            key={r.testId}
            className="bg-card hover:bg-muted/20 flex items-center gap-4 rounded-xl border px-5 py-3.5 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.testTitle}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {r.attempts} attempt{Number(r.attempts) !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-5 sm:flex">
              <div className="text-center">
                <p
                  className={`text-sm font-bold tabular-nums ${accColor(acc)}`}
                >
                  {acc}%
                </p>
                <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
                  Best acc
                </p>
              </div>
              <Separator orientation="vertical" className="h-7" />
              <div className="text-center">
                <p className="text-sm font-bold tabular-nums">{r.bestWpm}</p>
                <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
                  Best WPM
                </p>
              </div>
              <Separator orientation="vertical" className="h-7" />
              <div className="text-center">
                <p className="text-sm font-bold tabular-nums">
                  {Math.round(Number(r.avgAccuracy))}%
                </p>
                <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
                  Avg acc
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link
                href={
                  isAdmin
                    ? `/admin/test/${r.testId}/user/${userId}/results`
                    : `/user/tests/${r.testId}/results`
                }
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ─── recent attempts ──────────────────────────────────────────────────────────

function RecentAttempts({
  userId,
  includePractice,
  isAdmin,
}: {
  userId?: string;
  includePractice: boolean;
  isAdmin?: boolean;
}) {
  const [{ data }] = userId
    ? trpc.user.getAttemptsPaginatedAdmin.useSuspenseQuery({
        userId,
        page: 0,
        limit: 5,
        type: includePractice ? undefined : "assessment",
      })
    : trpc.user.getAttemptsPaginated.useSuspenseQuery({
        page: 0,
        limit: 5,
        type: includePractice ? undefined : "assessment",
      });

  if (!data?.length) return null;

  return (
    <div className="space-y-2">
      {(data as any[]).map((row: any) => {
        const acc = row.result?.accuracy ?? 0;
        return (
          <div
            key={row.attemptId}
            className="bg-card hover:bg-muted/20 flex items-center gap-4 rounded-xl border px-5 py-3 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {row.testTitle ?? row.test?.title ?? row.testId}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge
                  variant={row.type === "assessment" ? "default" : "secondary"}
                  className="text-[10px] capitalize"
                >
                  {row.type}
                </Badge>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatDistanceToNow(new Date(row.result.submittedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <div className="text-right">
                <p
                  className={`text-sm font-bold tabular-nums ${accColor(acc)}`}
                >
                  {acc}%
                </p>
                <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
                  Accuracy
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={
                    isAdmin
                      ? `/admin/test/${row.testId}/user/${userId}/results?attemptId=${row.attemptId}`
                      : `/user/tests/${row.testId}/results?attemptId=${row.attemptId}`
                  }
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── inner ────────────────────────────────────────────────────────────────────

function ReportCardInner({
  userId,
  isAdmin,
}: {
  userId?: string;
  isAdmin?: boolean;
}) {
  const [includePractice, setIncludePractice] = useState(true);

  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());

  const [report] = userId
    ? trpc.user.getReportAdmin.useSuspenseQuery({
        userId,
        type: includePractice ? undefined : "assessment",
      })
    : trpc.user.getReport.useSuspenseQuery({
        type: includePractice ? undefined : "assessment",
      });

  const [bests] = userId
    ? trpc.user.getPersonalBestsAdmin.useSuspenseQuery({
        userId,
        type: includePractice ? undefined : "assessment",
      })
    : trpc.user.getPersonalBests.useSuspenseQuery({
        type: includePractice ? undefined : "assessment",
      });

  // Heatmap data fetched here and passed as prop — keeps ActivityHeatmap a pure display component
  const [heatmapData] = userId
    ? trpc.user.getHeatmapAdmin.useSuspenseQuery({
        userId,
        from: yearStart,
        to: yearEnd,
        includePractice,
      })
    : trpc.user.getHeatmap.useSuspenseQuery({
        from: yearStart,
        to: yearEnd,
        includePractice,
      });

  const attempts = Number(report?.totalAttempts ?? 0);
  const avgAcc = Math.round(Number(report?.avgAccuracy ?? 0));
  const avgWpm = Math.round(Number(report?.avgWpm ?? 0));
  const totalErrors = Number(report?.totalMistakes ?? 0);
  const errPerAttempt =
    attempts > 0 ? (totalErrors / attempts).toFixed(1) : "0";

  return (
    <div className="space-y-8">
      {/* Toggle */}
      <div className="flex items-center justify-end gap-2.5">
        <Label
          htmlFor="incl-practice"
          className="text-muted-foreground cursor-pointer text-sm"
        >
          Include practice
        </Label>
        <Switch
          id="incl-practice"
          checked={includePractice}
          onCheckedChange={setIncludePractice}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Attempts"
          value={attempts}
          story="All time attempts"
          sub={`across all tests`}
          icon={Activity}
          trend={attempts > 0 ? `${attempts}` : undefined}
          trendDir="neutral"
        />
        <StatCard
          label="Avg Accuracy"
          value={`${avgAcc}%`}
          story={accLabel(avgAcc)}
          sub="per submitted attempt"
          icon={Target}
          trend={avgAcc >= 90 ? "+Great" : avgAcc >= 70 ? "Fair" : "Low"}
          trendDir={avgAcc >= 90 ? "up" : avgAcc >= 70 ? "neutral" : "down"}
        />
        <StatCard
          label="Avg WPM"
          value={avgWpm}
          story="Words per minute"
          sub="transcription speed"
          icon={Zap}
          trend={avgWpm > 0 ? `${avgWpm} wpm` : undefined}
          trendDir="neutral"
        />
        <StatCard
          label="Total Mistakes"
          value={totalErrors}
          story={`~${errPerAttempt} per attempt`}
          sub="across all submissions"
          icon={AlertCircle}
          trend={
            Number(errPerAttempt) <= 3
              ? "Low"
              : Number(errPerAttempt) <= 8
                ? "Avg"
                : "High"
          }
          trendDir={
            Number(errPerAttempt) <= 3
              ? "up"
              : Number(errPerAttempt) <= 8
                ? "neutral"
                : "down"
          }
        />
      </div>

      {/* Personal bests */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="text-muted-foreground h-4 w-4" />
          <h2 className="text-sm font-semibold">Personal Bests</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between pt-4 pb-4">
              <div>
                <p className="text-muted-foreground text-xs tracking-widest uppercase">
                  Best accuracy
                </p>
                <p
                  className={`mt-1 text-2xl font-bold tabular-nums ${accColor(Number(bests?.bestAccuracy ?? 0))}`}
                >
                  {bests?.bestAccuracy != null ? `${bests.bestAccuracy}%` : "—"}
                </p>
              </div>
              <Target className="text-muted-foreground h-5 w-5" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between pt-4 pb-4">
              <div>
                <p className="text-muted-foreground text-xs tracking-widest uppercase">
                  Best WPM
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {bests?.bestWpm ?? "—"}
                </p>
              </div>
              <Zap className="text-muted-foreground h-5 w-5" />
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="flex items-center justify-between pt-4 pb-4">
              <div>
                <p className="text-muted-foreground text-xs tracking-widest uppercase">
                  Least mistakes
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-500 tabular-nums">
                  —
                </p>
              </div>
              <Flame className="text-muted-foreground h-5 w-5" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chart + Heatmap */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="text-muted-foreground h-4 w-4" />
                Progress Over Time
              </CardTitle>
              <div className="text-muted-foreground flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-0.5 w-4 rounded-full"
                    style={{ backgroundColor: "var(--chart-1)" }}
                  />
                  Accuracy
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-0.5 w-4 rounded-full"
                    style={{ backgroundColor: "var(--chart-2)" }}
                  />
                  Mistakes
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={<Skeleton className="h-40 w-full rounded-lg" />}
            >
              <ProgressChart
                userId={userId}
                includePractice={includePractice}
              />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BarChart2 className="text-muted-foreground h-4 w-4" />
              Activity This Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* No Suspense needed — heatmapData already fetched above with other suspense queries */}
            <ActivityHeatmap
              heatmapData={
                heatmapData as { date: Date | string; count: number }[]
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Per-test */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <BarChart2 className="text-muted-foreground h-4 w-4" />
          <h2 className="text-sm font-semibold">Per-Test Performance</h2>
        </div>
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
          <TestBreakdown
            userId={userId}
            includePractice={includePractice}
            isAdmin={isAdmin}
          />
        </Suspense>
      </div>

      {/* Recent attempts */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="text-muted-foreground h-4 w-4" />
          <h2 className="text-sm font-semibold">Recent Attempts</h2>
        </div>
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
          <RecentAttempts
            userId={userId}
            includePractice={includePractice}
            isAdmin={isAdmin}
          />
        </Suspense>
      </div>
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function ReportCardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Skeleton className="h-6 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border p-5 lg:col-span-3">
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border p-5 lg:col-span-2">
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

// ─── export ───────────────────────────────────────────────────────────────────

export type ReportCardClientProps = {
  userId?: string;
  isAdmin?: boolean;
  userName?: string;
};

export default function ReportCardClient({
  userId,
  isAdmin,
  userName,
}: ReportCardClientProps) {
  const title = isAdmin
    ? `${userName ? `${userName}'s` : "User"} Report Card`
    : "My Report Card";
  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {isAdmin
            ? "Full performance breakdown"
            : "Your full performance breakdown"}
        </p>
      </div>
      <Suspense fallback={<ReportCardSkeleton />}>
        <ReportCardInner userId={userId} isAdmin={isAdmin} />
      </Suspense>
    </div>
  );
}
