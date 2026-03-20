"use client";

// ─── app/user/tests/page.tsx ──────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
  Mic,
  PauseCircle,
  PenLine,
  Clock,
  Users,
  Search,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
  Gavel,
  FileText,
  X,
} from "lucide-react";
import { isAfter, subHours, formatDistanceToNow } from "date-fns";
import { TestStartDialog } from "~/components/common/user/test-start-dialog";

function fmtSec(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function isWithin24h(d: Date) {
  return isAfter(new Date(d), subHours(new Date(), 24));
}

function useDebounce<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

type TestItem = {
  id: string;
  title: string;
  type: "legal" | "general";
  dictationSeconds: number;
  breakSeconds: number;
  writtenDurationSeconds: number;
  createdAt: Date;
  attemptCount: number;
  hasAttempted: boolean;
};

type Selected = { id: string; title: string; practiceOnly: boolean };

function TypeBadge({ type }: { type: "legal" | "general" }) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ring-1 ring-inset",
        type === "legal"
          ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
          : "bg-violet-500/10 text-violet-400 ring-violet-500/20",
      ].join(" ")}
    >
      {type === "legal" ? (
        <Gavel className="h-2 w-2" />
      ) : (
        <FileText className="h-2 w-2" />
      )}
      {type}
    </span>
  );
}

