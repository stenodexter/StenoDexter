"use client";

import { useState } from "react";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Mic } from "lucide-react";
import { TestRow } from "../test-row";

function TestRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-lg border border-border bg-card">
      <Skeleton className="h-5 w-14 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="hidden sm:flex items-center gap-5">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-8 w-24 rounded-md" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="bg-muted rounded-full p-4 mb-4">
        <Mic className="h-6 w-6 text-muted-foreground" />
      </div>
      <h4 className="text-foreground font-medium text-sm">No tests available</h4>
      <p className="text-muted-foreground text-xs mt-1">
        Check back soon — new tests are added regularly.
      </p>
    </div>
  );
}

export function TestFeed() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.test.listForUser.useQuery({ page });

  const tests = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Rows */}
      <div className="flex flex-col gap-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <TestRowSkeleton key={i} />)
        ) : tests.length === 0 ? (
          <EmptyState />
        ) : (
          tests.map((test) => (
            <TestRow
              key={test.id}
              id={test.id}
              title={test.title}
              type={test.type}
              dictationSeconds={test.dictationSeconds}
              breakSeconds={test.breakSeconds}
              writtenDurationSeconds={test.writtenDurationSeconds}
              createdAt={test.createdAt}
              attemptCount={test.attemptCount}
              hasAttempted={test.hasAttempted}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-muted-foreground text-xs">
            Page {page} of {totalPages} —{" "}
            <span className="text-foreground font-medium">{data?.total}</span>{" "}
            tests
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}