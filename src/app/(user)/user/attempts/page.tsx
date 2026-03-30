"use client";

// ─── app/(user)/attempts/page.tsx ────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Target,
  TrendingUp,
  Hash,
  Zap,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  TextAlignJustify,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// ─── types ────────────────────────────────────────────────────────────────────

type Attempt = {
  attemptId: string;
  type: "assessment" | "practice";
  testId: string;
  speedId: string;
  testTitle: string;
  testType: string;
  speedWpm: number;
  result: {
    accuracy: number;
    wpm: number;
    mistakes: number;
    submittedAt: Date;
  };
};

function transformAttemptType(type: Attempt["type"]) {
  return type === "assessment" ? "test" : "practice";
}

type GroupMode = "flat" | "grouped";

// ─── helpers ──────────────────────────────────────────────────────────────────

function accuracyCls(a: number) {
  return a >= 90
    ? "text-emerald-600 dark:text-emerald-400"
    : a >= 70
      ? "text-amber-500"
      : "text-red-500";
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-card flex items-center gap-4 rounded-xl border px-5 py-4">
      <div className="bg-primary/10 rounded-lg p-2.5">
        <Icon className="text-primary h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
    </div>
  );
}

// ─── single attempt row ───────────────────────────────────────────────────────

function AttemptRow({
  attempt,
  showTitle = true,
}: {
  attempt: Attempt;
  showTitle?: boolean;
}) {
  return (
    <div className="bg-card hover:bg-muted/20 flex items-center gap-4 rounded-xl border px-5 py-3.5 transition-colors">
      {/* Left */}
      <div className="min-w-0 flex-1">
        {showTitle && (
          <p className="mb-1 truncate text-sm font-semibold">
            {attempt.testTitle}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={attempt.type === "assessment" ? "default" : "secondary"}
            className="text-[10px] capitalize"
          >
            {transformAttemptType(attempt.type)}
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px] tabular-nums">
            <Zap className="h-2.5 w-2.5" />
            {attempt.speedWpm} WPM
          </Badge>
          <span className="text-muted-foreground text-xs tabular-nums">
            {format(
              new Date(attempt.result.submittedAt),
              "dd MMM yyyy, hh:mm a",
            )}
          </span>
          <span className="text-muted-foreground/50 text-xs">
            {formatDistanceToNow(new Date(attempt.result.submittedAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>

      {/* Stats — desktop */}
      <div className="hidden shrink-0 items-center gap-5 sm:flex">
        <div className="text-center">
          <p className="text-base font-bold text-red-500 tabular-nums">
            {attempt.result.mistakes}
          </p>
          <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
            Mistakes
          </p>
        </div>
      </div>
      <Separator orientation="vertical" className="h-7" />

      {/* Stats — mobile */}
      <div className="flex items-center gap-1.5 sm:hidden">
        <span
          className={`text-sm font-bold tabular-nums ${accuracyCls(attempt.result.accuracy)}`}
        >
          {attempt.result.accuracy}%
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-sm font-bold text-red-500 tabular-nums">
          {attempt.result.mistakes}
        </span>
      </div>

      {/* CTA */}
      <Button asChild variant="ghost" size="sm" className="shrink-0">
        <Link
          href={`/user/tests/${attempt.testId}/results?attemptId=${attempt.attemptId}`}
        >
          <BarChart2 className="h-3.5 w-3.5" />
          View
        </Link>
      </Button>
    </div>
  );
}

// ─── grouped by test ──────────────────────────────────────────────────────────

function TestGroup({
  testId,
  testTitle,
  testType,
  attempts,
}: {
  testId: string;
  testTitle: string;
  testType: string;
  attempts: Attempt[];
}) {
  const [open, setOpen] = useState(true);
  const best = Math.max(...attempts.map((a) => a.result.accuracy));

  return (
    <div className="overflow-hidden rounded-xl border">
      {/* Group header */}
      <div
        className="bg-card hover:bg-muted/20 flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="bg-muted rounded-md p-1.5">
          <FileText className="text-muted-foreground h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{testTitle}</p>
          <p className="text-muted-foreground text-xs capitalize">
            {testType} · {attempts.length} attempt
            {attempts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/user/test/${testId}/results`}>
              <BarChart2 className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {open ? (
            <ChevronUp className="text-muted-foreground h-4 w-4" />
          ) : (
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          )}
        </div>
      </div>

      {/* Attempts under this test */}
      {open && (
        <div className="bg-muted/5 divide-y border-t">
          {attempts.map((a) => (
            <div key={a.attemptId} className="px-3 py-2">
              <AttemptRow attempt={a} showTitle={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── skeletons ────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-card flex items-center gap-4 rounded-xl border px-5 py-4"
        >
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-card flex items-center gap-4 rounded-xl border px-5 py-3.5"
        >
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="hidden h-7 w-24 sm:block" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function UserAttemptsPage() {
  const [page, setPage] = useState(0);
  const [type, setType] = useState<"all" | "assessment" | "practice">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [groupMode, setGroupMode] = useState<GroupMode>("flat");

  const { data: reportData, isLoading: reportLoading } =
    trpc.user.getReport.useQuery(undefined, { staleTime: 60_000 });

  const { data: bestsData } = trpc.user.getPersonalBests.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data, isLoading } = trpc.user.getAttemptsPaginated.useQuery(
    { page, limit: 20, type: type === "all" ? undefined : type },
    { staleTime: 30_000 },
  );

  const attempts = (data?.data ?? []) as unknown as Attempt[];
  const sorted = sort === "oldest" ? [...attempts].reverse() : attempts;
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  // Group by test for grouped view
  const grouped = sorted.reduce<
    Record<
      string,
      {
        testId: string;
        testTitle: string;
        testType: string;
        attempts: Attempt[];
      }
    >
  >((acc, a) => {
    if (!acc[a.testId])
      acc[a.testId] = {
        testId: a.testId,
        testTitle: a.testTitle,
        testType: a.testType,
        attempts: [],
      };
    acc[a.testId]!.attempts.push(a);
    return acc;
  }, {});

  return (
    <div className="w-full space-y-6 px-6 py-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Attempts</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Every attempt you've submitted
          </p>
        </div>
        {!reportLoading && total > 0 && (
          <p className="text-muted-foreground/60 text-sm tabular-nums">
            {total} total
          </p>
        )}
      </div>

      {/* Stats */}
      {reportLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Hash}
            label="Total attempts"
            value={Number(reportData?.totalAttempts ?? 0)}
          />

          <StatCard
            icon={Zap}
            label="Avg Transcription Speed"
            value={
              reportData?.avgWpm ? Math.round(Number(reportData.avgWpm)) : "—"
            }
          />
        </div>
      )}

      <Separator />

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          value={type}
          onValueChange={(v) => {
            if (v) {
              if (v === "tests") {
                setType("assessment");
                setPage(0);
                return;
              }
              setType(v as typeof type);
              setPage(0);
            }
          }}
          className="bg-muted/40 h-9 gap-0 rounded-lg border p-0.5"
        >
          {(["all", "tests", "practice"] as const).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="data-[state=on]:bg-background data-[state=off]:text-muted-foreground h-8 rounded-md px-3 text-xs font-medium capitalize data-[state=on]:shadow-sm"
            >
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={sort}
          onValueChange={(v) => v && setSort(v as typeof sort)}
          className="bg-muted/40 h-9 gap-0 rounded-lg border p-0.5"
        >
          {(["newest", "oldest"] as const).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="data-[state=on]:bg-background data-[state=off]:text-muted-foreground h-8 rounded-md px-3 text-xs font-medium capitalize data-[state=on]:shadow-sm"
            >
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Group toggle */}
        <ToggleGroup
          type="single"
          value={groupMode}
          onValueChange={(v) => v && setGroupMode(v as GroupMode)}
          className="bg-muted/40 h-9 gap-0 rounded-lg border p-0.5"
        >
          <ToggleGroupItem
            value="flat"
            className="data-[state=on]:bg-background data-[state=off]:text-muted-foreground h-8 cursor-pointer rounded-md px-3 text-xs font-medium data-[state=on]:shadow-sm"
          >
            <TextAlignJustify className="h-1 w-1" />
            List
          </ToggleGroupItem>
          <ToggleGroupItem
            value="grouped"
            className="data-[state=on]:bg-background data-[state=off]:text-muted-foreground h-8 cursor-pointer rounded-md px-3 text-xs font-medium data-[state=on]:shadow-sm"
          >
            <Layers className="h-1 w-1" />
            Group by test
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      {isLoading ? (
        <ListSkeleton />
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <BarChart2 className="text-muted-foreground/30 mb-3 h-7 w-7" />
          <p className="text-muted-foreground text-sm font-medium">
            No attempts yet
          </p>
          <p className="text-muted-foreground/60 mt-1 text-xs">
            Complete a test to see your history here.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/user">Find a test</Link>
          </Button>
        </div>
      ) : groupMode === "grouped" ? (
        <div className="space-y-3">
          {Object.values(grouped).map((g) => (
            <TestGroup key={g.testId} {...g} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((a) => (
            <AttemptRow key={a.attemptId} attempt={a} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground/60 text-xs tabular-nums">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
