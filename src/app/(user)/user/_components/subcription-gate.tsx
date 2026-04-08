"use client";

// ─── app/user/_components/subscription-gate.tsx ──────────────────────────────
//
// Drop this into your user layout as a wrapper around children.
// It silently polls `user.checkSubscription` every 5 minutes and opens the
// unclosable <PaymentDialog> when the subscription is expired or missing.
//
// If there's a pending payment, it shows the dialog in "submitted" state.
//
// Usage in app/user/layout.tsx:
//
//   import { SubscriptionGate } from "./_components/subscription-gate";
//
//   export default function UserLayout({ children }) {
//     return <SubscriptionGate>{children}</SubscriptionGate>;
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { trpc } from "~/trpc/react";
import { PaymentDialog } from "./payment-dialog";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Clock } from "lucide-react";
import { Button } from "~/components/ui/button";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { data, isLoading, refetch } = trpc.user.checkSubscription.useQuery(
    undefined,
    {
      retry: false,
      refetchInterval: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );

  if (isLoading || !data) {
    return <>{children}</>;
  }

  const hasPendingPayment = !!data.pendingPayment?.id;
  const isActive = !!data.active;
  const isRenewal = !!data.expiresAt;
  const isDemo = !!data.isDemo;

  const dialogOpen = hasPendingPayment || !isActive;

  function handlePaymentSubmitted() {
    void refetch();
  }

  return (
    <>
      {children}

      {isDemo && !isActive && (
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
      )}
      {!isDemo && (
        <PaymentDialog
          open={dialogOpen}
          mode="gate"
          hasPendingPayment={hasPendingPayment}
          onSubmitted={handlePaymentSubmitted}
        />
      )}
    </>
  );
}
