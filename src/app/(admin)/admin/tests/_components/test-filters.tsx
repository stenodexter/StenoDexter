"use client";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

export type SortFilter   = "newest" | "oldest";
export type TypeFilter   = "all" | "legal" | "general";
export type StatusFilter = "all" | "active" | "draft";

interface TestFiltersProps {
  sort:   SortFilter;
  type:   TypeFilter;
  status: StatusFilter;
  total?: number;
  onSortChange:   (v: SortFilter)   => void;
  onTypeChange:   (v: TypeFilter)   => void;
  onStatusChange: (v: StatusFilter) => void;
}

export function TestFilters({
  sort,
  type,
  status,
  total,
  onSortChange,
  onTypeChange,
  onStatusChange,
}: TestFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">

      {/* Sort */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Sort
        </span>
        <ToggleGroup
          type="single"
          value={sort}
          onValueChange={(v) => v && onSortChange(v as SortFilter)}
          className="h-8 rounded-md border border-border bg-muted/40 p-0.5 gap-0"
        >
          {(["newest", "oldest"] as SortFilter[]).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="h-7 rounded px-3 text-xs font-medium capitalize data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-foreground data-[state=off]:text-muted-foreground"
            >
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Type
        </span>
        <ToggleGroup
          type="single"
          value={type}
          onValueChange={(v) => v && onTypeChange(v as TypeFilter)}
          className="h-8 rounded-md border border-border bg-muted/40 p-0.5 gap-0"
        >
          {(["all", "legal", "general"] as TypeFilter[]).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="h-7 rounded px-3 text-xs font-medium capitalize data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-foreground data-[state=off]:text-muted-foreground"
            >
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Status
        </span>
        <ToggleGroup
          type="single"
          value={status}
          onValueChange={(v) => v && onStatusChange(v as StatusFilter)}
          className="h-8 rounded-md border border-border bg-muted/40 p-0.5 gap-0"
        >
          {(["all", "active", "draft"] as StatusFilter[]).map((v) => (
            <ToggleGroupItem
              key={v}
              value={v}
              className="h-7 rounded px-3 text-xs font-medium capitalize data-[state=on]:bg-background data-[state=on]:shadow-sm data-[state=on]:text-foreground data-[state=off]:text-muted-foreground"
            >
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Total count */}
      {total !== undefined && (
        <p className="ml-auto self-end pb-1 text-xs tabular-nums text-muted-foreground/50">
          {total} test{total !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}