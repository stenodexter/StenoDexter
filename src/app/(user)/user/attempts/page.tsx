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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import {
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Hash,
  Zap,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  TextAlignJustify,
  CalendarIcon,
  X,
} from "lucide-react";
import { format, isToday } from "date-fns";

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

/** Convert a Date to "YYYY-MM-DD" local string, or undefined if today/null */
function toDateParam(d: Date | undefined): string | undefined {
  if (!d || isToday(d)) return undefined;
  return format(d, "yyyy-MM-dd");
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
          <p className="mb-1 line-clamp-3 text-sm font-semibold">
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
              "do MMM yyyy, hh:mm a",
            )}
          </span>
        </div>
      </div>

      {/* Mistakes — desktop */}
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

      {/* Accuracy + mistakes — mobile */}
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

  return (
    <div className="overflow-hidden rounded-xl border">
      <div
        className="bg-card hover:bg-muted/20 flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="bg-muted rounded-md p-1.5">
          <FileText className="text-muted-foreground h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 line-clamp-3 text-sm font-semibold">{testTitle}</p>
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
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined); // undefined = no filter

  const { data: reportData, isLoading: reportLoading } =
    trpc.user.getReport.useQuery(undefined, { staleTime: 60_000 });

  const { data: bestsData } = trpc.user.getPersonalBests.useQuery(undefined, {
    staleTime: 60_000,
  });

  const dateParam = toDateParam(dateFilter); // undefined when today or unset → no filter sent

  const { data, isLoading } = trpc.user.getAttemptsPaginated.useQuery(
    {
      page,
      limit: 20,
      type: type === "all" ? undefined : type,
      date: dateParam,
    },
    { staleTime: 30_000 },
  );

  const attempts = (data?.data ?? []) as unknown as Attempt[];
  const sorted = sort === "oldest" ? [...attempts].reverse() : attempts;
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

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
    if (!acc[a.testId]) {
      acc[a.testId] = {
        testId: a.testId,
        testTitle: a.testTitle,
        testType: a.testType,
        attempts: [],
      };
    }

    acc[a.testId]!.attempts.push(a);
    return acc;
  }, {});

  const dateBtnLabel =
    dateFilter && !isToday(dateFilter)
      ? format(dateFilter, "dd MMM yyyy")
      : "Filter by date";

  const hasDateFilter = !!dateFilter && !isToday(dateFilter);

  function handleDateSelect(d: Date | undefined) {
    // Selecting today or undefined clears the filter
    if (!d || isToday(d)) {
      setDateFilter(undefined);
    } else {
      setDateFilter(d);
    }
    setPage(0);
  }

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

      {/* ── Filters row ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type filter */}
        <ToggleGroup
          type="single"
          value={type}
          onValueChange={(v) => {
            if (v) {
              setType(v === "tests" ? "assessment" : (v as typeof type));
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

        {/* Sort filter */}
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

        {/* Group mode toggle */}
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
            <TextAlignJustify className="h-3.5 w-3.5" />
            List
          </ToggleGroupItem>
          <ToggleGroupItem
            value="grouped"
            className="data-[state=on]:bg-background data-[state=off]:text-muted-foreground h-8 cursor-pointer rounded-md px-3 text-xs font-medium data-[state=on]:shadow-sm"
          >
            <Layers className="h-3.5 w-3.5" />
            Group by test
          </ToggleGroupItem>
        </ToggleGroup>

        {/* ── Date filter ── */}
        <div className="flex items-center gap-1 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 gap-1.5 rounded-lg px-3 text-xs font-medium ${
                  hasDateFilter
                    ? "border-primary/50 bg-primary/5 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateBtnLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={handleDateSelect}
                disabled={(d) => d > new Date()} // no future dates
                initialFocus
              />
              {hasDateFilter && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground w-full text-xs"
                    onClick={() => {
                      setDateFilter(undefined);
                      setPage(0);
                    }}
                  >
                    Clear date filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Quick-clear pill shown when a date is active */}
          {hasDateFilter && (
            <button
              onClick={() => {
                setDateFilter(undefined);
                setPage(0);
              }}
              className="text-primary/80 hover:text-primary flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs transition-colors"
              aria-label="Clear date filter"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <ListSkeleton />
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <BarChart2 className="text-muted-foreground/30 mb-3 h-7 w-7" />
          <p className="text-muted-foreground text-sm font-medium">
            {hasDateFilter
              ? `No attempts on ${format(dateFilter!, "dd MMM yyyy")}`
              : "No attempts yet"}
          </p>
          <p className="text-muted-foreground/60 mt-1 text-xs">
            {hasDateFilter
              ? "Try a different date or clear the filter."
              : "Complete a test to see your history here."}
          </p>
          {hasDateFilter ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setDateFilter(undefined)}
            >
              Clear date filter
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/user">Find a test</Link>
            </Button>
          )}
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
