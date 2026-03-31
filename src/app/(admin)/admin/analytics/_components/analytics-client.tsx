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

type TrendDir = "up" | "down" | "neutral";

type Variant = "primary" | "secondary";

export function StatCard({
  label,
  value,
  story,
  sub,
  icon: Icon,
  trend,
  trendDir = "neutral",
  variant = "secondary",
}: {
  label: string;
  value: string | number;
  story?: string;
  sub?: string;
  icon: React.ElementType;
  trend?: string;
  trendDir?: TrendDir;
  variant?: Variant;
}) {
  const trendStyles =
    trendDir === "up"
      ? "bg-emerald-500/15 text-emerald-500"
      : trendDir === "down"
        ? "bg-red-500/15 text-red-400"
        : "bg-muted text-muted-foreground";

  const trendArrow = trendDir === "up" ? "▲" : trendDir === "down" ? "▼" : "•";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${variant === "primary" ? "col-span-2 p-6" : "p-4"} `}
      style={{
        background:
          variant === "primary"
            ? "radial-gradient(ellipse at top right, color-mix(in oklch, var(--chart-1) 10%, var(--card)), var(--card))"
            : "radial-gradient(ellipse at top right, color-mix(in oklch, var(--chart-1) 5%, var(--card)), var(--card))",
      }}
    >
      {/* Top */}
      <div className="flex items-start justify-between">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>

        {trend && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${trendStyles}`}
          >
            {trendArrow} {trend}
          </span>
        )}
      </div>

      {/* Value */}
      <p
        className={`mt-2 font-bold tabular-nums ${
          variant === "primary" ? "text-5xl" : "text-2xl"
        }`}
      >
        {value}
      </p>

      {/* Bottom */}
      {(story || sub) && (
        <div className="mt-3 space-y-1">
          {story && (
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              {story}
              <Icon className="h-3.5 w-3.5 opacity-70" />
            </p>
          )}
          {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
        </div>
      )}
    </div>
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
      <div className="grid grid-cols-4 gap-4">
        {/* BIG CARDS */}
        <StatCard
          variant="primary"
          label="Users"
          value={overview.totalUsers}
          story="Active today"
          sub={`${overview.activeUsers.last1d} users`}
          icon={Users}
          trend="+7%"
          trendDir="up"
        />

        <StatCard
          variant="primary"
          label="Attempts"
          value={overview.totalAttempts}
          story="User activity"
          sub={`${overview.activeUsers.last7d} active`}
          icon={Activity}
          trend="+12%"
          trendDir="up"
        />

        {/* SMALL CARDS */}
        <StatCard
          label="Tests"
          value={overview.totalTests}
          story="Total created"
          sub="All time"
          icon={FileText}
        />

        <StatCard
          label="Completion"
          value={`${completionRate}%`}
          story="Conversion"
          sub="Attempts → submissions"
          icon={Target}
          trendDir={
            completionRate >= 70
              ? "up"
              : completionRate >= 40
                ? "neutral"
                : "down"
          }
        />
        <StatCard
          label="Stickiness"
          value={`${stickiness}%`}
          sub="DAU / MAU"
          icon={TrendingUp}
        />
      </div>

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
