"use client";

// ─── app/admin/analytics/_components/analytics-dashboard.tsx ─────────────────

import { useState, useMemo, Suspense } from "react";
import { trpc } from "~/trpc/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import {
  Users,
  Activity,
  FileText,
  BarChart3,
  TrendingUp,
  Target,
  Trophy,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GrowthDay = { date: string; count: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null, email: string) {
  if (name)
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns a "YYYY-MM-DD" string for n days ago.
 * Used only for client-side array filtering — never passed to tRPC.
 */
function cutoffDateStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0]!;
}

function mergeGrowth(growth: {
  newUsers: GrowthDay[];
  attempts: GrowthDay[];
  submissions: GrowthDay[];
}) {
  const map = new Map<
    string,
    { date: string; users: number; attempts: number; submissions: number }
  >();

  for (const d of growth.newUsers)
    map.set(d.date, {
      date: d.date,
      users: d.count,
      attempts: 0,
      submissions: 0,
    });

  for (const d of growth.attempts) {
    const e = map.get(d.date) ?? {
      date: d.date,
      users: 0,
      attempts: 0,
      submissions: 0,
    };
    map.set(d.date, { ...e, attempts: d.count });
  }

  for (const d of growth.submissions) {
    const e = map.get(d.date) ?? {
      date: d.date,
      users: 0,
      attempts: 0,
      submissions: 0,
    };
    map.set(d.date, { ...e, submissions: d.count });
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  iconClass?: string;
}) {
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendClass =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              {label}
            </p>
            <p className="text-3xl font-bold tabular-nums">{value}</p>
            {sub && (
              <div className="flex items-center gap-1">
                {trend && <TrendIcon className={`h-3 w-3 ${trendClass}`} />}
                <p
                  className={`text-xs ${trend ? trendClass : "text-muted-foreground"}`}
                >
                  {sub}
                </p>
              </div>
            )}
          </div>
          <div className="bg-muted rounded-md p-2">
            <Icon
              className={`h-4 w-4 ${iconClass ?? "text-muted-foreground"}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted rounded-md p-1.5">
        <Icon className="text-muted-foreground h-4 w-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Growth Chart ─────────────────────────────────────────────────────────────
// NOTE: The range selector filters the already-fetched full dataset in memory.
// We deliberately do NOT re-call tRPC with a Date argument — passing Date
// objects as tRPC input causes serialization failures over HTTP.

const growthConfig = {
  users: {
    label: "New Users",
    color: "hsl(142, 71%, 45%)", // emerald
  },
  attempts: {
    label: "Attempts",
    color: "hsl(217, 91%, 60%)", // blue
  },
  submissions: {
    label: "Submissions",
    color: "hsl(262, 83%, 58%)", // purple
  },
};

function GrowthChart({
  allTimeData,
}: {
  allTimeData: {
    newUsers: GrowthDay[];
    attempts: GrowthDay[];
    submissions: GrowthDay[];
  };
}) {
  const [range, setRange] = useState<"7" | "30" | "90">("30");

  // Slice the full dataset by date range — zero network calls.
  const filtered = useMemo(() => {
    const cutoff = cutoffDateStr(Number(range));
    const f = (arr: GrowthDay[]) => arr.filter((d) => d.date >= cutoff);
    return {
      newUsers: f(allTimeData.newUsers),
      attempts: f(allTimeData.attempts),
      submissions: f(allTimeData.submissions),
    };
  }, [allTimeData, range]);

  const chartData = mergeGrowth(filtered);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Platform Growth
            </CardTitle>
            <CardDescription className="text-xs">
              New users, attempts &amp; completions over time
            </CardDescription>
          </div>
          <Select
            value={range}
            onValueChange={(v) => setRange(v as "7" | "30" | "90")}
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7d</SelectItem>
              <SelectItem value="30">Last 30d</SelectItem>
              <SelectItem value="90">Last 90d</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={growthConfig} className="h-[200px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-users)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-users)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="fillAttempts" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-attempts)"
                  stopOpacity={0.15}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-attempts)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="fillSubmissions" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-submissions)"
                  stopOpacity={0.15}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-submissions)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtDate}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              className="fill-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              allowDecimals={false}
              className="fill-muted-foreground"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="users"
              stroke="var(--color-users)"
              fill="url(#fillUsers)"
              strokeWidth={1.5}
              dot={false}
            />
            <Area
              dataKey="attempts"
              stroke="var(--color-attempts)"
              fill="url(#fillAttempts)"
              strokeWidth={1.5}
              dot={false}
            />
            <Area
              dataKey="submissions"
              stroke="var(--color-submissions)"
              fill="url(#fillSubmissions)"
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {Object.entries(growthConfig).map(([key, cfg]) => (
            <span
              key={key}
              className="text-muted-foreground flex items-center gap-1.5 text-xs"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: cfg.color }}
              />
              {cfg.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Test Performance ─────────────────────────────────────────────────────────

const scoreConfig: ChartConfig = {
  avgScore: { label: "Avg Score", color: "hsl(var(--chart-1))" },
  avgAccuracy: { label: "Avg Accuracy", color: "hsl(var(--chart-2))" },
};

function TestPerformanceSection({
  testPerformance,
  testTitles,
}: {
  testPerformance: {
    testId: string;
    attempts: number;
    avgScore: number;
    avgWpm: number;
    avgAccuracy: number;
  }[];
  testTitles: Map<string, string>;
}) {
  const sorted = [...testPerformance]
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 8);

  const chartData = sorted.map((t) => ({
    name: testTitles.get(t.testId) ?? t.testId.slice(0, 8),
    avgScore: Math.round(Number(t.avgScore) ?? 0),
    avgAccuracy: Math.round(Number(t.avgAccuracy) ?? 0),
    attempts: t.attempts,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Score &amp; Accuracy by Test
          </CardTitle>
          <CardDescription className="text-xs">
            Top 8 most attempted tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={scoreConfig} className="h-[220px] w-full">
            <BarChart data={chartData} layout="vertical" barCategoryGap="25%">
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                className="stroke-border"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                className="fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                width={90}
                className="fill-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="avgScore"
                fill="var(--color-avgScore)"
                radius={[0, 3, 3, 0]}
                maxBarSize={10}
              />
              <Bar
                dataKey="avgAccuracy"
                fill="var(--color-avgAccuracy)"
                radius={[0, 3, 3, 0]}
                maxBarSize={10}
              />
            </BarChart>
          </ChartContainer>

          <div className="mt-3 flex gap-4">
            {Object.entries(scoreConfig).map(([key, cfg]) => (
              <span
                key={key}
                className="text-muted-foreground flex items-center gap-1.5 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: cfg.color }}
                />
                {cfg.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold">All Tests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {testPerformance.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <BarChart3 className="text-muted-foreground/40 h-8 w-8" />
              <p className="text-muted-foreground text-sm">No test data yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead className="text-right">Avg Score</TableHead>
                  <TableHead className="text-right">Avg WPM</TableHead>
                  <TableHead className="text-right">Avg Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...testPerformance]
                  .sort((a, b) => b.attempts - a.attempts)
                  .map((t) => {
                    const acc = Math.round(Number(t.avgAccuracy) ?? 0);
                    return (
                      <TableRow key={t.testId}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {testTitles.get(t.testId) ?? "Unknown test"}
                            </p>
                            <p className="text-muted-foreground font-mono text-[10px]">
                              {t.testId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t.attempts}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {Math.round(Number(t.avgScore) ?? 0)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right tabular-nums">
                          {Math.round(Number(t.avgWpm) ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span
                            className={
                              acc >= 90
                                ? "font-semibold text-emerald-500"
                                : acc >= 70
                                  ? "font-semibold text-amber-500"
                                  : "text-destructive font-semibold"
                            }
                          >
                            {acc}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Top Performers ───────────────────────────────────────────────────────────

const MEDALS = ["🥇", "🥈", "🥉"];

function TopPerformersSection({
  topPerformers,
  totalEntries,
}: {
  topPerformers: {
    rank: number;
    user: {
      id: string;
      name: string | null;
      email: string;
      profilePicUrl: string | null;
    };
    totalPoints: number;
    testsPlayed: number;
    firstPlaces: number;
  }[];
  totalEntries: number;
}) {
  if (topPerformers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Trophy className="text-muted-foreground/40 h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            No leaderboard data yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const max = topPerformers[0]?.totalPoints ?? 1;

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Global Leaderboard
            </CardTitle>
            <CardDescription className="text-xs">
              Ranked by normalised points across all tests
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {totalEntries} entries
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {topPerformers.map((p) => {
            const pct = Math.round((p.totalPoints / max) * 100);
            return (
              <div
                key={p.user.id}
                className="hover:bg-muted/40 flex items-center gap-4 px-5 py-3.5 transition-colors"
              >
                <span className="w-6 shrink-0 text-center text-sm">
                  {p.rank <= 3 ? (
                    MEDALS[p.rank - 1]
                  ) : (
                    <span className="text-muted-foreground font-semibold">
                      {p.rank}
                    </span>
                  )}
                </span>

                <Avatar className="h-8 w-8 shrink-0">
                  {p.user.profilePicUrl && (
                    <AvatarImage
                      src={p.user.profilePicUrl}
                      alt={p.user.name ?? ""}
                    />
                  )}
                  <AvatarFallback className="text-xs font-semibold">
                    {initials(p.user.name, p.user.email)}
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

                <div className="flex w-32 flex-col items-end gap-1.5">
                  <span className="text-sm font-bold tabular-nums">
                    {Math.round(p.totalPoints)} pts
                  </span>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="text-muted-foreground shrink-0 text-right text-xs">
                  <p>{p.testsPlayed} tests</p>
                  {p.firstPlaces > 0 && (
                    <p className="font-semibold text-amber-500">
                      {p.firstPlaces} #1{p.firstPlaces !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-2 pt-5 pb-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-0">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Inner (runs inside Suspense, all useSuspenseQuery) ───────────────────────

function AnalyticsInner() {
  const [overview] = trpc.analytics.getPlatformOverview.useSuspenseQuery();
  const [engagement] = trpc.analytics.getEngagementMetrics.useSuspenseQuery();

  // Fetch ALL growth data — no date arg, no serialization issues.
  // Range filtering happens client-side inside <GrowthChart>.
  const [growth] = trpc.analytics.getGrowthAnalytics.useSuspenseQuery({});

  const [leaderboard] =
    trpc.analytics.getLeaderboardAnalytics.useSuspenseQuery();
  const [topPerformers] =
    trpc.analytics.getGlobalTopPerformers.useSuspenseQuery({ limit: 10 });

  const stickiness =
    engagement.mau > 0
      ? Math.round((engagement.dau / engagement.mau) * 100)
      : 0;

  const completionRate =
    overview.totalAttempts > 0
      ? Math.round(
          ((leaderboard.overall?.totalEntries ?? 0) / overview.totalAttempts) *
            100,
        )
      : 0;

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Platform performance overview
        </p>
      </div>

      {/* ── Overview KPIs ── */}
      <section className="space-y-3">
        <SectionHeader
          icon={BarChart3}
          title="Platform Overview"
          description="Lifetime totals"
        />
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Total Users"
            value={overview.totalUsers}
            sub={`${overview.activeUsers.last1d} active today`}
            iconClass="text-violet-500"
          />
          <KpiCard
            icon={FileText}
            label="Total Tests"
            value={overview.totalTests}
            iconClass="text-amber-500"
          />
          <KpiCard
            icon={Activity}
            label="Total Attempts"
            value={overview.totalAttempts}
            iconClass="text-blue-500"
          />
          <KpiCard
            icon={Target}
            label="Completion Rate"
            value={`${completionRate}%`}
            sub="Attempts → submitted"
            trend={
              completionRate >= 70
                ? "up"
                : completionRate >= 40
                  ? "neutral"
                  : "down"
            }
            iconClass="text-emerald-500"
          />
        </div>
      </section>

      {/* ── Engagement KPIs ── */}
      <section className="space-y-3">
        <SectionHeader
          icon={Zap}
          title="Engagement"
          description="User activity windows"
        />
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            icon={Activity}
            label="DAU"
            value={engagement.dau}
            sub="Last 24 hours"
            iconClass="text-blue-500"
          />
          <KpiCard
            icon={Activity}
            label="WAU"
            value={engagement.wau}
            sub="Last 7 days"
            iconClass="text-indigo-500"
          />
          <KpiCard
            icon={Activity}
            label="MAU"
            value={engagement.mau}
            sub="Last 30 days"
            iconClass="text-violet-500"
          />
          <KpiCard
            icon={TrendingUp}
            label="Stickiness"
            value={`${stickiness}%`}
            sub="DAU / MAU ratio"
            trend={
              stickiness >= 20 ? "up" : stickiness >= 10 ? "neutral" : "down"
            }
            iconClass="text-emerald-500"
          />
        </div>
      </section>

      <Separator />

      {/* ── Growth chart ── */}
      <section className="space-y-3">
        <SectionHeader
          icon={TrendingUp}
          title="Growth"
          description="Daily new users, attempts, and completions"
        />
        {/* allTimeData — GrowthChart slices by range internally, no fetch */}
        <GrowthChart allTimeData={growth} />
      </section>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-8 px-6 py-8">
          <div className="space-y-1">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <KpiSkeleton />
          <KpiSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
          <TableSkeleton />
        </div>
      }
    >
      <AnalyticsInner />
    </Suspense>
  );
}
