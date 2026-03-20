"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  MessageSquare,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
} from "lucide-react";
import SendNotificationDialog from "~/components/common/admin/send-notification";
import type { InitialRecipient } from "~/components/common/admin/send-notification";

// ─── types ────────────────────────────────────────────────────────────────────

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  profilePicUrl: string | null;
  createdAt: Date;
  rank: number | null;
  totalPoints: number | null;
};

type SortField = "rank" | "name" | "joined" | "points";
type SortOrder = "asc" | "desc";

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(u: Pick<UserRow, "name" | "email">) {
  return (u.name ?? u.email ?? "?")[0]?.toUpperCase() ?? "?";
}

const MEDALS = ["🥇", "🥈", "🥉"];

function RankCell({ rank }: { rank: number | null }) {
  if (rank === null)
    return <span className="text-muted-foreground/40 text-sm">—</span>;
  if (rank <= 3) return <span className="text-base">{MEDALS[rank - 1]}</span>;
  return (
    <span className="text-muted-foreground text-sm font-semibold tabular-nums">
      #{rank}
    </span>
  );
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

// ─── table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-10" />
            <TableHead>User</TableHead>
            <TableHead className="w-24 text-center">Rank</TableHead>
            <TableHead className="w-28 text-right">Points</TableHead>
            <TableHead className="w-40 text-right">Joined</TableHead>
            <TableHead className="w-28 text-right" />
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
              <TableCell className="py-3 text-center">
                <Skeleton className="mx-auto h-3.5 w-8" />
              </TableCell>
              <TableCell className="py-3 text-right">
                <Skeleton className="ml-auto h-3.5 w-14" />
              </TableCell>
              <TableCell className="py-3 text-right">
                <Skeleton className="ml-auto h-3 w-20" />
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
  onPageChange,
  onTotalChange,
  onSort,
}: {
  query: string;
  page: number;
  pageSize: number;
  sortField: SortField;
  sortOrder: SortOrder;
  onPageChange: (p: number) => void;
  onTotalChange: (n: number) => void;
  onSort: (field: SortField) => void;
}) {
  const router = useRouter();
  const [notify, setNotify] = useState<InitialRecipient | null>(null);

  const { data, isLoading, isFetching } = trpc.analytics.getUsers.useQuery(
    { query, page, pageSize, sortField, sortOrder },
    { staleTime: 30_000 },
  );

  const users = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  // Propagate total to parent for the header count
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
                  <TableHead className="w-24 text-center">
                    <div className="flex justify-center">
                      <SortHead
                        label="Rank"
                        field="rank"
                        active={sortField === "rank"}
                        order={sortOrder}
                        onClick={() => onSort("rank")}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-28 text-right">
                    <div className="flex justify-end">
                      <SortHead
                        label="Points"
                        field="points"
                        active={sortField === "points"}
                        order={sortOrder}
                        onClick={() => onSort("points")}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-40 text-right">
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
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, idx) => (
                  <TableRow
                    key={u.id}
                    className="group cursor-pointer"
                    onClick={() => router.push(`/admin/report-card/${u.id}`)}
                  >
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
                      <p className="text-sm leading-none font-medium">
                        {u.name ?? u.email}
                      </p>
                      {u.name && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {u.email}
                        </p>
                      )}
                    </TableCell>

                    {/* Rank */}
                    <TableCell className="py-3 text-center">
                      <RankCell rank={u.rank} />
                    </TableCell>

                    {/* Points */}
                    <TableCell className="py-3 text-right">
                      {u.totalPoints !== null ? (
                        <span className="text-sm font-semibold tabular-nums">
                          {Math.round(u.totalPoints)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">
                          —
                        </span>
                      )}
                    </TableCell>

                    {/* Joined */}
                    <TableCell className="py-3 text-right">
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {new Date(u.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
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
    </>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setSortOrder(field === "rank" || field === "points" ? "asc" : "asc");
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
              registered user{total !== 1 ? "s" : ""}
            </>
          ) : (
            "Manage your platform users"
          )}
        </p>
      </div>

      {/* Search bar — full width, prominent */}
      <div className="relative mb-5">
        <Search className="text-muted-foreground absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name or email…"
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
          onPageChange={setPage}
          onTotalChange={setTotal}
          onSort={handleSort}
        />
      </div>
    </div>
  );
}
