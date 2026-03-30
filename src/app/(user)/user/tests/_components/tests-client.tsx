"use client";

// ─── app/(user)/page.tsx  (default user home = /user/) ───────────────────────

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Gavel,
  FileText,
  Star,
  Trophy,
  BarChart2,
  Zap,
  Flame,
  RotateCcw,
  CalendarIcon,
} from "lucide-react";
import { isAfter, subHours, isSameDay, format } from "date-fns";
import { TestStartDialog } from "~/components/common/user/test-start-dialog";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

// ─── types ────────────────────────────────────────────────────────────────────

type Speed = {
  id: string;
  wpm: number;
  dictationSeconds: number;
  breakSeconds: number;
  writtenDurationSeconds: number;
  hasAssessed: boolean;
};

type TestItem = {
  id: string;
  title: string;
  type: "legal" | "general" | "special";
  createdAt: Date;
  attemptCount: number;
  hasAttempted: boolean;
  speeds: Speed[];
};

type Selected = { test: TestItem };

// ─── helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])!;
}

function formatDate(d: Date) {
  return `${ordinal(d.getDate())} ${format(d, "MMMM yyyy")}`;
}

function isWithin24h(d: Date) {
  return isAfter(new Date(d), subHours(new Date(), 24));
}

function canAssess(test: TestItem) {
  return isWithin24h(test.createdAt) && test.speeds.some((s) => !s.hasAssessed);
}

function useDebounce<T>(val: T, ms = 350) {
  const [v, setV] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setV(val), ms);
    return () => clearTimeout(t);
  }, [val, ms]);
  return v;
}

function formatWrittenDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

// ─── badges ───────────────────────────────────────────────────────────────────

const TYPE_ICON = { legal: Gavel, general: FileText, special: Star };
const TYPE_LABEL = { legal: "Legal", general: "General", special: "Special" };

function TypeBadge({ type }: { type: TestItem["type"] }) {
  const Icon = TYPE_ICON[type];
  return (
    <Badge variant={"default"} className="gap-1 text-[10px]">
      <Icon className="h-2.5 w-2.5" />
      {TYPE_LABEL[type]}
    </Badge>
  );
}

function NewBadge() {
  return (
    <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
      New
    </Badge>
  );
}

// ─── action button ────────────────────────────────────────────────────────────

function ActionButton({
  test,
  onSelect,
}: {
  test: TestItem;
  onSelect: (s: Selected) => void;
}) {
  const eligible = canAssess(test);
  return (
    <Button
      size="xs"
      variant={eligible ? "default" : "outline"}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ test });
      }}
    >
      {eligible ? (
        <>Give Test</>
      ) : (
        <>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Practice
        </>
      )}
    </Button>
  );
}

// ─── table row ────────────────────────────────────────────────────────────────

