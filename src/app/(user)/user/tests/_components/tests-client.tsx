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
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Search,
  X,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Gavel,
  FileText,
  Star,
  Trophy,
  BarChart2,
  Zap,
  Flame,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { isAfter, subHours, formatDistanceToNow } from "date-fns";
import { useView } from "~/hooks/use-view";
import { TestStartDialog } from "~/components/common/user/test-start-dialog";
import Link from "next/link";

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

type TypeFilter = "all" | "legal" | "general" | "special";
type SortFilter = "newest" | "oldest";

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── badges ───────────────────────────────────────────────────────────────────

const TYPE_ICON = { legal: Gavel, general: FileText, special: Star };
const TYPE_LABEL = { legal: "Legal", general: "General", special: "Special" };

function TypeBadge({ type }: { type: TestItem["type"] }) {
  const Icon = TYPE_ICON[type];
  return (
    <Badge variant="outline" className="gap-1 text-[10px]">
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
      size="sm"
      variant={eligible ? "default" : "outline"}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ test });
      }}
    >
      {eligible ? (
        <>
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
          Assess
        </>
      ) : (
        <>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Practice
        </>
      )}
    </Button>
  );
}

// ─── today card ───────────────────────────────────────────────────────────────

function TodayCard({
  test,
  onSelect,
}: {
  test: TestItem;
  onSelect: (s: Selected) => void;
}) {
  return (
    <div
      onClick={() => onSelect({ test })}
      className="bg-card hover:bg-muted/30 flex cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border p-5 transition-all hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm leading-snug font-semibold">{test.title}</p>
          <NewBadge />
        </div>
        <TypeBadge type={test.type} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Zap className="text-muted-foreground/50 h-3 w-3" />
        {test.speeds.map((s) => (
          <Badge
            key={s.id}
            variant="secondary"
            className="text-[10px] tabular-nums"
          >
            {s.wpm} WPM
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <p className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
        </p>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Button asChild variant="secondary" size="sm">
            <Link href={`/user/test/${test.id}/leaderboard`}>Leaderboard</Link>
          </Button>
          <ActionButton test={test} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}

// ─── grid card ────────────────────────────────────────────────────────────────

function GridCard({
  test,
  onSelect,
}: {
  test: TestItem;
  onSelect: (s: Selected) => void;
}) {
  const within24h = isWithin24h(test.createdAt);
  return (
    <div
      onClick={() => onSelect({ test })}
      className="bg-card hover:bg-muted/30 flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-all hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <p className="text-sm leading-snug font-semibold">{test.title}</p>
          {within24h && !test.hasAttempted && <NewBadge />}
        </div>
        <TypeBadge type={test.type} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Zap className="text-muted-foreground/50 h-3 w-3" />
        {test.speeds.map((s) => (
          <Badge
            key={s.id}
            variant={s.hasAssessed ? "secondary" : "outline"}
            className="text-[10px] tabular-nums"
          >
            {s.wpm} WPM{s.hasAssessed ? " ✓" : ""}
          </Badge>
        ))}
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
        </p>
        <div
          className="flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button asChild variant="ghost" size="sm">
            <Link href={`/user/test/${test.id}/leaderboard`}>
              <Trophy className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {test.hasAttempted && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/user/test/${test.id}/results`}>
                <BarChart2 className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          <ActionButton test={test} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}

function TestRow({
  test,
  onSelect,
}: {
  test: TestItem;
  onSelect: (s: Selected) => void;
}) {
  const within24h = isWithin24h(test.createdAt);
  return (
    <TableRow onClick={() => onSelect({ test })} className="cursor-pointer">
      <TableCell className="py-3.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{test.title}</p>
          {within24h && !test.hasAttempted && <NewBadge />}
          <TypeBadge type={test.type} />
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
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
      <TableCell className="text-muted-foreground py-3.5 text-right text-xs tabular-nums">
        {test.attemptCount}
      </TableCell>
      <TableCell
        className="py-3.5 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/user/test/${test.id}/leaderboard`}>
              <Trophy className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {test.hasAttempted && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/user/test/${test.id}/results`}>
                <BarChart2 className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          <ActionButton test={test} onSelect={onSelect} />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── skeletons ────────────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-card space-y-3 rounded-xl border p-4">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-14" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

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

export default function UserHomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // All filters live in the URL
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const typeFilter = (
    ["all", "legal", "general", "special"].includes(
      searchParams.get("type") ?? "",
    )
      ? searchParams.get("type")!
      : "all"
  ) as TypeFilter;
  const sort = (
    searchParams.get("sort") === "oldest" ? "oldest" : "newest"
  ) as SortFilter;

  // Query in URL too — but debounced locally before updating URL
  const [queryInput, setQueryInput] = useState(searchParams.get("q") ?? "");
  const debouncedQuery = useDebounce(queryInput);
  const isSearching = debouncedQuery.trim().length > 0;

  // View from cookie (not URL)
  const [view, setView] = useView("user_tests");

  const [selected, setSelected] = useState<Selected | null>(null);

  // Push URL params helper
  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set(key, value);
    if (key !== "page") p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  };

  // Sync debounced query to URL
  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) {
      p.set("q", debouncedQuery);
    } else {
      p.delete("q");
    }
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // Clear local input when URL q is cleared externally
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    if (urlQ !== queryInput) setQueryInput(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("q")]);

  // Today's tests query
  const { data: todayData, isLoading: todayLoading } =
    trpc.test.listForUser.useQuery(
      { page: 1, pageSize: 6 },
      { staleTime: 60_000 },
    );

  const todayTests: TestItem[] = (
    (todayData?.data ?? []) as unknown as TestItem[]
  ).filter((t) => isWithin24h(new Date(t.createdAt)));

  // Paginated all-tests query
  const { data, isLoading } = trpc.test.listForUser.useQuery(
    { page, pageSize: 12 },
    { staleTime: 30_000 },
  );

  // Client-side filter (type + search — server returns all active sorted by newest)
  const allTests = (data?.data ?? []) as unknown as TestItem[];
  const filtered = allTests.filter((t) => {
    const matchType = typeFilter === "all" || t.type === typeFilter;
    const matchQuery =
      !isSearching ||
      t.title.toLowerCase().includes(debouncedQuery.toLowerCase());
    return matchType && matchQuery;
  });

  // Sort client-side (server always returns newest — for "oldest" we reverse)
  const sorted = sort === "oldest" ? [...filtered].reverse() : filtered;

  const hasTodayTests = !todayLoading && todayTests.length > 0;

  const clearSearch = () => {
    setQueryInput("");
    const p = new URLSearchParams(searchParams.toString());
    p.delete("q");
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="w-full space-y-8 px-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Assess once per speed · practice anytime
        </p>
      </div>

      {/* Today's tests */}
      {(todayLoading || hasTodayTests) && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold">Today's Tests</h2>
            <Badge variant="secondary" className="text-[10px]">
              New
            </Badge>
          </div>
          {todayLoading ? (
            <TodaySkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {todayTests.map((t) => (
                <TodayCard key={t.id} test={t} onSelect={setSelected} />
              ))}
            </div>
          )}
        </section>
      )}

      {hasTodayTests && <Separator />}

      {/* All tests */}
      <section>
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
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

          <ToggleGroup
            type="single"
            value={typeFilter}
            onValueChange={(v) => v && setParam("type", v)}
            className="bg-muted/40 h-9 gap-0 rounded-lg border p-0.5"
          >
            {(["all", "legal", "general", "special"] as const).map((t) => (
              <ToggleGroupItem
                key={t}
                value={t}
                className="data-[state=on]:bg-background data-[state=off]:text-muted-foreground h-8 rounded-md px-3 text-xs font-medium capitalize data-[state=on]:shadow-sm"
              >
                {t}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <ToggleGroup
            type="single"
            value={sort}
            onValueChange={(v) => v && setParam("sort", v)}
            className="bg-muted/40 h-9 gap-0 rounded-lg border p-0.5"
          >
            {(["newest", "oldest"] as const).map((s) => (
              <ToggleGroupItem
                key={s}
                value={s}
                className="data-[state=on]:bg-background data-[state=off]:text-muted-foreground h-8 rounded-md px-3 text-xs font-medium capitalize data-[state=on]:shadow-sm"
              >
                {s}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="bg-muted/40 flex items-center gap-0.5 rounded-lg border p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView("grid")}
              className={`h-8 w-8 ${view === "grid" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView("list")}
              className={`h-8 w-8 ${view === "list" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {!isLoading && (
          <p className="text-muted-foreground mb-3 text-xs tabular-nums">
            {isSearching
              ? `${sorted.length} result${sorted.length !== 1 ? "s" : ""} for "${debouncedQuery}"`
              : `${data?.total ?? 0} tests`}
          </p>
        )}

        {/* Content */}
        {isLoading ? (
          view === "grid" ? (
            <GridSkeleton />
          ) : (
            <div className="rounded-xl border">
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
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-28" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
            <Search className="text-muted-foreground/30 mb-3 h-7 w-7" />
            <p className="text-muted-foreground text-sm font-medium">
              {isSearching ? "No tests found" : "No tests available"}
            </p>
            <p className="text-muted-foreground/60 mt-1 text-xs">
              {isSearching ? "Try a different search" : "Check back soon"}
            </p>
            {isSearching && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearSearch}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((t) => (
              <GridCard key={t.id} test={t} onSelect={setSelected} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead>Test</TableHead>
                  <TableHead>Speeds</TableHead>
                  <TableHead className="w-16 text-right">Attempts</TableHead>
                  <TableHead className="w-48" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((t) => (
                  <TestRow key={t.id} test={t} onSelect={setSelected} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!isSearching && (data?.totalPages ?? 1) > 1 && (
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
  );
}
