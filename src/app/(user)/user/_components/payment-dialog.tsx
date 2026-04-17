"use client";

// ─── components/common/payment-dialog.tsx ────────────────────────────────────
//
// Generic payment dialog — two modes:
//
//   mode="gate"    → SubscriptionGate: unclosable, blocks access until paid
//   mode="renew"   → /user/subscription page: closable, user initiates renewal

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
import { CheckCircle2, Upload, X } from "lucide-react";
import Image from "next/image";
import { DeviceNotice } from "~/components/utils/device-notice";

const AMOUNT = 1500;

type Step = "pay" | "upload" | "submitted";
type UploadState = "idle" | "uploading" | "done" | "error";

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
      {/* spine */}
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
      {/* content */}
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

// ─── Submitted state ──────────────────────────────────────────────────────────

function SubmittedView({
  isRenewal,
  isGate,
  userCode,
  onClose,
}: {
  isRenewal: boolean;
  isGate: boolean;
  userCode?: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* header */}
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

      {/* amount + date row */}
      <div className="flex  items-center justify-between gap-2 bg-muted/50 px-5 py-2.5 rounded-lg">
        <div className="">
          <p className="text-muted-foreground text-xs">Amount paid</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">₹1,500</p>
        </div>
        <div className="">
          <p className="text-muted-foreground text-xs">Submitted</p>
          <p className="mt-0.5 text-sm font-medium">Just now</p>
        </div>
      </div>

      {/* user code */}
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

      {/* timeline */}
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

      {/* footer */}
      {isRenewal && (
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-xs">
            You'll see the updated expiry in your subscription page.
          </p>
          (
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="shrink-0"
          >
            Close
          </Button>
          )
        </div>
      )}
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export type PaymentDialogMode = "gate" | "renew";

interface PaymentDialogProps {
  open: boolean;
  mode?: PaymentDialogMode;
  hasPendingPayment?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmitted?: () => void;
}

export function PaymentDialog({
  open,
  mode = "gate",
  hasPendingPayment = false,
  onOpenChange,
  onSubmitted,
}: PaymentDialogProps) {
  const isGate = mode === "gate";
  const isRenewal = mode === "renew";

  const [step, setStep] = useState<Step>(
    hasPendingPayment ? "submitted" : "pay",
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [screenshotKey, setScreenshotKey] = useState<string | null>(null);
  const [upiID, setUPIId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const user = trpc.user.me.useQuery();

  useEffect(() => {
    if (!open) return;
    setStep(hasPendingPayment ? "submitted" : "pay");
  }, [open, hasPendingPayment]);

  const presign = trpc.store.generatePresignedUrl.useMutation();
  const submit = trpc.payment.submit.useMutation({
    onSuccess: () => {
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
    setStep("upload");
  }

  async function handleUploadAndSubmit() {
    if (!file || !upiID.trim()) return;
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
      amount: AMOUNT,
      screenshotKey: key!,
      fromUPIId: upiID.trim(),
      type: isRenewal ? "renew" : "fresh",
    });
  }

  const dialogProps = isGate
    ? {
        onPointerDownOutside: (e: Event) => e.preventDefault(),
        onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(),
        onInteractOutside: (e: Event) => e.preventDefault(),
      }
    : {
        onPointerDownOutside: () => onOpenChange?.(false),
        onEscapeKeyDown: () => onOpenChange?.(false),
      };

  return (
    <Dialog open={open} onOpenChange={isRenewal ? onOpenChange : undefined}>
      <DialogContent
        className={cn(
          step !== "submitted" && "sm:max-w-3xl",
          isGate && "[&>button.absolute]:hidden",
        )}
        {...dialogProps}
      >
        {/* ── Submitted ─────────────────────────────────────────────────── */}
        {step === "submitted" && (
          <SubmittedView
            isRenewal={isRenewal}
            isGate={isGate}
            userCode={user.data?.userCode ?? undefined}
            onClose={() => onOpenChange?.(false)}
          />
        )}

        {/* ── Pay / Upload ───────────────────────────────────────────────── */}
        {step !== "submitted" && (
          <div className="grid md:grid-cols-2 md:divide-x">
            {/* Left — QR & info */}
            <div className="flex flex-col gap-4 pb-6 md:pr-6 md:pb-0">
              <DialogHeader>
                <DialogTitle>
                  {isRenewal ? "Renew subscription" : "Activate your account"}
                </DialogTitle>
                <DialogDescription>
                  {isRenewal
                    ? "Pay ₹1,500 to add 31 more days to your current subscription."
                    : "Make a payment to activate your account for 31 days."}
                </DialogDescription>
              </DialogHeader>

              <span className="text-primary text-3xl font-bold tabular-nums">
                ₹1,500
              </span>

              <DeviceNotice variant="payment" size="md" />

              <div className="flex flex-col items-center gap-2">
                <span className="rounded-sm border p-3">
                  <Image
                    src="/payment-qr.png"
                    alt="payment-qr"
                    width={250}
                    height={250}
                  />
                </span>
                <p className="text-muted-foreground text-center text-xs">
                  Scan QR code to pay via any UPI app
                </p>
              </div>

              <p className="text-muted-foreground/60 text-xs">
                After submitting, the admin will verify your payment.
                {isRenewal
                  ? " Days are added on top of your current expiry."
                  : " Access is granted once approved — usually within a few hours."}
              </p>
            </div>

            {/* Right — UPI + screenshot */}
            <div className="flex flex-col gap-4 md:pl-6">
              {/* User code */}
              {user.data?.userCode && (
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">
                      Your user code
                    </p>
                    <p className="font-mono text-sm font-medium tracking-wider">
                      {user.data.userCode}
                    </p>
                  </div>
                  <CopyButton value={user.data.userCode} />
                </div>
              )}

              {/* UPI ID */}
              <div>
                <label
                  htmlFor="upi-id"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Your UPI ID <span className="text-destructive">*</span>
                </label>
                <p className="text-muted-foreground mb-2 text-xs">
                  Enter the UPI ID from which you made the payment.
                </p>
                <input
                  id="upi-id"
                  type="text"
                  value={upiID}
                  onChange={(e) => setUPIId(e.target.value)}
                  placeholder="yourname@paytm or 9876543210@ybl"
                  disabled={isBusy}
                  className={cn(
                    "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                    upiID &&
                      !isValidUPI(upiID) &&
                      "border-destructive/50 focus-visible:ring-destructive/50",
                  )}
                />
                {upiID && !isValidUPI(upiID) && (
                  <p className="text-destructive mt-1 text-xs">
                    Please enter a valid UPI ID (e.g., yourname@paytm)
                  </p>
                )}
              </div>

              {/* Screenshot upload */}
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  Payment screenshot <span className="text-destructive">*</span>
                </p>
                <div
                  onClick={() => !isBusy && inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) acceptFile(f);
                  }}
                  className={cn(
                    "relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-center transition-all duration-200",
                    dragOver &&
                      "scale-[1.01] border-emerald-400/70 bg-emerald-500/5",
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
                      if (f) acceptFile(f);
                      e.target.value = "";
                    }}
                  />
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      file && uploadState !== "error"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : uploadState === "error"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isUploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    ) : file && uploadState !== "error" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </div>

                  {file ? (
                    <div className="w-full min-w-0 px-6">
                      <p className="w-full truncate text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {file.name}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {isUploading
                          ? "Uploading..."
                          : uploadState === "done"
                            ? "Uploaded — ready to submit"
                            : "Click to change"}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        {dragOver
                          ? "Drop screenshot here"
                          : "Click or drag screenshot here"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        JPG, PNG, PDF accepted
                      </p>
                    </>
                  )}

                  {file && !isBusy && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setScreenshotKey(null);
                        setUploadState("idle");
                        setStep("pay");
                      }}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2 rounded p-1 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {uploadState === "error" && (
                  <p className="text-destructive mt-1 text-xs">
                    Upload failed. Please try again.
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                onClick={handleUploadAndSubmit}
                disabled={!canSubmit}
                className="mt-auto w-full bg-emerald-600 text-white hover:bg-emerald-500"
              >
                {submit.isPending ? (
                  <>
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : isUploading ? (
                  <>
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Uploading screenshot...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Submit payment
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
