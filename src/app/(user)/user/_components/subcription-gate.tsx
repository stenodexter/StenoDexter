"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "~/trpc/react";
import { PaymentDialog } from "./payment-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Clock, KeyboardIcon, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

function useSubscription() {
  return trpc.user.checkSubscription.useQuery(undefined, {
    retry: false,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Fires a toast once per browser session per key
const shownToasts = new Set<string>();
function toastOnce(key: string, fn: () => void) {
  if (shownToasts.has(key)) return;
  shownToasts.add(key);
  fn();
}

function formatExpiry(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Pending payment notice ───────────────────────────────────────────────────

function PendingPaymentNotice({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Under review
          </div>
          <DialogTitle>Payment is being reviewed</DialogTitle>
          <DialogDescription>
            Your payment screenshot was received. Access will be activated once
            an admin approves it — usually within a few hours.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between border-t pt-4">
          <Link
            href="/user/payments"
            className="text-muted-foreground text-xs underline-offset-2 hover:underline"
          >
            View payment history
          </Link>
          <Button size="sm" variant="outline" onClick={onClose}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GATE_EXCLUDED_PATHS = [
  "/user/payments",
  "/user/settings",
  "/user/profile",
];

const APP_DEFAULT_ROUTE = "/user";
const TYPING_DEFAULT_ROUTE = "/user/typing-tests";

// ─── SubscriptionGate (/user/* except typing-tests) ──────────────────────────

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLoading, refetch } = useSubscription();
  const [pendingDismissed, setPendingDismissed] = useState(false);
  const routedRef = useRef(false);

  const isExcluded =
    GATE_EXCLUDED_PATHS.some((p) => pathname?.startsWith(p)) ||
    !!pathname?.startsWith("/user/typing-tests");

  useEffect(() => {
    if (!data || isExcluded || routedRef.current || data.isDemo) return;

    const hasAppAccess = !!data.hasAppAccess;
    const hasTypingAccess = !!data.hasTypingAccess;

    // Typing-only user landed on an app route — redirect them to typing tests
    if (!hasAppAccess && hasTypingAccess) {
      routedRef.current = true;
      toastOnce("typing-only-redirect", () => {
        toast.info("Redirecting to Typing Tests", {
          description: "Your plan includes typing tests. Taking you there now.",
        });
      });
      router.replace(TYPING_DEFAULT_ROUTE);
      return;
    }

    // App access confirmed — toast expiry once
    if (hasAppAccess && data.expiresAt) {
      toastOnce("app-access-active", () => {
        toast.success("Subscription active", {
          description: `Access valid until ${formatExpiry(data.expiresAt!)}`,
          duration: 4000,
        });
      });
    }
  }, [data, isExcluded, router]);

  if (isLoading || !data || isExcluded) return <>{children}</>;

  // Demo expired
  if (data.isDemo && !data.active) {
    return (
      <>
        {children}
        <Dialog open>
          <DialogContent
            className="sm:max-w-sm [&>button.absolute]:hidden"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                <Clock className="text-muted-foreground h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Demo Expired</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Your demo session has ended. Create a full account to
                  continue.
                </p>
              </div>
              <a href="/user/login" className="w-full">
                <Button className="w-full">Login to continue</Button>
              </a>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (data.isDemo) return <>{children}</>;

  const hasAppAccess = !!data.hasAppAccess;
  const hasPending = !!data.pendingPayment?.id;

  // Active app sub — pass through (toast fires in useEffect)
  if (hasAppAccess) return <>{children}</>;

  // Pending payment — dismissible notice, not a hard block
  if (hasPending && !pendingDismissed) {
    return (
      <>
        {children}
        <PendingPaymentNotice open onClose={() => setPendingDismissed(true)} />
      </>
    );
  }

  if (hasPending && pendingDismissed) return <>{children}</>;

  // No sub, no pending — hard gate
  return (
    <>
      {children}
      <PaymentDialog
        open
        mode="gate"
        hasPendingPayment={false}
        onSubmitted={() => {
          toastOnce("app-payment-submitted", () => {
            toast.success("Payment submitted!", {
              description:
                "Access will be activated once your payment is approved.",
            });
          });
          void refetch();
        }}
      />
    </>
  );
}

// ─── TypingTestGate (/user/typing-tests/*) ────────────────────────────────────

export function TypingTestGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isLoading, refetch } = useSubscription();

  useEffect(() => {
    if (!data || data.isDemo) return;

    const hasTypingAccess = !!data.hasTypingAccess;
    const hasAppAccess = !!data.hasAppAccess;

    if (!hasTypingAccess) return;

    // Toast typing access expiry once
    if (data.expiresAt) {
      toastOnce("typing-access-active", () => {
        toast.success("Typing Tests unlocked", {
          description: `Access valid until ${formatExpiry(data.expiresAt!)}`,
          duration: 4000,
        });
      });
    }

    // Also has app access — offer shortcut to dashboard
    if (hasAppAccess) {
      toastOnce("full-access-active", () => {
        toast("Full access active", {
          description: "You have App + Typing Tests access.",
          action: {
            label: "Dashboard",
            onClick: () => router.push(APP_DEFAULT_ROUTE),
          },
          duration: 6000,
        });
      });
    }
  }, [data, router]);

  if (isLoading || !data) return <>{children}</>;

  if (data.isDemo) {
    return (
      <>
        {children}
        <TypingUpgradeWall isDemo />
      </>
    );
  }

  const hasTypingAccess = !!data.hasTypingAccess;
  const hasAppAccess = !!data.hasAppAccess;
  const hasPending = !!data.pendingPayment?.id;

  // Has typing access — pass through (toast fires in useEffect)
  if (hasTypingAccess) return <>{children}</>;

  // No typing access but pending — show wait screen
  if (hasPending) {
    return (
      <>
        {children}
        <Dialog open>
          <DialogContent
            className="sm:max-w-sm [&>button.absolute]:hidden"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <CheckCircle2 className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Payment under review</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Your typing tests access will be unlocked once your payment is
                  approved.
                </p>
              </div>
              <Link href="/user/payments" className="w-full">
                <Button variant="outline" className="w-full">
                  View payment status
                </Button>
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Has app sub but not typing → upgrade nudge
  if (hasAppAccess) {
    return (
      <>
        {children}
        <TypingUpgradeWall onUpgraded={() => void refetch()} />
      </>
    );
  }

  // No sub at all → hard gate, pre-select typing plan
  return (
    <>
      {children}
      <PaymentDialog
        open
        mode="gate"
        hasPendingPayment={false}
        requiredPlan="typing"
        onSubmitted={() => {
          toastOnce("typing-payment-submitted", () => {
            toast.success("Payment submitted!", {
              description:
                "Typing tests will unlock once your payment is approved.",
            });
          });
          void refetch();
        }}
      />
    </>
  );
}

// ─── TypingUpgradeWall ────────────────────────────────────────────────────────

function TypingUpgradeWall({
  isDemo = false,
  onUpgraded,
}: {
  isDemo?: boolean;
  onUpgraded?: () => void;
}) {
  const [payOpen, setPayOpen] = useState(false);

  return (
    <>
      <Dialog open={!payOpen}>
        <DialogContent
          className="sm:max-w-sm [&>button.absolute]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
              <KeyboardIcon className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Typing Tests</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {isDemo
                  ? "Typing tests aren't available on demo accounts. Sign up and subscribe to unlock them."
                  : "Your current plan doesn't include typing tests. Add the Typing plan (₹500/mo) or upgrade to Complete (₹2,000/mo)."}
              </p>
            </div>

            {isDemo ? (
              <a href="/user/login" className="w-full">
                <Button className="w-full">Sign up to unlock</Button>
              </a>
            ) : (
              <div className="flex w-full flex-col gap-2">
                <Button
                  className="w-full bg-violet-600 text-white hover:bg-violet-500"
                  onClick={() => setPayOpen(true)}
                >
                  Upgrade plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Link href={APP_DEFAULT_ROUTE}>
                  <Button variant="ghost" className="w-full text-xs">
                    Back to dashboard
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={payOpen}
        mode="gate"
        requiredPlan="typing"
        onOpenChange={setPayOpen}
        onSubmitted={() => {
          setPayOpen(false);
          toastOnce("upgrade-payment-submitted", () => {
            toast.success("Payment submitted!", {
              description:
                "Typing tests will unlock once your payment is approved.",
            });
          });
          onUpgraded?.();
        }}
      />
    </>
  );
}
