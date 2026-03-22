// ─── app/admin/tests/_components/test-filters.tsx ────────────────────────────
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Button } from "~/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { useCallback } from "react";

export type SortFilter = "newest" | "oldest";
export type TypeFilter = "all" | "legal" | "general" | "special";
export type StatusFilter = "all" | "active" | "draft";

import type { ViewMode } from "~/hooks/use-view";

interface TestFiltersProps {
  sort: SortFilter;
  type: TypeFilter;
  status: StatusFilter;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  total?: number;
}

export function TestFilters({
  sort,
  type,
  status,
  view,
  onView,
  total,
}: TestFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      if (key !== "page") params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const handleView = (v: ViewMode) => onView(v);

  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
      {/* Sort */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
          Sort
        </span>
        <ToggleGroup
          type="single"
          value={sort}
          onValueChange={(v) => v && set("sort", v)}
          className="bg-muted/40 h-8 gap-0 rounded-md border p-0.5"
        >
          {(["newest", "oldest"] as SortFilter[]).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=off]:text-muted-foreground h-7 rounded px-3 text-xs font-medium capitalize data-[state=on]:shadow-sm"
            >
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
          Type
        </span>
        <ToggleGroup
          type="single"
          value={type}
          onValueChange={(v) => v && set("type", v)}
          className="bg-muted/40 h-8 gap-0 rounded-md border p-0.5"
        >
          {(["all", "legal", "general", "special"] as TypeFilter[]).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=off]:text-muted-foreground h-7 rounded px-3 text-xs font-medium capitalize data-[state=on]:shadow-sm"
            >
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
          Status
        </span>
        <ToggleGroup
          type="single"
          value={status}
          onValueChange={(v) => v && set("status", v)}
          className="bg-muted/40 h-8 gap-0 rounded-md border p-0.5"
        >
          {(["all", "active", "draft"] as StatusFilter[]).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=off]:text-muted-foreground h-7 rounded px-3 text-xs font-medium capitalize data-[state=on]:shadow-sm"
            >
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex-1" />

      {total !== undefined && (
        <p className="text-muted-foreground/50 self-end pb-1 text-xs tabular-nums">
          {total} test{total !== 1 ? "s" : ""}
        </p>
      )}

      {/* View toggle — persisted to cookie, not URL */}
      <div className="bg-muted/40 flex items-center gap-0.5 rounded-md border p-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleView("grid")}
          className={`h-7 w-7 ${view === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleView("list")}
          className={`h-7 w-7 ${view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
