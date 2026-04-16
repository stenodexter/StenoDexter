// app/admin/typing-tests/new/_components/create-typing-test-form.tsx
"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Rocket } from "lucide-react";

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-sm font-medium">{children}</p>;
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-destructive mt-1 text-xs">{msg}</p>;
}

function Section({
  step,
  title,

  children,
}: {
  step: string;
  title: string;

  children: React.ReactNode;
}) {
  return (
    <div className="border-b px-8 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

export function CreateTypingTestForm() {
  const router = useRouter();

  const createTest = trpc.typingTest.manage.create.useMutation({
    onSuccess: () => {
      toast.success("Typing test created!");
      router.push("/admin/typing-tests");
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm({
    defaultValues: {
      title: "",
      correctTranscription: "",
      durationSeconds: 300, // 5 min default
    },
    onSubmit: async ({ value }) => {
      await createTest.mutateAsync(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="w-full"
    >
      <Section step="1" title="Test Details">
        <div className="space-y-4">
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                value.length < 3 ? "Min 3 characters" : undefined,
            }}
          >
            {(field) => (
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Rajasthan HC LDC — April 2026"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <Err msg={(field.state.meta.errors as string[])[0]} />
              </div>
            )}
          </form.Field>

          <form.Field
            name="durationSeconds"
            validators={{
              onChange: ({ value }) =>
                value < 60 ? "Minimum 60 seconds" : undefined,
            }}
          >
            {(field) => (
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  step={0.5}
                  className="w-32"
                  value={field.state.value ? field.state.value / 60 : ""}
                  onChange={(e) =>
                    field.handleChange(Math.round(Number(e.target.value) * 60))
                  }
                  onBlur={field.handleBlur}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {field.state.value
                    ? `${field.state.value}s total`
                    : "Set typing window duration"}
                </p>
                <Err msg={(field.state.meta.errors as string[])[0]} />
              </div>
            )}
          </form.Field>
        </div>
      </Section>

      <Section step="2" title="Correct Transcription">
        <form.Field
          name="correctTranscription"
          validators={{
            onChange: ({ value }) =>
              value.length < 10 ? "Min 10 characters" : undefined,
          }}
        >
          {(field) => (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label>Transcription</Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {field.state.value.split(/\s+/).filter(Boolean).length} words
                  · {field.state.value.length} chars
                </span>
              </div>
              <Textarea
                placeholder="Type the Transcription here"
                rows={14}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="min-h-[240px] resize-none text-base"
              />
              <Err msg={(field.state.meta.errors as string[])[0]} />
            </div>
          )}
        </form.Field>
      </Section>

      <div className="flex items-center justify-between border-t px-8 py-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/typing-tests")}
        >
          Cancel
        </Button>

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              disabled={isSubmitting || createTest.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Rocket className="mr-2 h-4 w-4" />
              {isSubmitting || createTest.isPending
                ? "Publishing…"
                : "Publish Test"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
