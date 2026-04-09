"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { authClient, getOrCreateDeviceId } from "~/server/better-auth/client";
import Link from "next/link";
import { deviceErrorMessage } from "~/server/lib/device-error";
import { DeviceNotice } from "~/components/utils/device-notice";
import { Separator } from "~/components/ui/separator";

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

export function LoginForm() {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
        callbackURL: "/user",
      });

      if (error) {
        console.log(error);

        const deviceMsg = deviceErrorMessage(error.message);
        toast.error(deviceMsg ?? error.message ?? "Invalid email or password");
      } else {
        toast.success("Welcome back!");
        router.push("/user");
      }
    },
  });

  const handleGoogleLogin = async () => {
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/user",
      additionalData: {
        deviceId: getOrCreateDeviceId(),
      },
    });
    if (error) toast.error(error.message ?? "Google sign-in failed");
  };

  return (
    <Card className="w-full max-w-4xl shadow-lg">
      <CardContent className="flex items-center justify-between p-0">
        <div className="flex">
          {/* Column 1 - Heading & Google */}
          <div className="flex max-w-[50%] flex-col justify-between space-y-6 p-8 md:p-12">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">
                Welcome back
              </h2>
              <p className="text-muted-foreground text-sm">
                Sign in to your account to continue
              </p>
              <DeviceNotice variant="login" className="mb-[60px]" />
            </div>

            <span className="flex flex-col items-center gap-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                type="button"
                onClick={handleGoogleLogin}
              >
                <GoogleIcon />
                Continue with Google
              </Button>

              <p className="text-muted-foreground text-sm">
                Don&apos;t have an account?{" "}
                <Link
                  href="/user/register"
                  className="text-foreground hover:text-primary font-medium underline underline-offset-4 transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </span>
          </div>

          <Separator orientation="vertical" />

          {/* Column 2 - Form */}
          <div className="my-auto w-full max-w-[50%] p-8 md:p-12">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              {/* Email */}
              <form.Field
                name="email"
                validators={{
                  onBlur: ({ value }) => {
                    if (!value.trim()) return "Email is required";
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                      return "Enter a valid email address";
                    return undefined;
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

              {/* Password */}
              <form.Field
                name="password"
                validators={{
                  onBlur: ({ value }) =>
                    !value ? "Password is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.name}>Password</Label>
                      <a
                        href="/forgot-password"
                        className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4 transition-colors"
                      >
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      id={field.name}
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
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
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? "Signing in…" : "Sign in →"}
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