function TestRow({
  test,
  onSelect,
}: {
  test: TestItem;
  onSelect: (s: Selected) => void;
}) {
  const within24h = isWithin24h(test.createdAt);
  const router = useRouter();

  // Aggregate transcription time across speeds (show all unique values)
  const writtenTimes = test.speeds.map((s) => s.writtenDurationSeconds);
  const uniqueTimes = [...new Set(writtenTimes)];

  return (
    <TableRow className="cursor-pointer">
      <TableCell className="py-3.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{test.title}</p>
          {within24h && !test.hasAttempted && <NewBadge />}
          <TypeBadge type={test.type} />
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {formatDate(new Date(test.createdAt))}
        </p>
      </TableCell>
      <TableCell className="py-3.5">
        <div className="flex flex-wrap items-center gap-1">
          {test.speeds.map((s) => (
            <Badge
              key={s.id}
              variant={s.hasAssessed ? "secondary" : "outline"}
              className="text-[10px] tabular-nums"
            >
              {s.wpm}
              {s.hasAssessed ? " ✓" : ""}
            </Badge>
          ))}
          <span className="text-muted-foreground ml-0.5 text-[10px]">WPM</span>
        </div>
      </TableCell>
      <TableCell className="py-3.5">
        <div className="flex flex-wrap items-center gap-1">
          {uniqueTimes.map((t, i) => (
            <span
              key={i}
              className="text-muted-foreground text-xs tabular-nums"
            >
              {formatWrittenDuration(t)}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell
        className="py-3.5 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={`/user/tests/${test.id}/leaderboard`}>
                  <Trophy className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leaderboard</TooltipContent>
          </Tooltip>

          {test.hasAttempted && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon-sm">
                  <Link href={`/user/tests/${test.id}/results`}>
                    <BarChart2 className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>My Results</TooltipContent>
            </Tooltip>
          )}

          <ActionButton test={test} onSelect={onSelect} />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── skeletons ────────────────────────────────────────────────────────────────

function TodaySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card space-y-3 rounded-xl border p-5">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-5 w-28" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function UserTestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const dateParam = searchParams.get("date");
  const selectedDate = dateParam ? new Date(dateParam) : null;
  const isToday = !selectedDate || isSameDay(selectedDate, new Date());

  const [queryInput, setQueryInput] = useState(searchParams.get("q") ?? "");
  const debouncedQuery = useDebounce(queryInput);
  const isSearching = debouncedQuery.trim().length > 0;

  const [selected, setSelected] = useState<Selected | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const setParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value === null) {
      p.delete(key);
    } else {
      p.set(key, value);
    }
    if (key !== "page") p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  };

  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) {
      p.set("q", debouncedQuery);
    } else {
      p.delete("q");
    }
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  }, [debouncedQuery]);

  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    if (urlQ !== queryInput) setQueryInput(urlQ);
  }, [searchParams.get("q")]);

  const { data, isLoading } = trpc.test.listForUser.useQuery(
    { page, pageSize: 12 },
    { staleTime: 30_000 },
  );

  const allTests = (data?.data ?? []) as unknown as TestItem[];
  const filtered = allTests.filter((t) => {
    const matchQuery =
      !isSearching ||
      t.title.toLowerCase().includes(debouncedQuery.toLowerCase());

    const matchDate =
      isToday ||
      (selectedDate && isSameDay(new Date(t.createdAt), selectedDate));

    return matchQuery && matchDate;
  });

  const clearSearch = () => {
    setQueryInput("");
    const p = new URLSearchParams(searchParams.toString());
    p.delete("q");
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  };

  const clearDate = () => {
    setParam("date", null);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    if (isSameDay(date, new Date())) {
      setParam("date", null); // today = no filter
    } else {
      setParam("date", format(date, "yyyy-MM-dd"));
    }
    setCalendarOpen(false);
  };

  const today = new Date();
  const headerDay = format(today, "EEEE");
  const headerDate = formatDate(today);

  return (
    <TooltipProvider>
      <div className="w-full space-y-8 px-6 py-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{headerDay}</p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {headerDate}
            </p>
          </div>
        </div>

        {/* All tests */}
        <section>
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search tests…"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                className="pr-9 pl-9"
              />
              {queryInput && (
                <button
                  onClick={clearSearch}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Date picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedDate && !isToday ? "default" : "outline"}
                  size="sm"
                  className="h-9 gap-2 px-3 text-xs"
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {selectedDate && !isToday
                    ? formatDate(selectedDate)
                    : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate ?? new Date()}
                  onSelect={handleDateSelect}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Clear date filter */}
            {selectedDate && !isToday && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 px-2 text-xs"
                onClick={clearDate}
              >
                <X className="h-3.5 w-3.5" />
                Clear date
              </Button>
            )}
          </div>

          {/* Result count */}
          {!isLoading && (
            <p className="text-muted-foreground mb-3 text-xs tabular-nums">
              {isSearching
                ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${debouncedQuery}"`
                : selectedDate && !isToday
                  ? `${filtered.length} test${filtered.length !== 1 ? "s" : ""} on ${formatDate(selectedDate)}`
                  : `${data?.total ?? 0} tests`}
            </p>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableBody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-28" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
              <Search className="text-muted-foreground/30 mb-3 h-7 w-7" />
              <p className="text-muted-foreground text-sm font-medium">
                {isSearching
                  ? "No tests found"
                  : selectedDate && !isToday
                    ? "No tests on this date"
                    : "No tests available"}
              </p>
              <p className="text-muted-foreground/60 mt-1 text-xs">
                {isSearching
                  ? "Try a different search"
                  : selectedDate && !isToday
                    ? "Try a different date"
                    : "Check back soon"}
              </p>
              {(isSearching || (selectedDate && !isToday)) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    clearSearch();
                    clearDate();
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Test</TableHead>
                    <TableHead>Speeds</TableHead>
                    <TableHead>Transcription Time</TableHead>
                    <TableHead className="w-48" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TestRow key={t.id} test={t} onSelect={setSelected} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination — only when not filtering by a specific date */}
          {!isSearching && isToday && (data?.totalPages ?? 1) > 1 && (
            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <p className="text-muted-foreground/60 text-xs tabular-nums">
                Page {page} of {data?.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setParam("page", String(page - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (data?.totalPages ?? 1)}
                  onClick={() => setParam("page", String(page + 1))}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </section>

        <TestStartDialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          testId={selected?.test.id ?? ""}
          testTitle={selected?.test.title ?? ""}
          speeds={selected?.test.speeds ?? []}
        />
      </div>
    </TooltipProvider>
  );
}