function NewBadge() {
  return (
    <span className="inline-flex shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-emerald-400 uppercase ring-1 ring-emerald-500/30 ring-inset">
      New
    </span>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function GridCard({
  test,
  onSelect,
}: {
  test: TestItem;
  onSelect: (s: Selected) => void;
}) {
  const within24h = isWithin24h(test.createdAt);
  const practiceOnly = test.hasAttempted || !within24h;

  return (
    <div
      onClick={() => onSelect({ id: test.id, title: test.title, practiceOnly })}
      className="border-border bg-card hover:bg-accent/10 flex cursor-pointer flex-col gap-4 rounded-xl border px-5 py-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <p className="truncate text-sm leading-snug font-bold">
            {test.title}
          </p>
          {within24h && !test.hasAttempted && <NewBadge />}
        </div>
        <TypeBadge type={test.type} />
      </div>

      <div className="flex items-center gap-4">
        {[
          { Icon: Mic, label: "DICT", val: fmtSec(test.dictationSeconds) },
          { Icon: PauseCircle, label: "BREAK", val: fmtSec(test.breakSeconds) },
          {
            Icon: PenLine,
            label: "WRITE",
            val: fmtSec(test.writtenDurationSeconds),
          },
        ].map(({ Icon, label, val }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-muted-foreground flex items-center gap-1 text-[9px] font-semibold tracking-widest">
              <Icon className="h-2.5 w-2.5" />
              {label}
            </span>
            <span className="text-xs font-bold tabular-nums">{val}</span>
          </div>
        ))}
        <div className="bg-border mx-0.5 h-5 w-px" />
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground flex items-center gap-1 text-[9px] font-semibold tracking-widest">
            <Clock className="h-2.5 w-2.5" />
            TOTAL
          </span>
          <span className="text-xs font-bold tabular-nums">
            {fmtSec(
              test.dictationSeconds +
                test.breakSeconds +
                test.writtenDurationSeconds,
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Users className="h-3 w-3" />
            {test.attemptCount}
          </span>
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
          </span>
        </div>
        <Button
          size="sm"
          variant={practiceOnly ? "outline" : "default"}
          onClick={(e) => {
            e.stopPropagation();
            onSelect({ id: test.id, title: test.title, practiceOnly });
          }}
        >
          {practiceOnly ? (
            <>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Practice
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Assessment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

function TestsTable({
  tests,
  onSelect,
}: {
  tests: TestItem[];
  onSelect: (s: Selected) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead>Test</TableHead>
            <TableHead className="w-20 text-right">Dict</TableHead>
            <TableHead className="w-20 text-right">Break</TableHead>
            <TableHead className="w-20 text-right">Write</TableHead>
            <TableHead className="w-24 text-right">Total</TableHead>
            <TableHead className="w-12 text-right">
              <Users className="ml-auto h-3 w-3" />
            </TableHead>
            <TableHead className="w-36" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tests.map((t) => {
            const within24h = isWithin24h(t.createdAt);
            const practiceOnly = t.hasAttempted || !within24h;
            return (
              <TableRow
                key={t.id}
                onClick={() =>
                  onSelect({ id: t.id, title: t.title, practiceOnly })
                }
                className="cursor-pointer"
              >
                <TableCell className="py-4">
                  <div className="flex items-center gap-2">
                    <p className="leading-none font-semibold">{t.title}</p>
                    {within24h && !t.hasAttempted && <NewBadge />}
                    <TypeBadge type={t.type} />
                  </div>
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    {formatDistanceToNow(new Date(t.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </TableCell>
                <TableCell className="text-muted-foreground py-4 text-right text-xs tabular-nums">
                  {fmtSec(t.dictationSeconds)}
                </TableCell>
                <TableCell className="text-muted-foreground py-4 text-right text-xs tabular-nums">
                  {fmtSec(t.breakSeconds)}
                </TableCell>
                <TableCell className="text-muted-foreground py-4 text-right text-xs tabular-nums">
                  {fmtSec(t.writtenDurationSeconds)}
                </TableCell>
                <TableCell className="py-4 text-right text-xs font-semibold tabular-nums">
                  {fmtSec(
                    t.dictationSeconds +
                      t.breakSeconds +
                      t.writtenDurationSeconds,
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground py-4 text-right text-xs tabular-nums">
                  {t.attemptCount}
                </TableCell>
                <TableCell className="py-4 text-right">
                  <Button
                    size="sm"
                    variant={practiceOnly ? "outline" : "default"}
                    className="whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect({ id: t.id, title: t.title, practiceOnly });
                    }}
                  >
                    {practiceOnly ? (
                      <>
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Practice
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Assessment
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-xl border px-5 py-4">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-14 rounded" />
          </div>
          <div className="flex items-center gap-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="space-y-1">
                <Skeleton className="h-2 w-10" />
                <Skeleton className="h-3.5 w-8" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            {Array.from({ length: 7 }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-2.5 w-10" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 12 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="space-y-1.5 py-4">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-24" />
              </TableCell>
              {[0, 1, 2, 3].map((j) => (
                <TableCell key={j} className="py-4 text-right">
                  <Skeleton className="ml-auto h-3 w-10" />
                </TableCell>
              ))}
              <TableCell className="py-4 text-right">
                <Skeleton className="ml-auto h-3 w-4" />
              </TableCell>
              <TableCell className="py-4 text-right">
                <Skeleton className="ml-auto h-8 w-24 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserTestsPage() {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<"all" | "legal" | "general">(
    "all",
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Selected | null>(null);

  const debouncedQuery = useDebounce(query, 350);
  const isSearching = debouncedQuery.trim().length > 0;

  // Reset to page 1 on any filter / view change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, debouncedQuery, view]);

  const { data, isLoading } = trpc.test.listForUser.useQuery(
    { page },
    { staleTime: 30_000 },
  );

  const allTests: TestItem[] = data?.data ?? [];
  const tests = allTests.filter((t) => {
    const matchType = typeFilter === "all" || t.type === typeFilter;
    const matchQuery =
      !isSearching ||
      t.title.toLowerCase().includes(debouncedQuery.toLowerCase());
    return matchType && matchQuery;
  });

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Sliding window of up to 5 page numbers centred on current page
  const pageNumbers = useMemo(() => {
    const count = Math.min(totalPages, 5);
    let start = Math.max(1, page - 2);
    if (start + count - 1 > totalPages)
      start = Math.max(1, totalPages - count + 1);
    return Array.from({ length: count }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Assessment tests once · practice anytime
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search tests…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-9 pl-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5">
          {(["all", "legal", "general"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={[
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                typeFilter === t
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t === "legal" && <Gavel className="h-3 w-3" />}
              {t === "general" && <FileText className="h-3 w-3" />}
              {t}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5">
          <button
            onClick={() => setView("grid")}
            title="Grid view"
            className={[
              "rounded-md p-1.5 transition-colors",
              view === "grid"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("table")}
            title="Table view"
            className={[
              "rounded-md p-1.5 transition-colors",
              view === "table"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isLoading && (
        <p className="text-muted-foreground mb-4 text-xs tabular-nums">
          {isSearching
            ? `${tests.length} result${tests.length !== 1 ? "s" : ""} for "${debouncedQuery}"`
            : `${total} test${total !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* Content */}
      {isLoading ? (
        view === "grid" ? (
          <GridSkeleton />
        ) : (
          <TableSkeleton />
        )
      ) : tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Search className="text-muted-foreground h-5 w-5" />
          </div>
          <p className="font-medium">
            {isSearching ? "No tests found" : "No tests available"}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {isSearching ? "Try a different search term" : "Check back soon"}
          </p>
          {isSearching && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setQuery("")}
            >
              Clear search
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <GridCard key={t.id} test={t} onSelect={setSelected} />
          ))}
        </div>
      ) : (
        <TestsTable tests={tests} onSelect={setSelected} />
      )}

      {/* Pagination */}
      {!isSearching && totalPages > 1 && !isLoading && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-muted-foreground text-xs tabular-nums">
            Page {page} of {totalPages} · {total} tests
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {pageNumbers.map((pg) => (
              <Button
                key={pg}
                variant={pg === page ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => setPage(pg)}
              >
                {pg}
              </Button>
            ))}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <TestStartDialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        testId={selected?.id ?? ""}
        testTitle={selected?.title ?? ""}
        isPractice={selected?.practiceOnly ?? false}
      />
    </div>
  );
}
