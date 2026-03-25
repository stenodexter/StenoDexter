"use client";

// ─── app/admin/test/[testId]/attempts/page.tsx ────────────────────────────────

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Target,
  Zap,
  BarChart2,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── helpers ──────────────────────────────────────────────────────────────────

function accColor(a: number) {
  return a >= 90
    ? "text-emerald-500"
    : a >= 70
      ? "text-amber-500"
      : "text-destructive";
}
function initials(name: string | null, email: string) {
  const src = name ?? email;
  return src.split(/[\s@]/)[0]?.[0]?.toUpperCase() ?? "?";
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminTestAttemptsPage() {
  const { testId } = useParams<{ testId: string }>();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "assessment" | "practice">("all");

  // Test info for the header
  const { data: test } = trpc.test.get.useQuery(
    { id: testId },
    { staleTime: 60_000 },
  );

  // Per-user aggregated stats for this test
  const { data, isLoading } = trpc.result.getUsersForTest.useQuery(
    {
      testId,
      page,
      limit: 20,
      type: type === "all" ? undefined : type,
      search: search || undefined,
    },
    { staleTime: 30_000 },
  );

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="w-full space-y-6 px-6 py-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="text-muted-foreground mb-1 -ml-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            {test?.title ?? "Test Attempts"}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {total} student{total !== 1 ? "s" : ""} attempted this test
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="bg-primary/10 rounded-lg p-2">
            <Users className="text-primary h-5 w-5" />
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{total}</p>
            <p className="text-muted-foreground text-xs">students</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pr-9 pl-9"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(0);
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <ToggleGroup
          type="single"
          value={type}
          onValueChange={(v) => {
            if (v) {
              setType(v as typeof type);
              setPage(0);
            }
          }}
          className="bg-muted/40 h-9 gap-0 rounded-lg border p-0.5"
        >
          {(["all", "assessment", "practice"] as const).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="data-[state=on]:bg-background data-[state=off]:text-muted-foreground h-8 rounded-md px-3 text-xs font-medium capitalize data-[state=on]:shadow-sm"
            >
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-card flex items-center gap-4 rounded-xl border px-5 py-3.5"
            >
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <BarChart2 className="text-muted-foreground/30 mb-3 h-7 w-7" />
          <p className="text-muted-foreground text-sm font-medium">
            {search ? "No students found" : "No attempts yet"}
          </p>
          <p className="text-muted-foreground/60 mt-1 text-xs">
            {search
              ? "Try a different search"
              : "Students who attempt this test will appear here"}
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px_120px] items-center gap-3 px-5 pb-1">
            {["Student", "Attempts", "Best Acc", "Avg Acc", "Best WPM", ""].map(
              (h, i) => (
                <p
                  key={i}
                  className={`text-muted-foreground text-[10px] font-semibold tracking-widest uppercase ${i > 0 ? "text-right" : ""}`}
                >
                  {h}
                </p>
              ),
            )}
          </div>

          <div className="space-y-2">
            {rows.map((row: any) => {
              const bestAcc = Math.round(Number(row.bestAccuracy));
              const avgAcc = Math.round(Number(row.avgAccuracy));
              return (
                <div
                  key={row.userId}
                  className="bg-card hover:bg-muted/20 grid grid-cols-[1fr_80px_80px_80px_80px_120px] items-center gap-3 rounded-xl border px-5 py-3.5 transition-colors"
                >
                  {/* User */}
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs font-semibold">
                        {initials(row.userName, row.userEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {row.userName ?? row.userEmail}
                      </p>
                      {row.userName && (
                        <p className="text-muted-foreground truncate text-xs">
                          {row.userEmail}
                        </p>
                      )}
                      <p className="text-muted-foreground text-[10px]">
                        Last{" "}
                        {formatDistanceToNow(new Date(row.lastAttemptAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Attempts */}
                  <p className="text-muted-foreground text-right text-sm tabular-nums">
                    {row.attempts}
                  </p>

                  {/* Best accuracy */}
                  <p
                    className={`text-right text-sm font-bold tabular-nums ${accColor(bestAcc)}`}
                  >
                    {bestAcc}%
                  </p>

                  {/* Avg accuracy */}
                  <p
                    className={`text-right text-sm tabular-nums ${accColor(avgAcc)}`}
                  >
                    {avgAcc}%
                  </p>

                  {/* Best WPM */}
                  <p className="text-right text-sm font-medium tabular-nums">
                    {row.bestWpm}
                  </p>

                  {/* CTA */}
                  <div className="flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/admin/test/${testId}/user/${row.userId}/results`}
                      >
                        <BarChart2 className="mr-1.5 h-3.5 w-3.5" />
                        Results
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

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
        </>
      )}
    </div>
  );
}
