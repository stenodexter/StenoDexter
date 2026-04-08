"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "~/trpc/react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
  Bell,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Activity,
  RefreshCw,
  ShieldOff,
  TextAlignJustify,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "~/lib/utils";
import SendNotificationDialog from "~/components/common/admin/send-notification";
import type { InitialRecipient } from "~/components/common/admin/send-notification";
import { RevokeSubscriptionDialog } from "./revoke-subcription";

// ─── types ────────────────────────────────────────────────────────────────────

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  profilePicUrl: string | null;
  createdAt: Date;
  renewCount: number;
  userCode: string;
};

type SortField = "name" | "joined" | "renew";
type SortOrder = "asc" | "desc";
type Filter = "all" | "active";

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(u: Pick<UserRow, "name" | "email">) {
  return (u.name ?? u.email ?? "?")[0]?.toUpperCase() ?? "?";
}

function SortHead({
  label,
  field,
  active,
  order,
  onClick,
}: {
  label: string;
  field: SortField;
  active: boolean;
  order: SortOrder;
  onClick: () => void;
}) {
  const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {label}
      <Icon className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
    </button>
  );
}

// ─── KPI cards ────────────────────────────────────────────────────────────────

function UserKpiCards({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: Filter;
  onFilterChange: (f: Filter) => void;
}) {
  const [overview] = trpc.analytics.getPlatformOverview.useSuspenseQuery();

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Total registered */}
      <button
        onClick={() => onFilterChange("all")}
        className={cn(
          "group relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border px-6 py-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg",
          activeFilter === "all"
            ? "border-primary/30 ring-primary/20 ring-2"
            : "hover:border-primary/20",
        )}
        style={{
          background:
            "radial-gradient(ellipse at top right, color-mix(in oklch, var(--chart-1) 8%, var(--card)), var(--card))",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-xs leading-none font-medium">
            Registered users
          </p>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
            All
          </span>
        </div>
        <p className="text-4xl leading-none font-bold tracking-tight tabular-nums">
          {overview.totalUsers.toLocaleString("en-IN")}
        </p>
        <div className="flex items-center gap-1.5">
          <Users className="text-muted-foreground h-3.5 w-3.5" />
          <p className="text-muted-foreground text-xs">On the platform</p>
        </div>
      </button>

      {/* Active users */}
      <button
        onClick={() => onFilterChange("active")}
        className={cn(
          "group relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border px-6 py-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg",
          activeFilter === "active"
            ? "border-emerald-500/30 ring-2 ring-emerald-500/20"
            : "hover:border-emerald-500/20",
        )}
        style={{
          background:
            "radial-gradient(ellipse at top right, color-mix(in oklch, var(--chart-2) 8%, var(--card)), var(--card))",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-xs leading-none font-medium">
            Active users
          </p>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            30d
          </span>
        </div>
        <p className="text-4xl leading-none font-bold tracking-tight tabular-nums">
          {overview.activeUsers.last30d.toLocaleString("en-IN")}
        </p>
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-muted-foreground text-xs">
            1d: {overview.activeUsers.last1d} · 7d:{" "}
            {overview.activeUsers.last7d}
          </p>
        </div>
      </button>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-2xl border px-6 py-5"
          style={{ background: "var(--card)" }}
        >
          <Skeleton className="mb-4 h-2.5 w-24" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="mt-3 h-2.5 w-32" />
        </div>
      ))}
    </div>
  );
}

// ─── table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-10" />
            <TableHead>User</TableHead>
            <TableHead className="w-40 text-right">Joined</TableHead>
            <TableHead className="w-28 text-right">Renewals</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="py-3">
                <Skeleton className="h-8 w-8 rounded-full" />
              </TableCell>
              <TableCell className="py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </TableCell>
              <TableCell className="py-3 text-right">
                <Skeleton className="ml-auto h-3 w-24" />
              </TableCell>
              <TableCell className="py-3 text-right">
                <Skeleton className="ml-auto h-3.5 w-8" />
              </TableCell>
              <TableCell className="py-3">
                <div className="flex justify-end gap-1.5">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── users table ─────────────────────────────────────────────────────────────

