"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner"; // or your toast lib
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { authClient } from "~/server/better-auth/client";

const RESEND_COOLDOWN_SEC = 60;

const cooldownEndTimeRef = { current: 0 };

export function ForgotPasswordDialog() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;

    const remaining = Math.ceil(
      (cooldownEndTimeRef.current - Date.now()) / 1000,
    );

    if (remaining > 0) {
      setSent(true);
      setCooldown(remaining);
      startCountdown();
    }
  }, [open]);

  const startCountdown = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const remaining = Math.ceil(
        (cooldownEndTimeRef.current - Date.now()) / 1000,
      );

      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        setCooldown(0);
      } else {
        setCooldown(remaining);
      }
    }, 500);
  };

  const sendReset = async () => {
    if (!email.trim()) {
      const msg = "Email is required.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/user/reset-password",
      });

      setSent(true);
      cooldownEndTimeRef.current = Date.now() + RESEND_COOLDOWN_SEC * 1000;
      startCountdown();
      toast.success(`Reset link sent to ${email}`);
    } catch {
      const msg = "Failed to send reset link. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setTimeout(() => {
        setEmail("");
        setSent(false);
        setError(null);
        // Don't reset cooldown here — cooldownEndTimeRef persists intentionally
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="link" className="cursor-pointer underline" size="xs">
          Forgot password?
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            We&apos;ll send a secure link to your email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!sent ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReset()}
                  className={
                    error
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                {error && <p className="text-destructive text-xs">{error}</p>}
              </div>

              <Button
                variant="secondary"
                onClick={sendReset}
                disabled={loading}
                className="w-full"
              >
                {loading && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Send reset link
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                Reset link sent to {email}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={sendReset}
                disabled={loading || cooldown > 0}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : null}
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
