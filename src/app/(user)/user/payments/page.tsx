"use client";

// ─── app/user/subscription/page.tsx ──────────────────────────────────────────

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
  Layout,
  KeyboardIcon,
  Sparkles,
  Plus,
  ArrowRight,
  Zap,
} from "lucide-react";
import {
  format,
  formatDistanceToNow,
  differenceInDays,
  isPast,
} from "date-fns";
import { PaymentDialog } from "../_components/payment-dialog";
import { useSearchParams } from "next/navigation";
import { PLANS, type PlanId } from "~/lib/plans";
import { cn } from "~/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveSub = {
  id: string;
  plan: PlanId;
  type: "app" | "typing";
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
};

// ─── Plan metadata ────────────────────────────────────────────────────────────

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  app: <Layout className="h-4 w-4" />,
  typing: <KeyboardIcon className="h-4 w-4" />,
  full: <Sparkles className="h-4 w-4" />,
};

const PLAN_CONFIG: Record<
  "app" | "typing",
  {
    label: string;
    icon: React.ReactNode;
    iconLg: React.ReactNode;
    accent: string;
    accentBg: string;
    accentBorder: string;
    accentRing: string;
    gradient: string;
    renewPlan: PlanId;
  }
> = {
  app: {
    label: "Advanced Speed Batch",
    icon: <Layout className="h-4 w-4" />,
    iconLg: <Layout className="h-5 w-5" />,
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    accentRing: "ring-blue-500/20",
    gradient:
      "radial-gradient(ellipse at top right, color-mix(in oklch, #3b82f6 8%, var(--card)), var(--card))",
    renewPlan: "app",
  },
  typing: {
    label: "Advanced Speed Batch For Typing Tests",
    icon: <KeyboardIcon className="h-4 w-4" />,
    iconLg: <KeyboardIcon className="h-5 w-5" />,
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/20",
    accentRing: "ring-violet-500/20",
    gradient:
      "radial-gradient(ellipse at top right, color-mix(in oklch, #8b5cf6 8%, var(--card)), var(--card))",
    renewPlan: "typing",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function PlanBadge({ plan }: { plan: PlanId }) {
  const colors: Record<PlanId, { text: string; bg: string }> = {
    app: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
    typing: {
      text: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
    full: {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
  };
  const c = colors[plan];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        c.text,
        c.bg,
      )}
    >
      {PLAN_ICONS[plan]}
      {PLANS[plan].label}
    </span>
  );
}

// ─── Per-subscription card ────────────────────────────────────────────────────

function SubscriptionCard({
  sub,
  hasPending,
  onRenew,
}: {
  sub: ActiveSub;
  hasPending: boolean;
  onRenew: (plan: PlanId) => void;
}) {
  const cfg = PLAN_CONFIG[sub.type];
  const expiry = new Date(sub.currentPeriodEnd);
  const start = new Date(sub.currentPeriodStart);
  const isExpired = isPast(expiry);
  const now = new Date();
  const daysLeft = isExpired ? 0 : differenceInDays(expiry, now) + 1;
  const totalDays = differenceInDays(expiry, start) + 1;
  const progressPct = isExpired
    ? 0
    : Math.min(100, (daysLeft / totalDays) * 100);
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;

  return (
    <div
      className={cn(
        "bg-card overflow-hidden rounded-2xl border transition-all",
        !isExpired && cn("ring-1", cfg.accentRing),
      )}
      style={{ background: isExpired ? undefined : cfg.gradient }}
    >
      <div className="space-y-4 px-6 py-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                cfg.accentBg,
                cfg.accent,
              )}
            >
              {cfg.iconLg}
            </div>
            <div>
              <p className="text-sm font-semibold">{cfg.label}</p>
              <p className="text-muted-foreground text-xs">
                {PLANS[cfg.renewPlan].description ??
                  `${cfg.label} subscription`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {isExpired ? (
              <Badge className="bg-destructive/10 text-destructive border-0 text-[11px]">
                Expired
              </Badge>
            ) : isExpiringSoon ? (
              <Badge className="gap-1 border-0 bg-amber-500/15 text-[11px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-2.5 w-2.5" />
                Expiring soon
              </Badge>
            ) : (
              <Badge className="border-0 bg-emerald-500/15 text-[11px] text-emerald-600 dark:text-emerald-400">
                Active
              </Badge>
            )}
          </div>
        </div>

        {/* Days remaining — hero number */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl leading-none font-bold tabular-nums">
              {isExpired ? "0" : daysLeft}
            </span>
            <span className="text-muted-foreground text-sm">
              {isExpired ? "days — expired" : "days remaining"}
            </span>
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">
            {isExpired
              ? `Expired ${formatDistanceToNow(expiry, { addSuffix: true })}`
              : `Valid until ${format(expiry, "do MMMM, yyyy")}`}
          </p>
        </div>

        {/* Progress bar */}
        {!isExpired && (
          <div className="space-y-1">
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isExpiringSoon
                    ? "bg-amber-400"
                    : cfg.accentBg.replace("bg-", "bg-").replace("/10", ""),
                )}
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: isExpiringSoon
                    ? "#f59e0b"
                    : sub.type === "app"
                      ? "#3b82f6"
                      : "#8b5cf6",
                }}
              />
            </div>
            <p className="text-muted-foreground text-[11px] tabular-nums">
              {daysLeft} of {totalDays} days remaining
            </p>
          </div>
        )}

        {/* What's included */}
        {!isExpired && (
          <div
            className={cn(
              "rounded-lg border px-3.5 py-3",
              cfg.accentBorder,
              cfg.accentBg,
            )}
          >
            <p className="text-muted-foreground mb-1.5 text-[11px] font-medium tracking-wide uppercase">
              Included
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {PLANS[cfg.renewPlan].features?.map((f) => (
                <span
                  key={f}
                  className={cn("flex items-center gap-1 text-xs", cfg.accent)}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Renew row */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {isExpired ? "Reactivate" : "Renew early"}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {isExpired
                ? "Restore access for 30 more days"
                : "Extends on top of current expiry"}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => onRenew(cfg.renewPlan)}
            disabled={hasPending}
            variant={isExpired ? "default" : "outline"}
            className={cn(
              "shrink-0 gap-1.5",
              isExpired && "bg-emerald-600 text-white hover:bg-emerald-500",
            )}
          >
            {hasPending ? (
              <>
                <Clock className="h-3.5 w-3.5" />
                Pending
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                {isExpired ? "Reactivate" : "Renew"}
              </>
            )}
          </Button>
        </div>

        {hasPending && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              Payment under review — usually approved within a few hours
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Upsell card (missing plan) ───────────────────────────────────────────────

function MissingPlanCard({
  type,
  hasPending,
  onBuy,
}: {
  type: "app" | "typing";
  hasPending: boolean;
  onBuy: (plan: PlanId) => void;
}) {
  const cfg = PLAN_CONFIG[type];
  const plan = PLANS[cfg.renewPlan];

  return (
    <div className="bg-card rounded-2xl border border-dashed p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl opacity-40",
              cfg.accentBg,
              cfg.accent,
            )}
          >
            {cfg.iconLg}
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              {cfg.label}
            </p>
            <p className="text-muted-foreground/60 text-xs">Not subscribed</p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-[11px]">
          ₹{plan.amount.toLocaleString("en-IN")}/mo
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {plan.features?.map((f) => (
          <span
            key={f}
            className="text-muted-foreground/60 flex items-center gap-1 text-xs"
          >
            <CheckCircle2 className="h-3 w-3" />
            {f}
          </span>
        ))}
      </div>

      <Button
        size="sm"
        onClick={() => onBuy(cfg.renewPlan)}
        disabled={hasPending}
        className={cn(
          "mt-4 gap-1.5",
          cfg.accent.includes("blue")
            ? "bg-blue-600 text-white hover:bg-blue-500"
            : "bg-violet-600 text-white hover:bg-violet-500",
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        Add {cfg.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserSubscriptionPage() {
  const searchParams = useSearchParams();
  const [renewOpen, setRenewOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    if (searchParams.get("openRenew") === "true") setRenewOpen(true);
  }, [searchParams]);

  const {
    data: subData,
    isLoading: subLoading,
    refetch: refetchSub,
  } = trpc.user.checkSubscription.useQuery(undefined, { staleTime: 30_000 });

  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    refetch: refetchPayments,
  } = trpc.payment.myPayments.useQuery(
    { page: 0, limit: 20 },
    { staleTime: 30_000 },
  );

  const activeSubs = (subData?.subscriptions ?? []) as ActiveSub[];
  const payments = paymentsData?.data ?? [];
  const hasPending = payments.some((p) => p.status === "pending");

  const hasAppSub = activeSubs.some((s) => s.type === "app");
  const hasTypingSub = activeSubs.some((s) => s.type === "typing");
  const hasBoth = hasAppSub && hasTypingSub;
  const hasNeither = !hasAppSub && !hasTypingSub;

  function openRenew(plan?: PlanId) {
    if (plan) setSelectedPlan(plan);
    setRenewOpen(true);
  }

  function handleSubmitted() {
    void refetchSub();
    void refetchPayments();
    setRenewOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Subscription
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage your access and payment history
          </p>
        </div>
        {!hasNeither && !hasPending && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openRenew()}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Renew
          </Button>
        )}
      </div>

      {/* ── Active subscriptions ── */}
      {subLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3 rounded-2xl border p-6">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : hasNeither ? (
        /* No subs at all */
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <ShieldCheck className="text-muted-foreground/30 mx-auto mb-3 h-8 w-8" />
          <p className="text-sm font-medium">No active subscription</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Choose a plan below to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Render active sub cards */}
          {activeSubs.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              hasPending={hasPending}
              onRenew={openRenew}
            />
          ))}

          {/* Show missing plan upsell cards */}
          {!hasAppSub && (
            <MissingPlanCard
              type="app"
              hasPending={hasPending}
              onBuy={openRenew}
            />
          )}
          {!hasTypingSub && (
            <MissingPlanCard
              type="typing"
              hasPending={hasPending}
              onBuy={openRenew}
            />
          )}
        </div>
      )}

      {/* Pending notice */}
      {hasPending && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            Payment under review
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Your payment is being reviewed. Access will update once approved —
            usually within a few hours.
          </p>
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
            {Array.from({ length: 3 }).map((_, i) => (
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
                className="bg-card flex items-center gap-3 rounded-xl border px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium tabular-nums">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                    {format(new Date(p.createdAt), "do MMM yyyy, hh:mm a")}
                  </p>
                </div>

                <div className="flex-1" />

                <p className="text-muted-foreground hidden max-w-[130px] truncate text-xs sm:block">
                  {p.fromUPIId}
                </p>

                {"plan" in p && p.plan && <PlanBadge plan={p.plan as PlanId} />}

                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] capitalize"
                >
                  {p.type}
                </Badge>

                <div className="shrink-0">{statusBadge(p.status)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment dialog */}
      <PaymentDialog
        open={renewOpen}
        mode="renew"
        hasPendingPayment={hasPending}
        requiredPlan={selectedPlan ?? undefined}
        onOpenChange={setRenewOpen}
        onSubmitted={handleSubmitted}
      />
    </div>
  );
}
