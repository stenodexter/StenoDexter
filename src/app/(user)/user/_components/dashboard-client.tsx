"use client";

// ─── app/user/dashboard/_components/user-dashboard.tsx ───────────────────────
//
// Layout:
//   Section 1 (row, min-h-[320px]):
//     70% — score+accuracy line chart
//     30% — stacked: recent attempts (top) | 30-day heatmap (bottom)
//   Section 2 (row):
//     60% — available tests table
//     40% — (free for future use, currently just the section ends)

import { Suspense, useState } from "react";
import { trpc } from "~/trpc/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Mic,
  PauseCircle,
  PenLine,
  Clock,
  FileText,
  CheckCircle2,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Trophy,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  isAfter,
  subHours,
  subDays,
  format,
  startOfDay,
  endOfToday,
  eachDayOfInterval,
  getDay,
  formatDistanceToNow,
} from "date-fns";
import Link from "next/link";
import { TestStartDialog } from "~/components/common/user/test-start-dialog";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtSec(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function isWithin24h(d: Date) {
  return isAfter(new Date(d), subHours(new Date(), 24));
}

// ═════════════════════════════════════════════════════════════════════════════
// CHART
// ═════════════════════════════════════════════════════════════════════════════

// Score = blue (#3b82f6), Accuracy = emerald (#10b981)
const SCORE_COLOR = "#3b82f6";
const ACCURACY_COLOR = "#10b981";

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border-border rounded-lg border px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          className="flex items-center justify-between gap-5"
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
            <span className="text-muted-foreground">{p.dataKey}</span>
          </div>
          <span className="font-bold tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressChart() {
  const [filter, setFilter] = useState<"all" | "assessment" | "practice">(
    "all",
  );

  const [series] = trpc.user.getProgressSeries.useSuspenseQuery({
    limit: 40,
    type: filter === "all" ? undefined : filter,
  });
  const [bests] = trpc.user.getPersonalBests.useSuspenseQuery({
    type: filter === "all" ? undefined : filter,
  });

  const chartData = series.map((r) => ({
    date: format(new Date(r.submittedAt), "d MMM"),
    Score: r.score,
    Accuracy: r.accuracy,
  }));

  const latest = series[series.length - 1]?.score ?? null;
  const prev = series[series.length - 2]?.score ?? null;
  const delta = latest !== null && prev !== null ? latest - prev : null;
  const latestAcc = series[series.length - 1]?.accuracy ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* ── header ── */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Progress
          </p>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {/* Score */}
            <div className="flex items-baseline gap-1.5">
              <span
                className="mt-0.5 h-2.5 w-2.5 shrink-0 self-center rounded-full"
                style={{ background: SCORE_COLOR }}
              />
              <span className="text-3xl font-bold tabular-nums">
                {latest ?? "—"}
              </span>
              <span className="text-muted-foreground text-sm">score</span>
              {delta !== null && delta !== 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-semibold ${
                    delta > 0 ? "text-emerald-500" : "text-destructive"
                  }`}
                >
                  {delta > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {delta > 0 ? "+" : ""}
                  {delta}
                </span>
              )}
            </div>

            <div className="bg-border h-5 w-px self-center" />

            {/* Accuracy */}
            <div className="flex items-baseline gap-1.5">
              <span
                className="mt-0.5 h-2.5 w-2.5 shrink-0 self-center rounded-full"
                style={{ background: ACCURACY_COLOR }}
              />
              <span className="text-3xl font-bold tabular-nums">
                {latestAcc ?? "—"}
                {latestAcc !== null && (
                  <span className="text-muted-foreground text-base font-normal">
                    %
                  </span>
                )}
              </span>
              <span className="text-muted-foreground text-sm">accuracy</span>
            </div>
          </div>

          {/* Personal bests */}
          {bests && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              {[
                { Icon: Trophy, label: "Best score", val: bests.bestScore },
                {
                  Icon: Target,
                  label: "Best acc",
                  val:
                    bests.bestAccuracy != null
                      ? `${bests.bestAccuracy}%`
                      : null,
                },
                { Icon: Zap, label: "Best WPM", val: bests.bestWpm },
              ].map(({ Icon, label, val }) =>
                val != null ? (
                  <span key={label} className="flex items-center gap-1 text-xs">
                    <Icon className="text-muted-foreground h-3 w-3" />
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold tabular-nums">
                      {String(val)}
                    </span>
                  </span>
                ) : null,
              )}
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5">
          {(["all", "assessment", "practice"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={[
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                filter === t
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── chart ── */}
      <div className="min-h-0 flex-1">
        {chartData.length < 2 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">
              Complete more tests to see your chart
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                content={<ChartTooltipContent />}
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="Score"
                stroke={SCORE_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: SCORE_COLOR }}
              />
              <Line
                type="monotone"
                dataKey="Accuracy"
                stroke={ACCURACY_COLOR}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: ACCURACY_COLOR }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── legend ── */}
      {chartData.length >= 2 && (
        <div className="mt-3 flex items-center gap-5">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-0.5 w-5 rounded-full"
              style={{ background: SCORE_COLOR }}
            />
            Score
          </span>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-0.5 w-5 rounded-full"
              style={{ background: ACCURACY_COLOR }}
            />
            Accuracy
          </span>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RECENT ATTEMPTS CARD (top of right panel)
// ═════════════════════════════════════════════════════════════════════════════

function RecentAttemptsPanel() {
  const [{ data }] = trpc.user.getAttemptsPaginated.useSuspenseQuery({
    page: 0,
    limit: 4,
  });

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
          Recent Attempts
        </p>
        <Link
          href="/user/attempts"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[10px] transition-colors"
        >
          View all
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-4 text-center">
          <p className="text-muted-foreground text-xs">No attempts yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {data.map((row) => {
            const acc = row.result.accuracy;
            const accColor =
              acc >= 90
                ? "text-emerald-500"
                : acc >= 70
                  ? "text-amber-500"
                  : "text-destructive";

            return (
              <Link
                key={row.attemptId}
                href={`/user/attempt/${row.attemptId}`}
                className="group hover:bg-muted/40 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs leading-none font-medium">
                    {row.test?.title ?? "—"}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    {formatDistanceToNow(new Date(row.result.submittedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-bold tabular-nums">
                    {row.result.score}
                  </span>
                  <span
                    className={`text-[10px] font-semibold tabular-nums ${accColor}`}
                  >
                    {acc}%
                  </span>
                  <ExternalLink className="text-muted-foreground/40 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 30-DAY HEATMAP (bottom of right panel)
// ═════════════════════════════════════════════════════════════════════════════

function HeatmapCell({
  count,
  avgScore,
  date,
}: {
  count: number;
  avgScore: number | null;
  date: Date;
}) {
  const label = format(date, "EEE, MMM d");

  const intensity =
    count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;

  const colors = [
    "bg-muted/50",
    "bg-emerald-900/60",
    "bg-emerald-700/70",
    "bg-emerald-500/80",
    "bg-emerald-400",
  ];

  return (
    <div
      title={
        count > 0
          ? `${label}: ${count} attempt${count !== 1 ? "s" : ""}${
              avgScore != null ? ` · avg ${Math.round(avgScore)}` : ""
            }`
          : label
      }
      className={`h-4 w-4 rounded-sm transition-colors ${colors[intensity]}`}
    />
  );
}

function Heatmap() {
  const [includePractice, setIncludePractice] = useState(true);

  // 🔥 tweak this based on how wide your card is
  const MAX_DAYS = 115; // ~10 weeks

  const from = startOfDay(subDays(new Date(), MAX_DAYS - 1));
  const to = endOfToday();

  const [heatmapData] = trpc.user.getHeatmap.useSuspenseQuery({
    from,
    to,
    includePractice,
  });

  const dataMap = new Map(
    heatmapData.map((d) => [
      d.date,
      { count: Number(d.count), avgScore: Number(d.avgScore) },
    ]),
  );

  // ✅ Build days ending at today (important)
  const allDays = Array.from({ length: MAX_DAYS }, (_, i) =>
    startOfDay(subDays(new Date(), MAX_DAYS - 1 - i)),
  );

  const firstDow = getDay(allDays[0]!);

  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(firstDow).fill(null);

  for (const day of allDays) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const totalAttempts = heatmapData.reduce((s, d) => s + Number(d.count), 0);
  const activeDays = heatmapData.filter((d) => Number(d.count) > 0).length;

  // Month labels
  const monthLabels: { label: string; weekIdx: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((w, wi) => {
    const first = w.find((d) => d !== null);
    if (first) {
      const m = first.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: format(first, "MMM"), weekIdx: wi });
        lastMonth = m;
      }
    }
  });

  const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Activity
          </p>
          <p className="text-muted-foreground text-[10px]">
            {totalAttempts} attempt{totalAttempts !== 1 ? "s" : ""} ·{" "}
            {activeDays} day{activeDays !== 1 ? "s" : ""} · last {MAX_DAYS}d
          </p>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
          <button
            onClick={() => setIncludePractice(true)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
              includePractice
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setIncludePractice(false)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
              !includePractice
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Assess
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex gap-1.5">
        {/* Day labels */}
        <div className="flex shrink-0 flex-col gap-1 pt-5">
          {DAYS.map((d, i) => (
            <span
              key={i}
              className="text-muted-foreground flex h-4 items-center text-[9px]"
            >
              {i % 2 === 1 ? d : ""}
            </span>
          ))}
        </div>

        <div>
          {/* Month labels */}
          <div className="mb-1 flex gap-1">
            {weeks.map((_, wi) => {
              const ml = monthLabels.find((m) => m.weekIdx === wi);
              return (
                <div key={wi} className="w-4">
                  {ml && (
                    <span className="text-muted-foreground text-[9px] whitespace-nowrap">
                      {ml.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cells */}
          <div className="flex gap-1">
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {w.map((day, di) =>
                  day ? (
                    <HeatmapCell
                      key={di}
                      date={day}
                      count={dataMap.get(format(day, "yyyy-MM-dd"))?.count ?? 0}
                      avgScore={
                        dataMap.get(format(day, "yyyy-MM-dd"))?.avgScore ?? null
                      }
                    />
                  ) : (
                    <div key={di} className="h-4 w-4" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-1 flex items-center justify-between">
        {/* Legend */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[9px]">Less</span>
          {[
            "bg-muted/50",
            "bg-emerald-900/60",
            "bg-emerald-700/70",
            "bg-emerald-500/80",
            "bg-emerald-400",
          ].map((c, i) => (
            <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
          ))}
          <span className="text-muted-foreground text-[9px]">More</span>
        </div>

        {/* CTA */}
        <Link
          href="/user/report-card"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[10px] transition-colors"
        >
          View Detailed Analytics
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TESTS TABLE (section 2)
// ═════════════════════════════════════════════════════════════════════════════

function TestsTable({ excludeIds }: { excludeIds: string[] }) {
  const [{ data, total }] = trpc.test.listForUser.useSuspenseQuery({ page: 1 });
  const rows = data.filter((t) => !excludeIds.includes(t.id)).slice(0, 8);
  const [selectedTest, setSelectedTest] = useState<{
    id: string;
    title: string;
    hasAttempted: boolean;
  } | null>(null);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Available Tests</h2>
          <p className="text-muted-foreground text-xs">Practice anytime</p>
        </div>
        <Link
          href="/user/tests"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
        >
          View all {total}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border">
        {/* Header */}
        <div className="bg-muted/20 grid grid-cols-[1fr_52px_44px_60px_76px] gap-3 border-b px-4 py-2.5">
          {["Test", "Dict", "Break", "Write", ""].map((h, i) => (
            <span
              key={i}
              className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase"
            >
              {h}
            </span>
          ))}
        </div>

        <div className="divide-y">
          {rows.map((t) => (
            <div
              key={t.id}
              className="hover:bg-muted/30 grid grid-cols-[1fr_52px_44px_60px_76px] items-center gap-3 px-4 py-2.5 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <span
                  className={[
                    "mt-0.5 inline-block rounded px-1 py-0.5 text-[9px] font-semibold tracking-wider uppercase ring-1 ring-inset",
                    t.type === "legal"
                      ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                      : "bg-violet-500/10 text-violet-400 ring-violet-500/20",
                  ].join(" ")}
                >
                  {t.type}
                </span>
              </div>
              <span className="text-muted-foreground text-xs tabular-nums">
                {fmtSec(t.dictationSeconds)}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {fmtSec(t.breakSeconds)}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {fmtSec(t.writtenDurationSeconds)}
              </span>
              <Button
                onClick={() =>
                  setSelectedTest({
                    id: t.id,
                    title: t.title,
                    hasAttempted: true,
                  })
                }
                variant="outline"
                className="text-xs"
              >
                Practice
              </Button>
            </div>
          ))}
        </div>
      </div>
      <TestStartDialog
        open={!!selectedTest}
        onOpenChange={(open) => {
          if (!open) setSelectedTest(null);
        }}
        testId={selectedTest?.id ?? ""}
        testTitle={selectedTest?.title ?? ""}
        isPractice={true}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 24H FEATURED TESTS (shown above the table if any)
// ═════════════════════════════════════════════════════════════════════════════

function FeaturedTestCard({
  id,
  title,
  type,
  dictationSeconds,
  breakSeconds,
  writtenDurationSeconds,
  createdAt,
  hasAttempted,
}: {
  id: string;
  title: string;
  type: "legal" | "general";
  dictationSeconds: number;
  breakSeconds: number;
  writtenDurationSeconds: number;
  createdAt: Date;
  hasAttempted: boolean;
}) {
  const total = fmtSec(
    dictationSeconds + breakSeconds + writtenDurationSeconds,
  );
  return (
    <div className="border-border bg-card/60 flex items-center gap-4 rounded-xl border px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{title}</p>
          <span
            className={[
              "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase ring-1 ring-inset",
              type === "legal"
                ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                : "bg-violet-500/10 text-violet-400 ring-violet-500/20",
            ].join(" ")}
          >
            {type}
          </span>
          <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-emerald-400 uppercase ring-1 ring-emerald-500/30 ring-inset">
            New
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        {[
          { Icon: Mic, val: fmtSec(dictationSeconds) },
          { Icon: PauseCircle, val: fmtSec(breakSeconds) },
          { Icon: PenLine, val: fmtSec(writtenDurationSeconds) },
        ].map(({ Icon, val }) => (
          <div
            key={val}
            className="text-muted-foreground flex items-center gap-1"
          >
            <Icon className="h-3 w-3" />
            <span className="text-xs tabular-nums">{val}</span>
          </div>
        ))}
        <div className="bg-border mx-1 h-3.5 w-px" />
        <div className="flex items-center gap-1 font-semibold">
          <Clock className="h-3 w-3" />
          <span className="text-xs tabular-nums">{total}</span>
        </div>
      </div>

      <Button size="sm" variant={hasAttempted ? "outline" : "default"} asChild>
        <Link href={`/user/test/${id}`}>
          {hasAttempted ? (
            <>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Practice
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Assessment
            </>
          )}
        </Link>
      </Button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SKELETONS
// ═════════════════════════════════════════════════════════════════════════════

function Section1Skeleton() {
  return (
    <div className="flex gap-5" style={{ minHeight: 340 }}>
      <div className="flex-[7] rounded-xl border p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-44 w-full rounded-lg" />
      </div>
      <div className="flex flex-[3] flex-col gap-4">
        <div className="flex-1 space-y-2 rounded-xl border p-4">
          <Skeleton className="h-3 w-28" />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded px-2 py-1.5"
            >
              <div className="space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-3 rounded-xl border p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function Section2Skeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="bg-muted/20 border-b px-4 py-2.5">
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-2.5">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-7 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// INNER
// ═════════════════════════════════════════════════════════════════════════════

function DashboardInner() {
  const [{ data: allTests }] = trpc.test.listForUser.useSuspenseQuery({
    page: 1,
  });

  const featured = allTests.filter((t) => isWithin24h(t.createdAt)).slice(0, 2);
  const featuredIds = featured.map((t) => t.id);

  return (
    <div className="space-y-6">
      {/* ── Section 1: Chart 70% | Recent attempts + Heatmap 30% ── */}
      <div className="flex gap-5" style={{ minHeight: 340 }}>
        {/* Chart */}
        <div className="min-w-0 flex-[7] rounded-xl border p-5">
          <ProgressChart />
        </div>

        {/* Right panel: attempts (top) + heatmap (bottom) */}
        <div className="flex min-w-0 flex-[3] flex-col gap-3">
          <RecentAttemptsPanel />
          <Heatmap />
        </div>
      </div>

      {/* ── Section 2: 24h tests (if any) + tests table ── */}
      <div className="space-y-3">
        {featured.length > 0 && (
          <div className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold">New Today</h2>
              <p className="text-muted-foreground text-xs">
                Assessment window closes 24h after release
              </p>
            </div>
            {featured.map((t) => (
              <FeaturedTestCard
                key={t.id}
                id={t.id}
                title={t.title}
                type={t.type}
                dictationSeconds={t.dictationSeconds}
                breakSeconds={t.breakSeconds}
                writtenDurationSeconds={t.writtenDurationSeconds}
                createdAt={t.createdAt}
                hasAttempted={t.hasAttempted}
              />
            ))}
          </div>
        )}

        <TestsTable excludeIds={featuredIds} />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function UserDashboard() {
  const from30 = startOfDay(subDays(new Date(), 29));

  trpc.user.getProgressSeries.useQuery({ limit: 40 }, { staleTime: 60_000 });
  trpc.user.getPersonalBests.useQuery(undefined, { staleTime: 60_000 });
  trpc.test.listForUser.useQuery({ page: 1 }, { staleTime: 30_000 });
  trpc.user.getAttemptsPaginated.useQuery(
    { page: 0, limit: 4 },
    { staleTime: 30_000 },
  );
  trpc.user.getHeatmap.useQuery(
    { from: from30, to: endOfToday(), includePractice: true },
    { staleTime: 60_000 },
  );

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Track your progress and attempt tests
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <Section1Skeleton />
            <Section2Skeleton />
          </div>
        }
      >
        <DashboardInner />
      </Suspense>
    </div>
  );
}