function UsersTable({
  query,
  page,
  pageSize,
  sortField,
  sortOrder,
  filter,
  onPageChange,
  onTotalChange,
  onSort,
  isAdmin = false,
}: {
  query: string;
  page: number;
  pageSize: number;
  sortField: SortField;
  sortOrder: SortOrder;
  filter: Filter;
  isAdmin?: boolean;
  onPageChange: (p: number) => void;
  onTotalChange: (n: number) => void;
  onSort: (field: SortField) => void;
}) {
  const router = useRouter();
  const [notify, setNotify] = useState<InitialRecipient | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<UserRow | null>(null);

  const { data, isLoading, isFetching } = trpc.analytics.getUsers.useQuery(
    { query, page, pageSize, sortField: sortField, sortOrder, filter },
    { staleTime: 30_000 },
  );

  const users: UserRow[] = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  useEffect(() => {
    onTotalChange(total);
  }, [total, onTotalChange]);

  const visiblePages = () => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  };

  const dim = isFetching && !isLoading;

  return (
    <>
      <div
        className={`transition-opacity duration-150 ${dim ? "opacity-60" : ""}`}
      >
        {isLoading ? (
          <TableSkeleton rows={pageSize} />
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border py-20 text-center">
            <Users className="text-muted-foreground/30 mb-3 h-10 w-10" />
            <p className="text-muted-foreground text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-10" />
                  <TableHead>
                    <SortHead
                      label="User"
                      field="name"
                      active={sortField === "name"}
                      order={sortOrder}
                      onClick={() => onSort("name")}
                    />
                  </TableHead>
                  <TableHead className="w-44 text-right">
                    <div className="flex justify-end">
                      <SortHead
                        label="Joined"
                        field="joined"
                        active={sortField === "joined"}
                        order={sortOrder}
                        onClick={() => onSort("joined")}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-28 text-right">
                    <div className="flex justify-end">
                      <SortHead
                        label="Renewals"
                        field="renew"
                        active={sortField === "renew"}
                        order={sortOrder}
                        onClick={() => onSort("renew")}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="group">
                    {/* Avatar */}
                    <TableCell className="py-3 pl-4">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={u.profilePicUrl ?? undefined} />
                        <AvatarFallback className="text-xs font-semibold">
                          {initials(u)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>

                    {/* Name + email */}
                    <TableCell className="py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {u.name ?? u.email}
                        </p>
                        <span className="bg-muted shrink-0 rounded-md px-2 py-0.5 font-mono text-xs">
                          {u.userCode}
                        </span>
                      </div>
                      {u.name && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {u.email}
                        </p>
                      )}
                    </TableCell>

                    {/* Joined */}
                    <TableCell className="py-3 text-right">
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {format(new Date(u.createdAt), "do MMMM, yyyy")}
                      </span>
                    </TableCell>

                    {/* Renewals */}
                    <TableCell className="py-3 text-right">
                      {u.renewCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-xs font-semibold text-sky-600 tabular-nums dark:text-sky-400">
                          <RefreshCw className="h-2.5 w-2.5" />
                          {u.renewCount}×
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">
                          —
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                          title="Notify user"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotify({
                              id: u.id,
                              name: u.name,
                              email: u.email,
                              profilePicUrl: u.profilePicUrl,
                              userCode: u.userCode,
                            });
                          }}
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="report-card"
                          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                          title="User's Report Card"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/report-card/${u.id}`);
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Button>

                        {isAdmin && ( // <── ADD BLOCK
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="revoke-subscription"
                              className="h-7 w-7 border-red-500/30 text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/10"
                              title="Revoke subscription"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevokeTarget(u);
                              }}
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="revoke-subscription"
                              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-yellow-500/10"
                              title="View User's Attempts"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/attempts/user/${u.id}`);
                              }}
                            >
                              <TextAlignJustify className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-muted-foreground text-xs tabular-nums">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
            {total} users
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {visiblePages().map((pg) => (
              <Button
                key={pg}
                variant={pg === page ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0 text-xs"
                onClick={() => onPageChange(pg)}
              >
                {pg}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <SendNotificationDialog
        open={!!notify}
        onClose={() => setNotify(null)}
        initialRecipient={notify ?? undefined}
      />

      {revokeTarget && (
        <RevokeSubscriptionDialog
          open={!!revokeTarget}
          onClose={() => setRevokeTarget(null)}
          userId={revokeTarget.id}
          userName={revokeTarget.name}
          userEmail={revokeTarget.email}
        />
      )}
    </>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>("joined");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filter, setFilter] = useState<Filter>(
    (searchParams.get("filter") as Filter) ?? "all",
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync filter to URL
  const handleFilterChange = (f: Filter) => {
    setFilter(f);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", f);
    router.replace(`?${params.toString()}`);
  };

  const handleSearch = (val: string) => {
    setRawQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(val.trim());
      setPage(1);
    }, 350);
  };

  const clearSearch = () => {
    setRawQuery("");
    setQuery("");
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  return (
    <div className="w-full px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground my-1 text-xs">
          Click on any user to view full report
        </p>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {total !== null ? (
            <>
              <span className="text-foreground font-semibold tabular-nums">
                {total}
              </span>{" "}
              {filter === "active" ? "active" : "registered"} user
              {total !== 1 ? "s" : ""}
            </>
          ) : (
            "Manage your platform users"
          )}
        </p>
      </div>

      {/* KPI cards — clicking sets filter */}
      <Suspense fallback={<KpiSkeleton />}>
        <UserKpiCards
          activeFilter={filter}
          onFilterChange={handleFilterChange}
        />
      </Suspense>

      {/* Search bar */}
      <div className="relative my-5">
        <Search className="text-muted-foreground absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by user code or name or email…"
          value={rawQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-11 rounded-xl pr-11 pl-11 text-sm"
        />
        {rawQuery && (
          <button
            onClick={clearSearch}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex flex-col gap-4">
        <UsersTable
          query={query}
          page={page}
          pageSize={PAGE_SIZE}
          sortField={sortField}
          sortOrder={sortOrder}
          filter={filter}
          onPageChange={setPage}
          onTotalChange={setTotal}
          onSort={handleSort}
          isAdmin={true}
        />
      </div>
    </div>
  );
}
