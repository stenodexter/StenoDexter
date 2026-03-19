"use client";

// ─── app/admin/test/[testId]/_components/attempts-table.tsx ──────────────────

import { useState } from "react";
import { trpc } from "~/trpc/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortBy = "score" | "mistakes" | "time";
type SortOrder = "asc" | "desc";
type AttemptType = "assessment" | "practice" | "all";

// ─── Sort Header ──────────────────────────────────────────────────────────────

function SortableHead({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
  className,
}: {
  label: string;
  field: SortBy;
  currentSort: SortBy;
  currentOrder: SortOrder;
  onSort: (field: SortBy) => void;
  className?: string;
}) {
  const isActive = currentSort === field;
  const Icon = isActive
    ? currentOrder === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(field)}
        className={[
          "inline-flex items-center gap-1 transition-colors",
          isActive
            ? "text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground",
        ].join(" ")}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Users className="text-muted-foreground/40 mb-3 h-8 w-8" />
      <p className="text-muted-foreground text-sm">No attempts yet</p>
      <p className="text-muted-foreground/60 mt-1 text-xs">
        Attempts will appear here once users take this test
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AttemptsTable({ testId }: { testId: string }) {
  const [page, setPage] = useState(0);
  const [type, setType] = useState<AttemptType>("all");
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const LIMIT = 20;

  const [data] = trpc.result.getTestResults.useSuspenseQuery({
    testId,
    page,
    limit: LIMIT,
    type: type === "all" ? undefined : type,
    sortBy,
    sortOrder,
  });

  const handleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(0);
  };

  const handleTypeChange = (v: string) => {
    setType(v as AttemptType);
    setPage(0);
  };

  return (
    <Card>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="text-muted-foreground text-xs tabular-nums">
          {data.meta.total}{" "}
          {data.meta.total === 1 ? "attempt" : "attempts"}
        </span>

        <div className="flex items-center gap-2">
          {/* Type filter */}
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="assessment">Assessment</SelectItem>
              <SelectItem value="practice">Practice</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort order toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() =>
              setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
            }
          >
            {sortOrder === "desc" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUp className="h-3 w-3" />
            )}
            {sortOrder === "desc" ? "Desc" : "Asc"}
          </Button>
        </div>
      </div>

      {/* ── Table or Empty ── */}
      {data.data.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Table className="px-6">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <SortableHead
                  label="Score"
                  field="score"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                  className="text-right"
                />
                <TableHead className="text-right">WPM</TableHead>
                <TableHead className="text-right">Accuracy</TableHead>
                <SortableHead
                  label="Mistakes"
                  field="mistakes"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHead
                  label="Submitted"
                  field="time"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  onSort={handleSort}
                  className="text-right"
                />
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((row) => (
                <TableRow
                  key={row.attemptId}
                  className="hover:bg-muted/40 group"
                >
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{row.user.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {row.user.email}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        row.type === "assessment" ? "default" : "secondary"
                      }
                      className="text-[10px] capitalize"
                    >
                      {row.type}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right font-bold tabular-nums">
                    {row.result.score}
                  </TableCell>

                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {row.result.wpm}
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    <span
                      className={
                        row.result.accuracy >= 90
                          ? "text-emerald-500"
                          : row.result.accuracy >= 70
                            ? "text-amber-500"
                            : "text-destructive"
                      }
                    >
                      {row.result.accuracy}%
                    </span>
                  </TableCell>

                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {row.result.mistakes}
                  </TableCell>

                  <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                    {formatDistanceToNow(new Date(row.result.submittedAt), {
                      addSuffix: true,
                    })}
                  </TableCell>

                  <TableCell className="text-right">
                    <Link href={`/admin/user-attempt/${row.attemptId}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* ── Pagination ── */}
          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-muted-foreground text-xs tabular-nums">
                Page {page + 1} of {data.meta.totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page + 1 >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}