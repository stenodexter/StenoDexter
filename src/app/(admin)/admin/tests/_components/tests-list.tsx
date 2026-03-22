// ─── app/admin/tests/_components/tests-list.tsx ──────────────────────────────
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/react";
import { TestFilters } from "./test-filters";
import type { SortFilter, TypeFilter, StatusFilter } from "./test-filters";
import { useView } from "~/hooks/use-view";
import type { ViewMode } from "~/hooks/use-view";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  SearchX,
  Pencil,
  Trophy,
  Users,
  FileAudio,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── types ────────────────────────────────────────────────────────────────────

type TestSpeed = { id: string; wpm: number };

type Test = {
  id: string;
  title: string;
  type: "legal" | "general" | "special";
  status: "draft" | "active";
  createdAt: Date;
  attemptCount: number;
  solutionAudioKey: string | null;
  speeds: TestSpeed[];
};

// ─── card (grid view) ─────────────────────────────────────────────────────────

function TestCard({ test }: { test: Test }) {
  const router = useRouter();
  const isDraft = test.status === "draft";
  const hasSolutionAudio = !!test.solutionAudioKey;

  return (
    <div
      onClick={() => router.push(`/admin/test/${test.id}`)}
      className="bg-card hover:bg-muted/30 flex cursor-pointer flex-col gap-3 rounded-xl border px-4 py-4 transition-all hover:shadow-sm"
    >
      {/* Title + badges */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex-1 text-sm leading-snug font-semibold">
          {test.title}
        </h3>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline">
            {test.type.charAt(0).toUpperCase() + test.type.slice(1)}
          </Badge>
          <Badge variant={test.status === "active" ? "default" : "secondary"}>
            {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Speeds */}
      <div className="flex flex-wrap items-center gap-1.5">
        {test.speeds.length > 0 ? (
          <>
            <Zap className="text-muted-foreground/50 h-3 w-3" />
            {test.speeds.map((s) => (
              <Badge key={s.id} variant="secondary" className="tabular-nums">
                {s.wpm} WPM
              </Badge>
            ))}
          </>
        ) : (
          <span className="text-muted-foreground text-xs">No speeds set</span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 pt-1">
        <Separator />
      </div>
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <Users className="h-3 w-3" />
        <span className="font-medium tabular-nums">{test.attemptCount}</span>
        <span>attempts</span>
        <span className="text-muted-foreground/50 ml-auto">
          {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* CTAs */}
      <div
        className="flex flex-wrap items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/test/${test.id}/attempts`}>
            <Users className="h-3.5 w-3.5" />
            Attempts
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/test/${test.id}/leaderboard`}>
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard
          </Link>
        </Button>
        {isDraft && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/tests/${test.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
        )}
        {!hasSolutionAudio && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="ml-auto border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-500"
          >
            <Link href={`/admin/tests/${test.id}/solution-audio`}>
              <FileAudio className="h-3.5 w-3.5" />
              Add solution audio
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── row (list view) ──────────────────────────────────────────────────────────

function TestRow({ test }: { test: Test }) {
  const router = useRouter();
  const isDraft = test.status === "draft";
  const hasSolutionAudio = !!test.solutionAudioKey;

  return (
    <div
      onClick={() => router.push(`/admin/test/${test.id}`)}
      className="bg-card hover:bg-muted/30 flex cursor-pointer items-center gap-4 rounded-xl border px-5 py-3.5 transition-all"
    >
      {/* Title + badges */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <p className="truncate text-sm font-semibold">{test.title}</p>
        <Badge variant="outline" className="shrink-0">
          {test.type.charAt(0).toUpperCase() + test.type.slice(1)}
        </Badge>
        <Badge
          variant={test.status === "active" ? "default" : "secondary"}
          className="shrink-0"
        >
          {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
        </Badge>
      </div>

      {/* Speeds */}
      <div className="hidden items-center gap-1.5 sm:flex">
        {test.speeds.map((s) => (
          <Badge key={s.id} variant="secondary" className="tabular-nums">
            {s.wpm} WPM
          </Badge>
        ))}
      </div>

      {/* Attempts */}
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <Users className="h-3 w-3" />
        <span className="font-medium tabular-nums">{test.attemptCount}</span>
      </div>

      {/* Created */}
      <p className="text-muted-foreground/60 hidden text-xs lg:block">
        {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
      </p>

      {/* Actions */}
      <div
        className="flex shrink-0 items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/test/${test.id}/attempts`}>
            <Users className="h-3.5 w-3.5" />
            Attempts
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/test/${test.id}/leaderboard`}>
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard
          </Link>
        </Button>
        {isDraft && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/tests/${test.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
        )}
        {!hasSolutionAudio && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-500"
          >
            <Link href={`/admin/tests/${test.id}/solution-audio`}>
              <FileAudio className="h-3.5 w-3.5" />
              Solution audio
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── skeletons ────────────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-card flex flex-col gap-3 rounded-xl border px-4 py-4"
        >
          <div className="flex justify-between gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-card flex items-center gap-4 rounded-xl border px-5 py-3.5"
        >
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-10" />
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function TestList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const sort = (
    searchParams.get("sort") === "oldest" ? "oldest" : "newest"
  ) as SortFilter;
  const type = (
    ["all", "legal", "general", "special"].includes(
      searchParams.get("type") ?? "",
    )
      ? searchParams.get("type")!
      : "all"
  ) as TypeFilter;
  const status = (
    ["all", "active", "draft"].includes(searchParams.get("status") ?? "")
      ? searchParams.get("status")!
      : "all"
  ) as StatusFilter;

  // View persisted to cookie via useView — not in URL
  const [view, setView] = useView("tests");

  const { data, isLoading } = trpc.test.list.useQuery({
    page,
    sort,
    type,
    status,
  });
  const tests = (data?.data ?? []) as unknown as Test[];

  const goPage = (n: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(n));
    router.push(`?${p.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <TestFilters
        sort={sort}
        type={type}
        status={status}
        view={view}
        onView={setView}
        total={data?.total}
      />

      {isLoading ? (
        view === "grid" ? (
          <GridSkeleton />
        ) : (
          <ListSkeleton />
        )
      ) : tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <SearchX className="text-muted-foreground/30 h-7 w-7" />
          <p className="text-muted-foreground text-sm font-medium">
            No tests found
          </p>
          <p className="text-muted-foreground/50 text-xs">
            Try adjusting your filters or create a new test.
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <TestCard key={t.id} test={t} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tests.map((t) => (
            <TestRow key={t.id} test={t} />
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
    </div>
  );
}
