"use client";

// ─── components/common/payment-dialog.tsx ────────────────────────────────────
//
// mode="gate"    → SubscriptionGate: unclosable, blocks access until paid
// mode="renew"   → /user/subscription page: closable, user initiates renewal
//
// Steps: plan → pay → upload → submitted

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  CheckCircle2,
  Upload,
  X,
  ArrowRight,
  Zap,
  Layout,
  KeyboardIcon,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import Image from "next/image";
import { DeviceNotice } from "~/components/utils/device-notice";
import { PLANS, type PlanId } from "~/lib/plans";

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        "flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs transition-colors",
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {copied ? (
        <>
          <CheckCircle2 className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ─── Timeline step ────────────────────────────────────────────────────────────

type TlStatus = "done" | "active" | "pending";

function TimelineStep({
  status,
  title,
  desc,
  last = false,
}: {
  status: TlStatus;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
            status === "done" &&
              "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950",
            status === "active" &&
              "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950",
            status === "pending" && "border-border bg-muted",
          )}
        >
          {status === "done" && (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="#16a34a"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {status === "active" && (
            <span className="h-2 w-2 rounded-full bg-amber-400" />
          )}
          {status === "pending" && (
            <span className="bg-muted-foreground/30 h-2 w-2 rounded-full" />
          )}
        </div>
        {!last && <div className="bg-border mt-1 w-px flex-1" />}
      </div>
      <div className={cn("pb-4", last && "pb-0")}>
        <p
          className={cn(
            "text-sm leading-6 font-medium",
            status === "pending" && "text-muted-foreground",
          )}
        >
          {title}
        </p>
        <p className="text-muted-foreground text-xs">{desc}</p>
      </div>
    </div>
  );
}

// ─── Plan selector ────────────────────────────────────────────────────────────

// ─── Replace the PlanCard + PlanStep section in payment-dialog.tsx ────────────
// Drop this in place of the existing PlanCard and PlanStep functions.

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  app: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  typing: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
    </svg>
  ),
  full: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

const PLAN_STYLES: Record<
  PlanId,
  {
    iconBg: string;
    iconColor: string;
    checkColor: string;
    selectedBorder: string;
    selectedBg: string;
    selectedBgDark: string;
  }
> = {
  app: {
    iconBg: "bg-blue-50 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-400",
    checkColor: "text-blue-600 dark:text-blue-400",
    selectedBorder: "border-blue-500",
    selectedBg: "bg-blue-50/60",
    selectedBgDark: "dark:bg-blue-950/40",
  },
  typing: {
    iconBg: "bg-violet-50 dark:bg-violet-950",
    iconColor: "text-violet-600 dark:text-violet-400",
    checkColor: "text-violet-600 dark:text-violet-400",
    selectedBorder: "border-violet-500",
    selectedBg: "bg-violet-50/60",
    selectedBgDark: "dark:bg-violet-950/40",
  },
  full: {
    iconBg: "bg-emerald-50 dark:bg-emerald-950",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    checkColor: "text-emerald-600 dark:text-emerald-400",
    selectedBorder: "border-emerald-500",
    selectedBg: "bg-emerald-50/60",
    selectedBgDark: "dark:bg-emerald-950/40",
  },
};

// Features list per plan — explicit include/exclude for scanability
const PLAN_FEATURES: Record<PlanId, { label: string; included: boolean }[]> = {
  app: [
    { label: "Full batch access", included: true },
    { label: "All core features", included: true },
    { label: "Typing tests", included: false },
  ],
  typing: [
    { label: "Typing tests", included: true },
    { label: "Leaderboards", included: true },
    { label: "Batch features", included: false },
  ],
  full: [
    { label: "Full batch access", included: true },
    { label: "Typing tests", included: true },
    { label: "Performance Report", included: true },
  ],
};

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: (typeof PLANS)[PlanId];
  selected: boolean;
  onSelect: () => void;
}) {
  const s = PLAN_STYLES[plan.id];
  const features = PLAN_FEATURES[plan.id];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex w-full flex-col gap-0 rounded-xl border text-left transition-all duration-150",
        "hover:border-border/80",
        selected
          ? cn("border-2", s.selectedBorder, s.selectedBg, s.selectedBgDark)
          : "border-border bg-card",
      )}
    >
      {/* Best value tab — drops from top edge */}
      {plan.badge && (
        <span className="absolute -top-px right-3 rounded-b-md bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white">
          {plan.badge}
        </span>
      )}

      <div className="flex flex-col gap-3 p-4">
        {/* Icon */}
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            s.iconBg,
            s.iconColor,
          )}
        >
          {PLAN_ICONS[plan.id]}
        </div>

        {/* Pricing */}
        <div>
          <p className="text-muted-foreground text-[11px]">{plan.label}</p>
          <p className="text-foreground text-[22px] leading-tight font-semibold tabular-nums">
            ₹{plan.amount.toLocaleString("en-IN")}
          </p>
          <p className="text-muted-foreground text-[11px]">/ {plan.duration}</p>
        </div>

        {/* Divider */}
        <div className="border-border border-t" />

        {/* Features */}
        <ul className="flex flex-col gap-1.5">
          {features.map((f) => (
            <li
              key={f.label}
              className={cn(
                "flex items-center gap-2 text-xs",
                !f.included && "opacity-35",
              )}
            >
              {f.included ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className={cn("shrink-0", s.checkColor)}
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="text-muted-foreground shrink-0"
                >
                  <path
                    d="M3 3l6 6M9 3l-6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <span className="text-muted-foreground">{f.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

function PlanStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: PlanId | null;
  onSelect: (p: PlanId) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Choose a plan</DialogTitle>
        <DialogDescription>
          Select the access level you want to activate for 31 days.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-2.5">
        {(Object.values(PLANS) as (typeof PLANS)[PlanId][]).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selected === plan.id}
            onSelect={() => onSelect(plan.id)}
          />
        ))}
      </div>

      <Button
        onClick={onNext}
        disabled={!selected}
        className="w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
      >
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Submitted state ──────────────────────────────────────────────────────────

function SubmittedView({
  isRenewal,
  isGate,
  userCode,
  plan,
  onClose,
}: {
  isRenewal: boolean;
  isGate: boolean;
  userCode?: string;
  plan?: PlanId | null;
  onClose?: () => void;
}) {
  const planData = plan ? PLANS[plan] : null;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Under review
        </div>
        <h3 className="text-base font-medium">Payment submitted</h3>
        <p className="text-muted-foreground text-sm">
          Your screenshot has been received. Access will be restored once the
          admin approves it — usually within a few hours.
        </p>
      </div>

      <div className="bg-muted/50 flex items-center justify-between gap-2 rounded-lg px-5 py-2.5">
        <div>
          <p className="text-muted-foreground text-xs">Amount paid</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">
            ₹{planData?.amount.toLocaleString("en-IN") ?? "—"}
          </p>
        </div>
        {planData && (
          <div>
            <p className="text-muted-foreground text-xs">Plan</p>
            <p className="mt-0.5 text-sm font-medium">{planData.label}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground text-xs">Submitted</p>
          <p className="mt-0.5 text-sm font-medium">Just now</p>
        </div>
      </div>

      {userCode && (
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div>
            <p className="text-muted-foreground text-xs">Your user code</p>
            <p className="mt-0.5 font-mono text-sm font-medium tracking-wider">
              {userCode}
            </p>
          </div>
          <CopyButton value={userCode} />
        </div>
      )}

      <div className="rounded-lg border px-4 py-3">
        <TimelineStep
          status="done"
          title="Screenshot uploaded"
          desc="Payment receipt received successfully."
        />
        <TimelineStep
          status="active"
          title="Admin review"
          desc="Usually completed within a few hours."
        />
        <TimelineStep
          status="pending"
          title={isRenewal ? "Subscription extended" : "Access restored"}
          desc={
            isRenewal
              ? "31 days added on top of your current expiry."
              : "Full access granted for 31 days."
          }
          last
        />
      </div>

      {isRenewal && (
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-xs">
            You'll see the updated expiry in your subscription page.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="shrink-0"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Pay + Upload step ────────────────────────────────────────────────────────

type UploadState = "idle" | "uploading" | "done" | "error";

function PayUploadStep({
  plan,
  isRenewal,
  isBusy,
  file,
  uploadState,
  upiID,
  dragOver,
  inputRef,
  userCode,
  canSubmit,
  onBack,
  onUPIChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  onClearFile,
  onSubmit,
}: {
  plan: PlanId;
  isRenewal: boolean;
  isBusy: boolean;
  file: File | null;
  uploadState: UploadState;
  upiID: string;
  dragOver: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  userCode?: string;
  canSubmit: boolean;
  onBack: () => void;
  onUPIChange: (v: string) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (f: File) => void;
  onFileInput: (f: File) => void;
  onClearFile: () => void;
  onSubmit: () => void;
}) {
  const planData = PLANS[plan];
  const s = PLAN_STYLES[plan];
  const features = PLAN_FEATURES[plan].filter((f) => f.included);
  const isUploading = uploadState === "uploading";

  const isValidUPI = (id: string) => {
    const parts = id.split("@");
    return (
      parts.length === 2 &&
      (parts[0]?.length ?? 0) > 0 &&
      (parts[1]?.length ?? 0) > 0
    );
  };

  return (
    <div className="grid md:grid-cols-2 md:divide-x">
      {/* ── Left: plan summary + QR ── */}
      <div className="flex flex-col gap-4 pb-6 md:pr-6 md:pb-0">
        {/* Back link */}
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground -mb-1 flex w-fit items-center gap-1 text-xs transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          Change plan
        </button>

        {/* Plan badge */}
        <div
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
            s.iconBg,
            s.iconColor,
          )}
        >
          {PLAN_ICONS[plan]}
          {planData.label}
        </div>

        {/* Amount — hero */}
        <div>
          <p className="text-muted-foreground text-xs">One-time payment</p>
          <p className="text-foreground mt-0.5 text-4xl leading-none font-semibold tabular-nums">
            ₹{planData.amount.toLocaleString("en-IN")}
          </p>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {isRenewal
              ? "Added on top of your current access period"
              : "Unlocks full access — activated within a few hours"}
          </p>
        </div>

        {/* What's included */}
        <div className="bg-muted/50 flex flex-col gap-1.5 rounded-lg px-3 py-2.5">
          {features.map((f) => (
            <div
              key={f.label}
              className="text-muted-foreground flex items-center gap-2 text-xs"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={cn("shrink-0", s.checkColor)}
              >
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {f.label}
            </div>
          ))}
        </div>

        {/* QR */}
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-md border p-2.5">
            <Image
              src="/payment-qr.png"
              alt="UPI QR code"
              width={160}
              height={160}
            />
          </div>
          <p className="text-muted-foreground text-center text-xs">
            Scan with any UPI app
          </p>
          <p className="text-muted-foreground/50 text-center text-[11px]">
            PhonePe · GPay · Paytm · any UPI
          </p>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="flex flex-col gap-4 md:pl-6">
        <div>
          <p className="text-sm font-medium">Complete your payment</p>
          <p className="text-muted-foreground text-xs">
            Pay via UPI, then upload the receipt below.
          </p>
        </div>

        {/* User code */}
        {userCode && (
          <div className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2.5">
            <div>
              <p className="text-muted-foreground text-[11px]">
                Your user code
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium tracking-wider">
                {userCode}
              </p>
            </div>
            <CopyButton value={userCode} />
          </div>
        )}

        {/* UPI ID */}
        <div>
          <label htmlFor="upi-id" className="mb-1 block text-sm font-medium">
            UPI ID you paid from <span className="text-destructive">*</span>
          </label>
          <input
            id="upi-id"
            type="text"
            value={upiID}
            onChange={(e) => onUPIChange(e.target.value)}
            placeholder="yourname@paytm or 9876543210@ybl"
            disabled={isBusy}
            className={cn(
              "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              upiID &&
                !isValidUPI(upiID) &&
                "border-destructive/50 focus-visible:ring-destructive/50",
            )}
          />
          <p className="text-muted-foreground mt-1 text-[11px]">
            We use this to match and verify your payment
          </p>
          {upiID && !isValidUPI(upiID) && (
            <p className="text-destructive mt-0.5 text-xs">
              Enter a valid UPI ID (e.g., yourname@paytm)
            </p>
          )}
        </div>

        {/* Screenshot upload */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Payment screenshot <span className="text-destructive">*</span>
          </label>
          <div
            onClick={() => !isBusy && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOver();
            }}
            onDragLeave={onDragLeave}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) onDrop(f);
            }}
            className={cn(
              "relative flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-4 text-center transition-all duration-200",
              dragOver && "scale-[1.01] border-emerald-400/70 bg-emerald-500/5",
              !dragOver &&
                !file &&
                "border-border hover:bg-muted/20 hover:border-emerald-400/50",
              file &&
                uploadState !== "error" &&
                "border-emerald-400/50 bg-emerald-500/5",
              uploadState === "error" &&
                "border-destructive/40 bg-destructive/5",
              isBusy && "pointer-events-none opacity-60",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileInput(f);
                e.target.value = "";
              }}
            />

            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                file && uploadState !== "error"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : uploadState === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {isUploading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              ) : file && uploadState !== "error" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </div>

            {file ? (
              <div className="w-full min-w-0 px-6">
                <p className="w-full truncate text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {file.name}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {isUploading
                    ? "Uploading..."
                    : uploadState === "done"
                      ? "Ready to submit"
                      : "Click to change"}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium">
                  {dragOver ? "Drop here" : "Click or drag to upload"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  JPG, PNG or PDF
                </p>
              </>
            )}

            {file && !isBusy && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearFile();
                }}
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2 rounded p-1 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {uploadState === "error" && (
            <p className="text-destructive mt-1 text-xs">
              Upload failed — please try again.
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="mt-auto w-full bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {isBusy ? (
            <>
              <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {isUploading ? "Uploading..." : "Submitting..."}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-3.5 w-3.5" />
              Submit payment
            </>
          )}
        </Button>

        <p className="text-muted-foreground/60 text-center text-[11px] leading-relaxed">
          Access activated within a few hours after admin review.
          {isRenewal && " Renewals stack on your current period."}
        </p>
      </div>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export type PaymentDialogMode = "gate" | "renew";

type Step = "plan" | "pay" | "submitted";

interface PaymentDialogProps {
  open: boolean;
  mode?: PaymentDialogMode;
  hasPendingPayment?: boolean;
  /** If set, skip plan selector and lock to this plan (e.g. typing gate) */
  requiredPlan?: PlanId;
  onOpenChange?: (open: boolean) => void;
  onSubmitted?: () => void;
}

export function PaymentDialog({
  open,
  mode = "gate",
  hasPendingPayment = false,
  requiredPlan,
  onOpenChange,
  onSubmitted,
}: PaymentDialogProps) {
  const isGate = mode === "gate";
  const isRenewal = mode === "renew";

  const [step, setStep] = useState<Step>(
    hasPendingPayment ? "submitted" : requiredPlan ? "pay" : "plan",
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(
    requiredPlan ?? null,
  );

  const submittedPlanRef = useRef<PlanId | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [screenshotKey, setScreenshotKey] = useState<string | null>(null);
  const [upiID, setUpiID] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const user = trpc.user.me.useQuery();

  useEffect(() => {
    if (!open) return;
    if (hasPendingPayment) {
      setStep("submitted");
    } else {
      setStep(requiredPlan ? "pay" : "plan");
      setSelectedPlan(requiredPlan ?? null);
    }
  }, [open, hasPendingPayment, requiredPlan]);

  const presign = trpc.store.generatePresignedUrl.useMutation();
  const submit = trpc.payment.submit.useMutation({
    onSuccess: () => {
      submittedPlanRef.current = selectedPlan;
      setStep("submitted");
      onSubmitted?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const isUploading = uploadState === "uploading";
  const isBusy = isUploading || submit.isPending;

  const isValidUPI = (id: string) => {
    const parts = id.split("@");
    return (
      parts.length === 2 &&
      (parts[0]?.length ?? 0) > 0 &&
      (parts[1]?.length ?? 0) > 0
    );
  };

  const canSubmit = file && upiID.trim() && isValidUPI(upiID) && !isBusy;

  function acceptFile(f: File) {
    const ok = f.type.startsWith("image/") || f.type === "application/pdf";
    if (!ok) {
      toast.error("Please upload an image or PDF of your payment receipt");
      return;
    }
    setFile(f);
    setScreenshotKey(null);
    setUploadState("idle");
  }

  async function handleUploadAndSubmit() {
    if (!file || !upiID.trim() || !selectedPlan) return;
    if (!isValidUPI(upiID)) {
      toast.error("Please enter a valid UPI ID (e.g., yourname@paytm)");
      return;
    }

    let key = screenshotKey;
    if (!key) {
      setUploadState("uploading");
      try {
        const ext = file.name.split(".").pop() ?? "jpg";
        const { uploadUrl, key: newKey } = await presign.mutateAsync({
          folder: "payment-screenshots",
          contentType: file.type,
          ext,
        });
        const res = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!res.ok) throw new Error();
        key = newKey;
        setScreenshotKey(key);
        setUploadState("done");
      } catch {
        toast.error("Screenshot upload failed — please try again");
        setUploadState("error");
        return;
      }
    }

    await submit.mutateAsync({
      plan: selectedPlan,
      screenshotKey: key!,
      fromUPIId: upiID.trim(),
      type: isRenewal ? "renew" : "fresh",
    });
  }

  const dialogProps = isGate
    ? step !== "submitted"
      ? {
          onPointerDownOutside: (e: Event) => e.preventDefault(),
          onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(),
          onInteractOutside: (e: Event) => e.preventDefault(),
        }
      : {}
    : {
        onPointerDownOutside: () => onOpenChange?.(false),
        onEscapeKeyDown: () => onOpenChange?.(false),
      };

  // Wide for pay step, narrow for plan/submitted
  const isWide = step === "pay";

  return (
    <Dialog open={open} onOpenChange={isRenewal ? onOpenChange : undefined}>
      <DialogContent
        className={cn(
          "transition-all duration-300",
          isWide ? "sm:max-w-3xl" : "sm:max-w-lg",
          isGate && "[&>button.absolute]:hidden",
        )}
        {...dialogProps}
      >
        {step === "submitted" && (
          <SubmittedView
            isRenewal={isRenewal}
            isGate={isGate}
            userCode={user.data?.userCode ?? undefined}
            plan={submittedPlanRef.current}
            onClose={() => onOpenChange?.(false)}
          />
        )}

        {step === "plan" && (
          <PlanStep
            selected={selectedPlan}
            onSelect={setSelectedPlan}
            onNext={() => setStep("pay")}
          />
        )}

        {step === "pay" && selectedPlan && (
          <PayUploadStep
            plan={selectedPlan}
            isRenewal={isRenewal}
            isBusy={isBusy}
            file={file}
            uploadState={uploadState}
            upiID={upiID}
            dragOver={dragOver}
            inputRef={inputRef}
            userCode={user.data?.userCode ?? undefined}
            canSubmit={!!canSubmit}
            onBack={() => {
              if (!requiredPlan) setStep("plan");
            }}
            onUPIChange={setUpiID}
            onDragOver={() => setDragOver(true)}
            onDragLeave={() => setDragOver(false)}
            onDrop={acceptFile}
            onFileInput={acceptFile}
            onClearFile={() => {
              setFile(null);
              setScreenshotKey(null);
              setUploadState("idle");
            }}
            onSubmit={handleUploadAndSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
