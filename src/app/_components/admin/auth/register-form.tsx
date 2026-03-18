"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { trpc } from "~/trpc/react";
import { toast } from "sonner";

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-destructive text-xs mt-1">{message}</p>;
}

export function RegisterForm() {
  const router = useRouter();
  const registerMutation = trpc.admin.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Account created! Redirecting to login…");
      router.push("/admin/login");
    },
    onError: (error) => {
      toast.error(error?.message || "Registration failed");
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
      code: "",
    },
    onSubmit: async ({ value }) => {
      await registerMutation.mutateAsync({
        name: value.name,
        username: value.username,
        password: value.password,
        code: value.code,
      });
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <h2 className="text-xl font-semibold">Create Admin Account</h2>
        <p className="text-muted-foreground text-sm">
          Set up your account to start creating tests
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
              <div className="space-y-1">
                <Label htmlFor={field.name}>Full name</Label>
                <Input
                size={10}
                  id={field.name}
                  placeholder="John Doe"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
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
                !value
                  ? "Password is required"
                  : value.length < 8
                    ? "Password must be at least 8 characters"
                    : !/[A-Z]/.test(value)
                      ? "Password must contain at least one uppercase letter"
                      : !/[0-9]/.test(value)
                        ? "Password must contain at least one number"
                        : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  type="password"
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
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
              <div className="space-y-1">
                <Label htmlFor={field.name}>Confirm password</Label>
                <Input
                  id={field.name}
                  type="password"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
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
              <div className="space-y-1">
                <Label htmlFor={field.name}>Invite / Admin code</Label>
                <Input
                  id={field.name}
                  placeholder="Enter your invite code"
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
                disabled={!canSubmit || isSubmitting || registerMutation.isPending}
              >
                {isSubmitting || registerMutation.isPending
                  ? "Creating account…"
                  : "Create account →"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <a
            href="/admin/login"
            className="text-foreground font-medium underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </a>
        </p>
      </CardContent>
    </Card>
  );
}