"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Skeleton } from "~/components/ui/skeleton";
import { Save } from "lucide-react";

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-sm font-medium">{children}</p>;
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-destructive mt-1 text-xs">{msg}</p>;
}

function EditForm({
  testId,
  defaultValues,
}: {
  testId: string;
  defaultValues: {
    title: string;
    correctTranscription: string;
    durationSeconds: number;
  };
}) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const update = trpc.typingTest.manage.update.useMutation({
    onSuccess: () => {
      toast.success("Test updated");
      utils.typingTest.manage.get.invalidate({ id: testId });
      router.push(`/admin/typing-tests/${testId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await update.mutateAsync({ id: testId, ...value });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-6 px-4 py-10"
    >
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
            <Err msg={(field.state.meta.errors as string[])[0]} />
          </div>
        )}
      </form.Field>

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
              <Label>Correct Transcription</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {field.state.value.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <Textarea
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

      <div className="flex items-center justify-between border-t pt-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/admin/typing-tests/${testId}`)}
        >
          Cancel
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting || update.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting || update.isPending ? "Saving…" : "Save Changes"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}

export default function EditTypingTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = use(params);

  const { data: test, isLoading } = trpc.typingTest.manage.get.useQuery({
    id: testId,
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-muted-foreground text-sm">Test not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="px-4 pt-10 pb-2">
        <h1 className="text-lg font-bold">Edit Typing Test</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">{test.title}</p>
      </div>
      <EditForm
        testId={testId}
        defaultValues={{
          title: test.title,
          correctTranscription: test.correctTranscription,
          durationSeconds: test.durationSeconds,
        }}
      />
    </div>
  );
}
