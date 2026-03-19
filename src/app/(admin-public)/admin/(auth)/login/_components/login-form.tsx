"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { trpc } from "~/trpc/react";
import { toast } from "sonner";
import Link from "next/link";

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-destructive mt-1 text-xs">{message}</p>;
}

export function LoginForm() {
  const router = useRouter();
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
    },
  });

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await loginMutation.mutateAsync(value);
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <h2 className="text-xl font-semibold">Sign In</h2>
        <p className="text-muted-foreground text-sm">
          Welcome back — sign in to your admin account
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
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
              <div className="space-y-1">
                <Label htmlFor={field.name}>Username</Label>
                <Input
                  id={field.name}
                  placeholder="johndoe"
                  autoComplete="username"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
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
              <div className="space-y-1">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
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
                className="w-full"
                type="submit"
                disabled={!canSubmit || isSubmitting || loginMutation.isPending}
              >
                {isSubmitting || loginMutation.isPending
                  ? "Signing in…"
                  : "Sign in →"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Don't have an account?{" "}
          <Link
            href="/admin/register"
            className="text-foreground hover:text-primary font-medium underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
