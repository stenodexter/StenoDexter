"use client";

import { useEffect, useState } from "react";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  CreditCard,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import {
  format,
  formatDistanceToNow,
  differenceInDays,
  isPast,
} from "date-fns";
import { PaymentDialog } from "../_components/payment-dialog";
import { useSearchParams } from "next/navigation";

function statusIcon(s: string) {
  if (s === "approved")
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (s === "pending") return <Clock className="h-3.5 w-3.5 text-amber-500" />;
  return <XCircle className="text-destructive h-3.5 w-3.5" />;
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${map[s] ?? ""}`}
    >
      {statusIcon(s)}
      {s}
    </span>
  );
}

export default function UserSubscriptionPage() {
  const searchParams = useSearchParams();

  const [renewOpen, setRenewOpen] = useState(false);

  useEffect(() => {
    const openRenew = searchParams.get("openRenew");
    if (openRenew === "true") {
      setRenewOpen(true);
    }
  }, [searchParams]);

  const {
    data: subData,
    isLoading: subLoading,
    refetch: refetchSub,
  } = trpc.payment.getMine.useQuery(undefined, { staleTime: 30_000 });

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    refetch: refetchPayments,
  } = trpc.payment.myPayments.useQuery(
    { page: 0, limit: 20 },
    { staleTime: 30_000 },
  );

  const subscription = subData?.subscription ?? null;
  const payments = paymentsData?.data ?? [];
  const hasPending = payments.some((p) => p.status === "pending");

  const now = new Date();
  const expiry = subscription ? new Date(subscription.currentPeriodEnd) : null;
  const isExpired = expiry ? isPast(expiry) : true;
  const daysLeft = expiry && !isExpired ? differenceInDays(expiry, now) : 0;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;

  const handleRenewSubmitted = () => {
    void refetchSub();
    void refetchPayments();
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Manage your access and payment history
        </p>
      </div>

      {subLoading ? (
        <div className="space-y-3 rounded-2xl border p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      ) : (
        <div
          className="bg-card overflow-hidden rounded-2xl border"
          style={{
            background: `radial-gradient(ellipse at top right, color-mix(in oklch, var(--chart-1) 6%, var(--card)), var(--card))`,
          }}
        >
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <ShieldCheck
                    className={`h-5 w-5 ${isExpired ? "text-muted-foreground" : "text-emerald-500"}`}
                  />
                  <p className="text-sm font-semibold">
                    {isExpired ? "Subscription Expired" : "Active Subscription"}
                  </p>
                </div>
                {subscription && expiry ? (
                  <>
                    <p className="text-3xl font-bold tracking-tight tabular-nums">
                      {isExpired ? "Expired" : `${daysLeft}d`}
                      {!isExpired && (
                        <span className="text-muted-foreground ml-1 text-base font-normal">
                          remaining
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {isExpired
                        ? `Expired ${formatDistanceToNow(expiry, { addSuffix: true })}`
                        : `Valid until ${format(expiry, "dd MMM yyyy")}`}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground mt-1 text-sm">
                    No active subscription found
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {!isExpired && !isExpiringSoon && (
                  <Badge className="border-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Active
                  </Badge>
                )}
                {isExpiringSoon && (
                  <Badge className="gap-1 border-0 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Expiring soon
                  </Badge>
                )}
                {isExpired && (
                  <Badge className="bg-destructive/10 text-destructive border-0">
                    Expired
                  </Badge>
                )}
              </div>
            </div>

            {/* Progress bar — days remaining */}
            {subscription && !isExpired && (
              <div className="space-y-1.5">
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (daysLeft / 30) * 100)}%`,
                      backgroundColor:
                        daysLeft <= 7 ? "var(--chart-2)" : "var(--chart-1)",
                    }}
                  />
                </div>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {daysLeft} of 30 days remaining
                </p>
              </div>
            )}

            <Separator />

            {/* Renew CTA */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {isExpired ? "Reactivate your subscription" : "Renew early"}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {isExpired
                    ? "Pay ₹1,500 to get 30 days access"
                    : "Days are added on top of your current expiry"}
                </p>
              </div>
              <Button
                onClick={() => setRenewOpen(true)}
                disabled={hasPending}
                variant={isExpired ? "default" : "outline"}
                className={
                  isExpired
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : ""
                }
              >
                {hasPending ? (
                  <>
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    Pending review
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    {isExpired ? "Reactivate" : "Renew — ₹1,500"}
                  </>
                )}
              </Button>
            </div>

            {hasPending && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                  Payment under review
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Your renewal payment is being reviewed by an admin. This
                  usually takes a few hours.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Payment history ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="text-muted-foreground h-4 w-4" />
          <h2 className="text-sm font-semibold">Payment History</h2>
        </div>

        {paymentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-card flex items-center gap-4 rounded-xl border px-5 py-3.5"
              >
                <Skeleton className="h-4 w-24" />
                <div className="flex-1" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
            <CreditCard className="text-muted-foreground/30 mb-2 h-6 w-6" />
            <p className="text-muted-foreground text-sm">No payments yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="bg-card flex items-center gap-4 rounded-xl border px-5 py-3.5"
              >
                {/* Date */}
                <div className="min-w-0">
                  <p className="text-sm font-medium tabular-nums">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                    {format(new Date(p.createdAt), "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>

                <div className="flex-1" />

                {/* UPI */}
                <p className="text-muted-foreground hidden max-w-[140px] truncate text-xs sm:block">
                  {p.fromUPIId}
                </p>

                {/* Type */}
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] capitalize"
                >
                  {p.type}
                </Badge>

                {/* Status */}
                <div className="shrink-0">{statusBadge(p.status)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentDialog
        open={renewOpen}
        mode="renew"
        hasPendingPayment={hasPending}
        onOpenChange={setRenewOpen}
        onSubmitted={handleRenewSubmitted}
      />
    </div>
  );
}
