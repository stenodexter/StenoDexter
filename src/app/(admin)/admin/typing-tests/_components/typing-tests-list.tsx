// app/admin/typing-tests/_components/typing-tests-list.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
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
  Users,
  Trophy,
  Pencil,
  Trash2,
  CalendarDays,
  Search,
  ArrowUpDown,
  X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState, useTransition, useCallback, useEffect } from "react";
import { DeleteTypingTestDialog } from "./delete-typing-test-dialog";
import { cn } from "~/lib/utils";
import { useDebounce } from "~/hooks/use-debounce";

type TypingTest = {
  id: string;
  title: string;
  durationSeconds: number;
  createdAt: Date;
};

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

function TestRow({
  test,
  onDelete,
}: {
  test: TypingTest;
  onDelete: (id: string, title: string) => void;
}) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/admin/typing-tests/${test.id}`)}
      className="bg-card hover:bg-muted/30 flex cursor-pointer items-center gap-4 rounded-xl border px-5 py-3.5 transition-all"
    >
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">
        {test.title}
      </p>

      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <Clock className="h-3 w-3" />
        <span>{fmtDuration(test.durationSeconds)}</span>
      </div>

      <p className="text-muted-foreground/60 hidden text-xs lg:block">
        {format(test.createdAt, "do MMMM yyyy")}
      </p>

      <div
        className="flex shrink-0 items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/typing-tests/${test.id}/attempts`}>
            <Users className="h-3.5 w-3.5" />
            Attempts
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/typing-tests/${test.id}/leaderboard`}>
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
          onClick={() => onDelete(test.id, test.title)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-card flex items-center gap-4 rounded-xl border px-5 py-3.5"
        >
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
      {/* Search */}
      <div className="relative min-w-[220px] flex-1">
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

      {/* Date picker */}
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

      {/* Sort toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={onSortToggle}
        className="h-8 gap-1.5 text-xs"
        title={`Currently: ${sort}. Click to switch.`}
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

export function TypingTestList() {
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

  useEffect(() => {
    if (debouncedQuery === queryParam) return;
    setParams({ q: debouncedQuery });
  }, [debouncedQuery]);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const { data, isLoading } = trpc.typingTest.manage.list.useQuery({
    page,
    sort,
    date: dateParam ? new Date(dateParam) : undefined,
    search: queryParam || undefined,
  });

  const tests = (data?.data ?? []) as TypingTest[];

  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      p.set("page", "1");
      router.push(`?${p.toString()}`);
    },
    [searchParams, router],
  );

  const goPage = (n: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(n));
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
        <ListSkeleton />
      ) : tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <SearchX className="text-muted-foreground/30 h-7 w-7" />
          <p className="text-muted-foreground text-sm font-medium">
            No typing tests found
          </p>
          {(queryParam || dateParam) && (
            <button
              onClick={() => setParams({ q: "", date: "" })}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tests.map((t) => (
            <TestRow
              key={t.id}
              test={t}
              onDelete={(id, title) => setDeleteTarget({ id, title })}
            />
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
              onClick={() => goPage(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => goPage(page + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteTypingTestDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          testId={deleteTarget.id}
          testTitle={deleteTarget.title}
        />
      )}
    </div>
  );
}
