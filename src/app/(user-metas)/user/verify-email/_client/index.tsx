"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { MailCheck, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { authClient } from "~/server/better-auth/client";

export default function VerifyEmailPage({ userEmail }: { userEmail: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const fromGate = searchParams.get("from") === "gate";

  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    authClient
      .verifyEmail({ query: { token } })
      .then((res) => {
        if (res.error) setError(res.error.message ?? "Verification failed.");
        else {
          setVerified(true);
          authClient.getSession().then((session) => {
            if (session?.data?.session) {
              setTimeout(() => router.push("/user"), 1500);
            }
          });
        }
      })
      .catch(() => setError("Something went wrong."))
      .finally(() => setVerifying(false));
  }, [token]);

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      await authClient.sendVerificationEmail({
        callbackURL: "/user",
        email: userEmail,
      });
      setResent(true);
    } catch {
      setError("Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  };

  // ── Token flow ─────────────────────────────────────────────────────────────
  if (token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          {verifying && (
            <>
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">
                Verifying your email…
              </p>
            </>
          )}
          {!verifying && verified && (
            <>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="font-semibold">Email verified!</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Redirecting you…
                </p>
              </div>
            </>
          )}
          {!verifying && error && (
            <>
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-semibold">Verification failed</p>
                <p className="text-muted-foreground mt-1 text-sm">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resend}
                disabled={resending}
              >
                {resending && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Resend verification email
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── No token: check inbox / resend ─────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
          <MailCheck className="h-7 w-7" />
        </div>

        <div>
          <h1 className="text-lg font-semibold">Check your inbox</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {fromGate
              ? "Verify your email to access this page."
              : "We sent you a verification link. Click it to activate your account."}
          </p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {resent ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Verification email sent!
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={resend}
            disabled={resending}
          >
            {resending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Resend verification email
          </Button>
        )}
      </div>
    </div>
  );
}
