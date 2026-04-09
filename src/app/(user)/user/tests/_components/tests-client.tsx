"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "~/components/ui/dropdown-menu";
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
  RotateCcw,
  CalendarIcon,
  ArrowUpDown,
  SlidersHorizontal,
  Scale,
  Lock,
} from "lucide-react";
import { isSameDay, format } from "date-fns";
import { TestStartDialog } from "~/components/common/user/test-start-dialog";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { isAfter, subHours } from "date-fns";
import { cn } from "~/lib/utils";

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
  lockedCursor: boolean;
};

type SortOrder = "newest" | "oldest";
type TypeFilter = "all" | "legal" | "general" | "special";
type Selected = { test: TestItem };

// ─── helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])!;
}

function formatDate(d: Date) {
  return `${ordinal(d.getDate())} ${format(d, "MMMM, yyyy")}`;
}

function isWithin24h(d: Date) {
  return isAfter(new Date(d), subHours(new Date(), 24));
}

function canAssess(test: TestItem) {
  return isWithin24h(test.createdAt) && test.speeds.some((s) => !s.hasAssessed);
}

function useDebounce<T>(val: T, ms = 400) {
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

const TYPE_ICON = { legal: Scale, general: FileText, special: Star };
const TYPE_LABEL = { legal: "Legal", general: "General", special: "Special" };

function TypeBadge({ type }: { type: TestItem["type"] }) {
  const Icon = TYPE_ICON[type];
  return (
    <Badge variant="default" className="gap-1 text-[10px]">
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
        "Give Test"
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
  const router = useRouter();

  const within24h = isWithin24h(test.createdAt);
  const uniqueTimes = [
    ...new Set(test.speeds.map((s) => s.writtenDurationSeconds)),
  ];

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/user/tests/${test.id}`)}
    >
      <TableCell className="py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Title with truncation + wrap */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="line-clamp-2 max-w-[280px] text-sm leading-snug font-semibold sm:max-w-xs md:max-w-lg">
              {test.title}
            </p>
            {test.lockedCursor && (
              <Badge
                variant="outline"
                className="text-muted-foreground text-xs"
              >
                <Lock />
                Cursor
              </Badge>
            )}
          </div>
          {within24h && !test.hasAttempted && <NewBadge />}
          <TypeBadge type={test.type} />
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {formatDate(new Date(test.createdAt))}
        </p>
      </TableCell>
      {/* Speeds — center-aligned to header */}
      <TableCell className="py-3.5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-1">
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
      {/* Transcription time — center-aligned to header */}
      <TableCell className="py-3.5 text-center">
        {(() => {
          const times = test.speeds
            .map((s) => s.writtenDurationSeconds)
            .filter(Boolean);
          if (times.length === 0)
            return <span className="text-muted-foreground text-xs">—</span>;
          const min = Math.min(...times);
          const max = Math.max(...times);
          return min === max ? (
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatWrittenDuration(min)}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatWrittenDuration(min)}
              <span className="text-muted-foreground/40 mx-1">–</span>
              {formatWrittenDuration(max)}
            </span>
          );
        })()}
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

// ─── skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell>
                <Skeleton className="mx-auto h-5 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="mx-auto h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-8 w-28" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: {
  value: TypeFilter;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "all", label: "All types", icon: SlidersHorizontal },
  { value: "legal", label: "Legal", icon: Gavel },
  { value: "general", label: "General", icon: FileText },
  { value: "special", label: "Special", icon: Star },
];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export default function UserTestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const sort = (searchParams.get("sort") ?? "newest") as SortOrder;
  const typeFilter = (searchParams.get("type") ?? "all") as TypeFilter;

  const dateParam = searchParams.get("date");
  const selectedDate = dateParam ? new Date(dateParam) : null;
  const isToday = !selectedDate || isSameDay(selectedDate, new Date());

  const [queryInput, setQueryInput] = useState(searchParams.get("q") ?? "");
  const debouncedQuery = useDebounce(queryInput);

  const [selected, setSelected] = useState<Selected | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Sync URL → input when back/forward
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    if (urlQ !== queryInput) setQueryInput(urlQ);
  }, [searchParams.get("q")]);

  // Push debounced search to URL
  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) p.set("q", debouncedQuery);
    else p.delete("q");
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  }, [debouncedQuery]);

  const setParam = (updates: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) p.delete(key);
      else p.set(key, value);
    }
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  };

  // ── Query — all filters server-side ───────────────────────────────────────
  const { data, isLoading } = trpc.test.listForUser.useQuery(
    {
      page,
      pageSize: 12,
      sort,
      type: typeFilter,
      q: debouncedQuery || undefined,
    },
    { staleTime: 30_000 },
  );

  const tests = (data?.data ?? []) as unknown as TestItem[];

  // Client-side date filter only (date isn't a server param)
  const filtered = isToday
    ? tests
    : tests.filter((t) =>
        selectedDate ? isSameDay(new Date(t.createdAt), selectedDate) : true,
      );

  const clearAll = () => {
    setQueryInput("");
    router.push(pathname);
  };

  const today = new Date();
  const activeFilterCount = [
    sort !== "newest",
    typeFilter !== "all",
    selectedDate && !isToday,
    debouncedQuery,
  ].filter(Boolean).length;

  return (
    <TooltipProvider>
      <div className="w-full space-y-8 px-6 py-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{format(today, "EEEE")}</p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {formatDate(today)}
            </p>
          </div>
        </div>

        <section>
          {/* ── Toolbar ───────────────────────────────────────────────── */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[180px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search tests…"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                className="pr-9 pl-9"
              />
              {queryInput && (
                <button
                  onClick={() => setQueryInput("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={sort !== "newest" ? "default" : "outline"}
                  size="sm"
                  className="h-9 gap-2 text-xs"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs">
                  Sort order
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SORT_OPTIONS.map((o) => (
                  <DropdownMenuItem
                    key={o.value}
                    className={cn(
                      "text-xs",
                      sort === o.value && "font-semibold",
                    )}
                    onClick={() => setParam({ sort: o.value })}
                  >
                    {o.label}
                    {sort === o.value && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Date picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedDate && !isToday ? "default" : "outline"}
                  size="sm"
                  className="h-9 gap-2 text-xs"
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {selectedDate && !isToday
                    ? formatDate(selectedDate)
                    : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate ?? new Date()}
                  onSelect={(date) => {
                    if (!date) return;
                    if (isSameDay(date, new Date())) setParam({ date: null });
                    else setParam({ date: format(date, "yyyy-MM-dd") });
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Clear all filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 px-2 text-xs"
                onClick={clearAll}
              >
                <X className="h-3.5 w-3.5" />
                Clear all
                <Badge variant="secondary" className="ml-0.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </div>

          {/* Result count */}
          {!isLoading && (
            <p className="text-muted-foreground mb-3 text-xs tabular-nums">
              {data?.total ?? 0} test{(data?.total ?? 0) !== 1 ? "s" : ""}
              {debouncedQuery && ` matching "${debouncedQuery}"`}
              {typeFilter !== "all" &&
                ` · ${TYPE_LABEL[typeFilter as keyof typeof TYPE_LABEL]}`}
              {selectedDate && !isToday && ` · ${formatDate(selectedDate)}`}
            </p>
          )}

          {/* Table */}
          {isLoading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
              <Search className="text-muted-foreground/30 mb-3 h-7 w-7" />
              <p className="text-muted-foreground text-sm font-medium">
                No tests found
              </p>
              <p className="text-muted-foreground/60 mt-1 text-xs">
                Try adjusting your filters
              </p>
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={clearAll}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead>Test</TableHead>
                    <TableHead className="text-center">Speeds</TableHead>
                    <TableHead className="text-center">
                      Transcription Time
                    </TableHead>
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

          {/* Pagination */}
          {(data?.totalPages ?? 1) > 1 && (
            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <p className="text-muted-foreground/60 text-xs tabular-nums">
                Page {page} of {data?.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setParam({ page: String(page - 1) })}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (data?.totalPages ?? 1)}
                  onClick={() => setParam({ page: String(page + 1) })}
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
          lockedCursor={!!selected?.test.lockedCursor}
          speeds={selected?.test.speeds ?? []}
        />
      </div>
    </TooltipProvider>
  );
}
