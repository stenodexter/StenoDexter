"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { authClient } from "~/server/better-auth/client";
import { IconBrandGoogle } from "@tabler/icons-react";
import Link from "next/link";

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-destructive mt-1 text-xs">{message}</p>;
}

export function LoginForm() {
  const router = useRouter();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
        callbackURL: "/user",
      });
      if (error) {
        toast.error(error.message ?? "Invalid email or password");
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
    });
    if (error) toast.error(error.message ?? "Google sign-in failed");
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 pb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
        <p className="text-muted-foreground text-sm">
          Welcome back — sign in to your account
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Google */}
        <Button
          variant="outline"
          className="w-full gap-2"
          type="button"
          onClick={handleGoogleLogin}
        >
          <IconBrandGoogle />
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs tracking-widest uppercase">
            or
          </span>
          <Separator className="flex-1" />
        </div>

        {/* Credentials */}
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
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/user/register"
            className="text-foreground hover:text-primary font-medium underline underline-offset-4 transition-colors"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
