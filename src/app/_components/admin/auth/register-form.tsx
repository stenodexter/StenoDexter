"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { trpc } from "~/trpc/react";
import { toast } from "sonner";

export function RegisterForm() {
  const registerMutation = trpc.admin.auth.register.useMutation();

  const form = useForm({
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
      code: "",
    },
    onSubmit: async ({ value }) => {
      if (value.password !== value.confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      try {
        await registerMutation.mutateAsync({
          name: value.name,
          username: value.username,
          password: value.password,
          code: value.code,
        });
      } catch (error: any) {
        toast.error(error?.message || "Registration failed");
      }
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h2 className="text-xl font-semibold">Create Admin Account</h2>
        <p className="text-muted-foreground text-sm">
          Set up your account to start creating tests
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(field) => (
              <div>
                <Label>Full name</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="username">
            {(field) => (
              <div>
                <Label>Username</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="confirmPassword">
            {(field) => (
              <div>
                <Label>Confirm password</Label>
                <Input
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="code">
            {(field) => (
              <div>
                <Label>Invite / Admin Code</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <Button className="w-full" type="submit">
            Create account →
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
