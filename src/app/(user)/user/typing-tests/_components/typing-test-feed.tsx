// app/(user)/typing-tests/_components/typing-test-feed.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  ChevronLeft,
  ChevronRight,
  SearchX,
  Clock,
  Search,
  ArrowUpDown,
  X,
  CalendarDays,
  PlayCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "~/lib/utils";
import { useDebounce } from "~/hooks/use-debounce";
import { TypingTestStartDialog } from "~/components/common/user/typing-test-start-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

type TypingTestCard = {
  id: string;
  title: string;
  durationSeconds: number;
  createdAt: Date;
  userAttemptCount: number;
  isAssessed: boolean;
};

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

// ── table row ─────────────────────────────────────────────────────────────────

function TestRow({
  test,
  onStart,
}: {
  test: TypingTestCard;
  onStart: (test: TypingTestCard) => void;
}) {
  const router = useRouter();

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/user/typing-tests/${test.id}`);
      }}
      className="bg-card hover:bg-muted/30 grid cursor-pointer grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 rounded-xl border px-5 py-3.5 transition-all"
    >
      {/* title */}
      <p className="min-w-0 truncate text-sm font-semibold">{test.title}</p>

      {/* duration */}
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <Tooltip>
          <TooltipTrigger className="hover:bg-card/10 flex items-center justify-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{fmtDuration(test.durationSeconds)}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Duration</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <span className="tabular-nums">
          {test.userAttemptCount} attempt
          {test.userAttemptCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* action */}
      <Button
        size="sm"
        variant={test.isAssessed ? "outline" : "default"}
        className={cn("h-7 text-xs", !test.isAssessed)}
        onClick={(e) => {
          e.stopPropagation();
          onStart(test);
        }}
      >
        {test.isAssessed ? "Practice" : "Give Test"}
      </Button>
    </div>
  );
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-card grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 rounded-xl border px-5 py-3.5"
        >
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

// ── filter bar ────────────────────────────────────────────────────────────────

function FilterBar({
  query,
  date,
  sort,
  onQueryChange,
  onDateChange,
  onSortToggle,
  total,
}: {
  query: string;
  date?: string;
  sort: "newest" | "oldest";
  onQueryChange: (q: string) => void;
  onDateChange: (d: string) => void;
  onSortToggle: () => void;
  total?: number;
}) {
  const selectedDate = date ? new Date(date) : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
        <Input
          placeholder="Search tests…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-8 pl-8 text-sm"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1.5 text-xs",
              selectedDate && "border-primary/50 text-primary",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {selectedDate ? format(selectedDate, "dd MMM yyyy") : "Pick date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => onDateChange(d ? format(d, "yyyy-MM-dd") : "")}
            initialFocus
          />
          {selectedDate && (
            <div className="border-t px-3 py-2">
              <button
                onClick={() => onDateChange("")}
                className="text-muted-foreground hover:text-foreground w-full text-center text-xs underline"
              >
                Clear date
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        onClick={onSortToggle}
        className="h-8 gap-1.5 text-xs"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {sort === "newest" ? "Newest" : "Oldest"}
      </Button>

      {total !== undefined && (
        <p className="text-muted-foreground ml-auto text-xs tabular-nums">
          {total} test{total !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export function TypingTestFeed() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const sort = (searchParams.get("sort") === "oldest" ? "oldest" : "newest") as
    | "newest"
    | "oldest";
  const dateParam = searchParams.get("date") ?? undefined;
  const queryParam = searchParams.get("q") ?? "";

  const [localQuery, setLocalQuery] = useState(queryParam);
  const debouncedQuery = useDebounce(localQuery, 400);
  const [startTarget, setStartTarget] = useState<TypingTestCard | null>(null);

  useEffect(() => {
    if (debouncedQuery === queryParam) return;
    setParams({ q: debouncedQuery });
  }, [debouncedQuery]);

  const { data, isLoading } = trpc.typingTest.manage.list.useQuery({
    page,
    sort,
    date: dateParam ? new Date(dateParam) : undefined,
    search: queryParam || undefined,
  });

  const tests = (data?.data ?? []) as TypingTestCard[];

  const setParams = (updates: Record<string, string>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.set("page", "1");
    router.push(`?${p.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        query={localQuery}
        date={dateParam}
        sort={sort}
        onQueryChange={setLocalQuery}
        onDateChange={(d) => setParams({ date: d })}
        onSortToggle={() =>
          setParams({ sort: sort === "newest" ? "oldest" : "newest" })
        }
        total={data?.total}
      />

      {isLoading ? (
        <TableSkeleton />
      ) : tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <SearchX className="text-muted-foreground/30 h-7 w-7" />
          <p className="text-muted-foreground text-sm font-medium">
            No typing tests found
          </p>
          {(localQuery || dateParam) && (
            <button
              onClick={() => {
                setLocalQuery("");
                setParams({ q: "", date: "" });
              }}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tests.map((t) => (
            <TestRow key={t.id} test={t} onStart={setStartTarget} />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground/50 text-xs tabular-nums">
            Page {page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString());
                p.set("page", String(page - 1));
                router.push(`?${p.toString()}`);
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString());
                p.set("page", String(page + 1));
                router.push(`?${p.toString()}`);
              }}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {startTarget && (
        <TypingTestStartDialog
          open={!!startTarget}
          onOpenChange={(o) => !o && setStartTarget(null)}
          test={startTarget}
        />
      )}
    </div>
  );
}
