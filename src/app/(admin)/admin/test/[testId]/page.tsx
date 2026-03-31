// ─── app/admin/test/[testId]/page.tsx ────────────────────────────────────────
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { SolutionAudioDialog } from "~/components/common/admin/add-explanation-audio-dialog";
import { DeleteTestDialog } from "~/components/common/admin/delete-test-dialog";
import {
  Trophy,
  Users,
  Pencil,
  Zap,
  CalendarDays,
  FileAudio,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function TestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = use(params);
  const utils = trpc.useUtils();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: test, isLoading } = trpc.test.get.useQuery({ id: testId });

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

  const isDraft = test.status === "draft";
  const hasSolutionAudio = !!test.solutionAudioKey;

  return (
    <div className="mx-auto flex min-w-3xl flex-col gap-6 px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg leading-snug font-semibold">{test.title}</h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline">
              {test.type.charAt(0).toUpperCase() + test.type.slice(1)}
            </Badge>
            <Badge variant={isDraft ? "secondary" : "default"}>
              {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
            </Badge>
          </div>
        </div>

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
        {/* Speeds */}
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
            Speeds
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {test.speeds.length > 0 ? (
              <>
                <Zap className="text-muted-foreground/50 h-3 w-3" />
                {test.speeds.map((s: { id: string; wpm: number }) => (
                  <Badge
                    key={s.id}
                    variant="secondary"
                    className="tabular-nums"
                  >
                    {s.wpm} WPM
                  </Badge>
                ))}
              </>
            ) : (
              <span className="text-muted-foreground text-xs">
                No speeds set
              </span>
            )}
          </div>
        </div>

        {/* Attempts count */}
        {!isDraft && (
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
              Attempts
            </span>
            <div className="text-muted-foreground flex items-center gap-1 text-sm">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium tabular-nums">
                {test.attemptsCount}
              </span>
            </div>
          </div>
        )}

        {/* Solution audio */}
        {!isDraft && (
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
              Solution Audio
            </span>
            <div className="flex items-center gap-1 text-sm">
              <FileAudio className="text-muted-foreground h-3.5 w-3.5" />
              <span
                className={
                  hasSolutionAudio ? "text-foreground" : "text-muted-foreground"
                }
              >
                {hasSolutionAudio ? "Uploaded" : "Not uploaded"}
              </span>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* CTAs */}
      <div className="flex flex-wrap items-center gap-2">
        {!isDraft && (
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/test/${testId}/attempts`}>
                <Users className="h-3.5 w-3.5" />
                All Attempts
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/test/${testId}/leaderboard`}>
                <Trophy className="h-3.5 w-3.5" />
                Leaderboard
              </Link>
            </Button>
          </>
        )}
        {isDraft && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/test/${testId}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
        )}
        {!isDraft && !hasSolutionAudio && (
          <SolutionAudioDialog
            testId={testId}
            onSuccess={() => utils.test.get.invalidate({ id: testId })}
          />
        )}

        {/* Delete — always visible for admin, pushed to the right */}
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

      <DeleteTestDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        testId={testId}
        testTitle={test.title}
      />
    </div>
  );
}