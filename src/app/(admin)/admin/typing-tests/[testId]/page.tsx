"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { DeleteTypingTestDialog } from "../_components/delete-typing-test-dialog";
import {
  Clock,
  Users,
  Trophy,
  Pencil,
  Trash2,
  CalendarDays,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

export default function TypingTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = use(params);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: test, isLoading } = trpc.typingTest.manage.get.useQuery({
    id: testId,
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Separator />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-lg leading-snug font-semibold">{test.title}</h1>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <CalendarDays className="h-3 w-3" />
          <span>
            Created{" "}
            {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      <Separator />

      {/* Stats */}
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
            Duration
          </span>
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">
              {fmtDuration(test.durationSeconds)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
            Transcription
          </span>
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <FileText className="h-3.5 w-3.5" />
            <span>
              {test.correctTranscription.split(/\s+/).filter(Boolean).length}{" "}
              words
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* CTAs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/typing-tests/${testId}/attempts`}>
            <Users className="h-3.5 w-3.5" />
            Attempts
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/typing-tests/${testId}/leaderboard`}>
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/typing-tests/${testId}/edit`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Transcription preview */}
      <div className="bg-muted/30 rounded-xl border p-5">
        <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
          Correct Transcription
        </p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {test.correctTranscription}
        </p>
      </div>

      <DeleteTypingTestDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        testId={testId}
        testTitle={test.title}
      />
    </div>
  );
}
