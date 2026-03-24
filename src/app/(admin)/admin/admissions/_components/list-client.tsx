"use client";

// ─── app/admin/admissions/_components/admissions-list.tsx ────────────────────

import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  SearchX,
  XCircle,
} from "lucide-react";
import { RejectDialog } from "./rejection-dialog";
import { ScreenshotDialog } from "./screenshot-dialog";

// ─── types ────────────────────────────────────────────────────────────────────

type PaymentStatus = "pending" | "approved" | "rejected";

type Payment = {
  id: string;
  amount: number;
  status: PaymentStatus;
  transactionId: string | null;
  screenshotURL: string;
  rejectionReason: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    userProfilePic: string | null;
  };
};

// ─── status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "approved")
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15">
        Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/15">
        Rejected
      </Badge>
    );
  return (
    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/15">
      Pending
    </Badge>
  );
}

// ─── row actions ──────────────────────────────────────────────────────────────

function RowActions({
  payment,
  onApprove,
  onReject,
  onViewScreenshot,
  approvingId,
  rejectingId,
}: {
  payment: Payment;
  onApprove: (p: Payment) => void;
  onReject: (p: Payment) => void;
  onViewScreenshot: (p: Payment) => void;
  approvingId: string | null;
  rejectingId: string | null;
}) {
  const isApproving = approvingId === payment.id;
  const isRejecting = rejectingId === payment.id;
  const isBusy = isApproving || isRejecting;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewScreenshot(payment)}
        className="text-muted-foreground hover:text-foreground gap-1.5"
      >
        <ImageIcon className="h-3.5 w-3.5" />
        Screenshot
      </Button>

      {payment.status === "pending" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onClick={() => onApprove(payment)}
            className="gap-1.5 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500"
          >
            {isApproving ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {isApproving ? "Approving…" : "Approve"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onClick={() => onReject(payment)}
            className="gap-1.5 text-rose-600 hover:bg-rose-500/10 hover:text-rose-500"
          >
            {isRejecting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {isRejecting ? "Rejecting…" : "Reject"}
          </Button>
        </>
      )}
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1.5">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function AdmissionsList() {
  const utils = trpc.useUtils();

  // ── filter + pagination state ──────────────────────────────────────────────
  const [status, setStatus] = useState<PaymentStatus | "all">("pending");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // ── dialog state ──────────────────────────────────────────────────────────
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [screenshotTarget, setScreenshotTarget] = useState<Payment | null>(
    null,
  );

  // ── in-flight tracking ────────────────────────────────────────────────────
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // ── query ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = trpc.payment.list.useQuery({
    status: status === "all" ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });

  const payments = (data?.data ?? []) as unknown as Payment[];
  const meta = data?.meta;

  // ── mutations ─────────────────────────────────────────────────────────────
  const verify = trpc.payment.verify.useMutation({
    onSuccess: () => utils.payment.list.invalidate(),
  });

  async function handleApprove(payment: Payment) {
    setApprovingId(payment.id);
    try {
      await verify.mutateAsync({ paymentId: payment.id, action: "approve" });
      const name = payment.user.name ?? payment.user.email ?? "Student";
      toast.success(`${name} has been approved`, {
        description: "Their subscription is now active.",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to approve payment");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    setRejectingId(rejectTarget.id);
    try {
      await verify.mutateAsync({
        paymentId: rejectTarget.id,
        action: "reject",
        rejectionReason: reason || undefined,
      });
      const name = rejectTarget.user.name ?? rejectTarget.user.email ?? "Student";
      toast.error(`${name}'s payment has been rejected`, {
        description: reason || "No reason provided.",
      });
      setRejectTarget(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reject payment");
    } finally {
      setRejectingId(null);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-sm">Status</p>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as PaymentStatus | "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {meta && (
          <p className="text-muted-foreground/60 text-xs tabular-nums">
            {meta.total} payment{meta.total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <SearchX className="text-muted-foreground/30 h-7 w-7" />
          <p className="text-muted-foreground text-sm font-medium">
            No payments found
          </p>
          <p className="text-muted-foreground/50 text-xs">
            {status === "pending"
              ? "No pending submissions right now."
              : "Try adjusting the filter."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  {/* Student */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {p.user.userProfilePic ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.user.userProfilePic}
                          alt={p.user.name ?? ""}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase">
                          {(p.user.name ?? p.user.email ?? "?")[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {p.user.name ?? "—"}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {p.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Amount */}
                  <TableCell>
                    <span className="tabular-nums text-sm font-semibold">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </span>
                  </TableCell>

                  {/* Transaction ID */}
                  <TableCell>
                    <span className="text-muted-foreground font-mono text-xs">
                      {p.transactionId ?? "—"}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={p.status} />
                      {p.status === "rejected" && p.rejectionReason && (
                        <p className="text-muted-foreground/70 max-w-[180px] truncate text-xs">
                          {p.rejectionReason}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Submitted */}
                  <TableCell>
                    <span className="text-muted-foreground/60 text-xs tabular-nums">
                      {formatDistanceToNow(new Date(p.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <RowActions
                      payment={p}
                      onApprove={handleApprove}
                      onReject={setRejectTarget}
                      onViewScreenshot={setScreenshotTarget}
                      approvingId={approvingId}
                      rejectingId={rejectingId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground/50 text-xs tabular-nums">
            Page {page + 1} of {meta.totalPages}
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
              disabled={page >= meta.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Reject dialog */}
      <RejectDialog
        open={!!rejectTarget}
        onOpenChange={(v) => !v && setRejectTarget(null)}
        userName={
          rejectTarget?.user.name ??
          rejectTarget?.user.email ??
          "this student"
        }
        onConfirm={handleRejectConfirm}
        isLoading={rejectingId === rejectTarget?.id}
      />

      {/* Screenshot dialog */}
      <ScreenshotDialog
        open={!!screenshotTarget}
        onOpenChange={(v) => !v && setScreenshotTarget(null)}
        screenshotUrl={screenshotTarget?.screenshotURL ?? ""}
        userName={
          screenshotTarget?.user.name ??
          screenshotTarget?.user.email ??
          "Student"
        }
      />
    </div>
  );
}