"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/react";
import { TestCardGrid } from "~/components/utils/test-card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { TestFilters, type SortFilter, type StatusFilter, type TypeFilter } from "./test-filters";

export function TestList() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortFilter>("newest");
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  function handleSort(v: SortFilter) {
    setSort(v);
    setPage(1);
  }
  function handleType(v: TypeFilter) {
    setType(v);
    setPage(1);
  }
  function handleStatus(v: StatusFilter) {
    setStatus(v);
    setPage(1);
  }

  const { data, isLoading } = trpc.test.list.useQuery({
    page,
    sort,
    type,
    status,
  });

  return (
    <div className="flex flex-col gap-5">
      <TestFilters
        sort={sort}
        type={type}
        status={status}
        total={data?.total}
        onSortChange={handleSort}
        onTypeChange={handleType}
        onStatusChange={handleStatus}
      />

      {isLoading ? (
        <TestGridSkeleton />
      ) : !data?.data.length ? (
        <EmptyState />
      ) : (
        <TestCardGrid
          tests={data.data.map((t) => ({
            ...t,
            createdAt: new Date(t.createdAt),
          }))}
          sidebarOpen
          onCardClick={(id) => router.push(`/admin/tests/${id}`)}
        />
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground/60 text-xs">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-7 gap-1 px-2.5 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 gap-1 px-2.5 text-xs"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TestGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-card flex flex-col gap-3 rounded-lg border px-4 py-4"
        >
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-2/3 rounded" />
            <Skeleton className="h-5 w-12 rounded" />
          </div>
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-px w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-8 flex-1 rounded" />
            <Skeleton className="h-8 flex-1 rounded" />
            <Skeleton className="h-8 flex-1 rounded" />
            <Skeleton className="h-8 w-12 rounded" />
          </div>
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
      <SearchX className="text-muted-foreground/30 h-7 w-7" />
      <p className="text-muted-foreground text-sm font-semibold">
        No tests found
      </p>
      <p className="text-muted-foreground/50 text-xs">
        Try adjusting your filters or create a new test.
      </p>
    </div>
  );
}
