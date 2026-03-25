"use client";

// ─── app/user/_components/payment-dialog.tsx ─────────────────────────────────

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
import { CheckCircle2, Clock, Upload, X } from "lucide-react";
import Image from "next/image";

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
      className="text-muted-foreground hover:text-foreground ml-1.5 inline-flex shrink-0 items-center transition-colors"
    >
      {copied ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
      ) : (
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
      )}
    </button>
  );
}

interface PaymentDialogProps {
  open: boolean;
  isRenewal?: boolean;
  hasPendingPayment?: boolean;
  onSubmitted?: () => void;
}

export function PaymentDialog({
  open,
  isRenewal = false,
  hasPendingPayment = false,
  onSubmitted,
}: PaymentDialogProps) {
  const [step, setStep] = useState<Step>(
    hasPendingPayment ? "submitted" : "pay",
  );

  console.log("HAS PENDING PAYMENT ", hasPendingPayment);

  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [screenshotKey, setScreenshotKey] = useState<string | null>(null);
  const [upiID, setUPIId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    if (hasPendingPayment) {
      setStep("submitted");
    } else {
      setStep("pay");
    }
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

  const isValidUPIId = (id: string) => {
    if (!id.trim()) return false;
    const parts = id.split("@");
    return (
      parts.length === 2 &&
      (parts[0]?.length ?? 0) > 0 &&
      (parts[1]?.length ?? 0) > 0
    );
  };

  const canSubmit = file && upiID.trim() && isValidUPIId(upiID) && !isBusy;

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
    if (!isValidUPIId(upiID)) {
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
        if (!res.ok) throw new Error("Upload failed");
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
      screenshotKey: key,
      fromUPIId: upiID.trim(),
    });
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-3xl [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* ── Step: submitted ─────────────────────────────────────────────── */}
        {step === "submitted" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Payment Under Review</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Your payment screenshot has been submitted. An admin will verify
                it shortly — usually within a few hours.
              </p>
            </div>
            <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-left text-sm text-amber-700 dark:text-amber-400">
              <p className="font-semibold">What happens next?</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                <li>Admin reviews and approves your payment</li>
                <li>Your account gets activated for 30 days</li>
                <li>You'll regain full access automatically</li>
              </ul>
            </div>
            <p className="text-muted-foreground text-xs">
              You can close this tab and come back later. Access will be
              restored once your payment is verified.
            </p>
          </div>
        )}

        {/* ── Step: pay / upload ──────────────────────────────────────────── */}
        {step !== "submitted" && (
          <div className="grid md:grid-cols-2 md:divide-x">
            {/* Column 1 — QR & payment info */}
            <div className="flex flex-col gap-4 pb-6 md:pr-6 md:pb-0">
              <DialogHeader>
                <DialogTitle className="font-semibold">
                  {isRenewal
                    ? "Renew Your Subscription"
                    : "Activate Your Account"}
                </DialogTitle>
                <DialogDescription>
                  {isRenewal
                    ? "Your subscription has expired. Pay ₹1,500 to continue for another 30 days."
                    : "Make a payment to activate your account for 30 days."}
                </DialogDescription>
              </DialogHeader>

              {/* Amount pill */}
              <div className="flex items-baseline gap-1">
                <span className="text-primary text-3xl font-bold tabular-nums">
                  ₹1,500
                </span>
                <span className="text-muted-foreground text-xs">/ 30 days</span>
              </div>

              {/* QR Code */}
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
                After submitting, an admin will verify your payment. Access is
                granted once approved — usually within a few hours.
              </p>
            </div>

            {/* Column 2 — UPI ID + screenshot upload */}
            <div className="flex flex-col gap-4 md:pl-6">
              {/* UPI ID Input */}
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
                      !isValidUPIId(upiID) &&
                      "border-destructive/50 focus-visible:ring-destructive/50",
                  )}
                />
                {upiID && !isValidUPIId(upiID) && (
                  <p className="text-destructive mt-1 text-xs">
                    Please enter a valid UPI ID (e.g., yourname@paytm)
                  </p>
                )}
              </div>

              {/* Screenshot upload */}
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  Payment Screenshot <span className="text-destructive">*</span>
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
                      {/* Fix: truncate long filenames properly */}
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
                      className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-2 right-2 rounded p-1 transition-colors"
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
                    Submit Payment
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
