"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRef } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { authClient, getOrCreateDeviceId } from "~/server/better-auth/client";
import Link from "next/link";
import { deviceErrorMessage } from "~/server/lib/device-error";
import { DeviceNotice } from "~/components/utils/device-notice";
import { Separator } from "~/components/ui/separator";
import { InputPassword } from "~/components/ui/input-password";

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-destructive mt-1 text-xs">{message}</p>;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function RegisterForm() {
  const router = useRouter();
  // Ref-based submit lock — immune to render cycle delays unlike isSubmitting
  const submittingRef = useRef(false);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      // Guard against double-submit from rapid clicks
      if (submittingRef.current) return;
      submittingRef.current = true;

      try {
        // Step 1: Create the account
        const { error: signUpError } = await authClient.signUp.email({
          name: value.name,
          email: value.email,
          password: value.password,
          callbackURL: "/user",
        });

        if (signUpError) {
          const deviceMsg = deviceErrorMessage(signUpError.message);
          toast.error(
            deviceMsg ?? signUpError.message ?? "Something went wrong",
          );
          return;
        }

        // Step 2: Immediately sign in to get the session cookie — same as login flow
        const { error: signInError } = await authClient.signIn.email({
          email: value.email,
          password: value.password,
          callbackURL: "/user",
          fetchOptions: {
            // Pass deviceId header so the session hook doesn't throw DEVICE_MISSING
            headers: {
              "x-device-id": getOrCreateDeviceId(),
            },
          },
        });

        if (signInError) {
          // Account was created but sign-in failed — send them to login
          toast.success("Account created! Please login.");
          router.push("/user/login");
          return;
        }

        toast.success("Account created! Welcome 🎉");
        router.push("/user");
      } finally {
        // Always release the lock so the form isn't permanently frozen on error
        submittingRef.current = false;
      }
    },
  });

  const handleGoogleRegister = async () => {
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/user",
      additionalData: { deviceId: getOrCreateDeviceId() },
    });
    if (error) toast.error(error.message ?? "Google sign-in failed");
  };

  return (
    <Card className="relative z-30 w-full max-w-4xl shadow-lg">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          {/* Column 1 */}
          <div className="flex w-[50%] flex-col justify-between space-y-6 p-8 md:p-12">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">
                Create an account
              </h2>
              <p className="text-muted-foreground text-sm">
                Register to get started today
              </p>
              <DeviceNotice variant="register" className="mb-[100px]" />
            </div>

            <span className="flex flex-col items-center gap-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                type="button"
                onClick={handleGoogleRegister}
              >
                <GoogleIcon />
                Continue with Google
              </Button>

              <p className="text-muted-foreground text-sm">
                Already have an account?
                <Link
                  href="/user/login"
                  className="text-foreground hover:text-primary font-medium underline underline-offset-4 transition-colors"
                >
                  Login
                </Link>
              </p>
            </span>
          </div>

          <Separator orientation="vertical" />

          {/* Column 2 */}
          <div className="w-[50%] p-8 md:p-12">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Second line of defence: block native re-submit if ref is locked
                if (submittingRef.current) return;
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              <form.Field
                name="name"
                validators={{
                  onBlur: ({ value }) => {
                    if (!value.trim()) return "Full name is required";
                    if (value.trim().length < 2)
                      return "Name must be at least 2 characters";
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Full name</Label>
                    <Input
                      id={field.name}
                      placeholder="John Doe"
                      autoComplete="name"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={
                        field.state.meta.errors[0]
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    />
                    <FieldError message={field.state.meta.errors[0]} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="email"
                validators={{
                  onBlur: ({ value }) => {
                    if (!value.trim()) return "Email is required";
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                      return "Enter a valid email address";
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Email address</Label>
                    <Input
                      id={field.name}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={
                        field.state.meta.errors[0]
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    />
                    <FieldError message={field.state.meta.errors[0]} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="password"
                validators={{
                  onBlur: ({ value }) => {
                    if (!value) return "Password is required";
                    if (value.length < 8)
                      return "Password must be at least 8 characters";
                    if (!/[A-Z]/.test(value))
                      return "Include at least one uppercase letter";
                    if (!/[0-9]/.test(value))
                      return "Include at least one number";
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Password</Label>
                    <InputPassword
                      id={field.name}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={
                        field.state.meta.errors[0]
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    />
                    <FieldError message={field.state.meta.errors[0]} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="confirmPassword"
                validators={{
                  onBlurListenTo: ["password"],
                  onBlur: ({ value, fieldApi }) => {
                    if (!value) return "Please confirm your password";
                    if (value !== fieldApi.form.getFieldValue("password"))
                      return "Passwords do not match";
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Confirm password</Label>
                    <InputPassword
                      id={field.name}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className={
                        field.state.meta.errors[0]
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    />
                    <FieldError message={field.state.meta.errors[0]} />
                  </div>
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      !canSubmit || isSubmitting || submittingRef.current
                    }
                  >
                    {isSubmitting ? "Creating account…" : "Create account →"}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
