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

  const dialogOpen = hasPendingPayment || !isActive;

  function handlePaymentSubmitted() {
    void refetch();
  }

  return (
    <>
      {children}
      <PaymentDialog
        open={dialogOpen}
        isRenewal={isRenewal}
        hasPendingPayment={hasPendingPayment}
        onSubmitted={handlePaymentSubmitted}
      />
    </>
  );
}
