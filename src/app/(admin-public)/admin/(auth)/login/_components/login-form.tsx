"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { trpc } from "~/trpc/react";
import { toast } from "sonner";
import Link from "next/link";
import { useRef } from "react";

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-destructive mt-1 text-xs">{message}</p>;
}

export function LoginForm() {
  const router = useRouter();
  const submittingRef = useRef(false);

  const loginMutation = trpc.admin.auth.login.useMutation({
    onSuccess: async ({ admin: { token } }) => {
      await fetch("/api/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: "admin_token" }),
      });

      toast.success("Welcome back!");
      router.push("/admin");
    },
    onError: (error) => {
      toast.error(error?.message || "Invalid username or password");
      submittingRef.current = false; // 👈 release on error
    },
  });

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      if (submittingRef.current) return; // 👈 guard
      submittingRef.current = true;      // 👈 lock

      try {
        await loginMutation.mutateAsync(value);
      } finally {
        submittingRef.current = false;   // 👈 always release
      }
    },
  });

  return (
    <Card className="w-full max-w-4xl shadow-lg">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2">
          {/* Column 1 - Heading & Links */}
          <div className="flex flex-col justify-between space-y-6 p-8 md:p-12">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">
                Welcome back
              </h2>
              <p className="text-muted-foreground text-sm">
                Sign in to your admin account to continue
              </p>
            </div>

            <p className="text-muted-foreground text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/admin/register"
                className="text-foreground hover:text-primary font-medium underline underline-offset-4 transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>

          {/* Column 2 - Form */}
          <div className="border-l p-8 md:p-12">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (submittingRef.current) return; // 👈 guard on native submit
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              {/* Username */}
              <form.Field
                name="username"
                validators={{
                  onBlur: ({ value }) =>
                    !value.trim()
                      ? "Username is required"
                      : value.trim().length < 3
                        ? "Username must be at least 3 characters"
                        : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Username</Label>
                    <Input
                      id={field.name}
                      placeholder="johndoe"
                      autoComplete="username"
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
                    <Label htmlFor={field.name}>Password</Label>
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
                    disabled={
                      !canSubmit ||
                      isSubmitting ||
                      loginMutation.isPending ||
                      submittingRef.current // 👈 add this
                    }
                  >
                    {isSubmitting || loginMutation.isPending
                      ? "Signing in…"
                      : "Sign in →"}
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