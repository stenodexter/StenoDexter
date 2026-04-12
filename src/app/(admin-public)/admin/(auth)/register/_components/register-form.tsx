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

type RegisterProps = {
  token?: string;
};

export function RegisterForm({ token }: RegisterProps) {
  const router = useRouter();
  const submittingRef = useRef(false);

  const loginMutation = trpc.admin.auth.login.useMutation({
    onSuccess: async ({ admin: { token } }) => {
      await fetch("/api/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: "admin_token" }),
      });

      toast.success("Welcome! Account created 🎉");
      router.push("/admin");
    },
    onError: (error) => {
      // Account was created but auto-login failed — fall back to login page
      toast.success("Account created! Please sign in.");
      router.push("/admin/login");
    },
  });

  const registerMutation = trpc.admin.auth.register.useMutation({
    onSuccess: async (_, variables) => {
      // Auto-login with the same credentials
      await loginMutation.mutateAsync({
        username: variables.username,
        password: variables.password,
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Registration failed");
      submittingRef.current = false;
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
      code: token ?? "",
    },
    onSubmit: async ({ value }) => {
      if (submittingRef.current) return;
      submittingRef.current = true;

      try {
        await registerMutation.mutateAsync({
          name: value.name,
          username: value.username,
          password: value.password,
          code: value.code,
        });
      } finally {
        submittingRef.current = false;
      }
    },
  });

  const isPending = registerMutation.isPending || loginMutation.isPending;

  return (
    <Card className="w-full max-w-4xl shadow-lg">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2">
          {/* Column 1 - Heading & Links */}
          <div className="flex flex-col justify-between space-y-6 p-8 md:p-12">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">
                Create Admin Account
              </h2>
              <p className="text-muted-foreground text-sm">
                Set up your account to start creating tests
              </p>
            </div>

            <p className="text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link
                href="/admin/login"
                className="text-foreground hover:text-primary font-medium underline underline-offset-4 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Column 2 - Form */}
          <div className="border-l p-8 md:p-12">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (submittingRef.current) return;
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              {/* Full Name */}
              <form.Field
                name="name"
                validators={{
                  onBlur: ({ value }) =>
                    !value.trim()
                      ? "Full name is required"
                      : value.trim().length < 2
                        ? "Name must be at least 2 characters"
                        : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Full name</Label>
                    <Input
                      id={field.name}
                      placeholder="John Doe"
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

              {/* Username */}
              <form.Field
                name="username"
                validators={{
                  onBlur: ({ value }) =>
                    !value.trim()
                      ? "Username is required"
                      : value.trim().length < 3
                        ? "Username must be at least 3 characters"
                        : /\s/.test(value)
                          ? "Username cannot contain spaces"
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
                    !value
                      ? "Password is required"
                      : value.length < 8
                        ? "Password must be at least 8 characters"
                        : !/[A-Z]/.test(value)
                          ? "Include at least one uppercase letter"
                          : !/[0-9]/.test(value)
                            ? "Include at least one number"
                            : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Password</Label>
                    <Input
                      id={field.name}
                      type="password"
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

              {/* Confirm Password */}
              <form.Field
                name="confirmPassword"
                validators={{
                  onBlurListenTo: ["password"],
                  onBlur: ({ value, fieldApi }) => {
                    const password = fieldApi.form.getFieldValue("password");
                    return !value
                      ? "Please confirm your password"
                      : value !== password
                        ? "Passwords do not match"
                        : undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Confirm password</Label>
                    <Input
                      id={field.name}
                      type="password"
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

              {/* Invite / Admin Code */}
              <form.Field
                name="code"
                validators={{
                  onBlur: ({ value }) =>
                    !value.trim()
                      ? "Invite or admin code is required"
                      : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Invite / Admin code</Label>
                    <Input
                      id={field.name}
                      placeholder="Enter your invite code"
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
                      isPending ||
                      submittingRef.current
                    }
                  >
                    {isPending ? "Creating account…" : "Create account →"}
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
