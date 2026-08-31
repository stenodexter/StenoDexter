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
import { useReturnTo } from "~/hooks/use-return-to";
import { withReturnTo } from "~/lib/return-to";
import {
  Trophy,
  Users,
  Pencil,
  Zap,
  CalendarDays,
  FileAudio,
  Trash2,
  Lock,
  List,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { env } from "~/env";

function PdfCard({
  label,
  url,
  icon: Icon,
  accent,
}: {
  label: string;
  url: string;
  icon: React.ElementType;
  accent: "violet" | "blue";
}) {
  const cls =
    accent === "violet"
      ? "border-violet-400/40 text-violet-600 dark:text-violet-400"
      : "border-blue-400/40 text-blue-600 dark:text-blue-400";

  const hoverCls =
    accent === "violet" ? "hover:bg-violet-500/5" : "hover:bg-blue-500/5";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 ${cls}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-sm font-medium">{label}</span>

      <div className="ml-auto flex items-center gap-1">
        {/* Open in viewer */}
        <a
          href={`${env.NEXT_PUBLIC_APP_URL}/viewer?file=${encodeURIComponent(url)}`}
          target="_blank"
          className={`rounded-md px-2 py-1 text-xs opacity-60 transition-colors hover:opacity-100 ${hoverCls}`}
          title="Open in viewer"
        >
          Open ↗
        </a>

        {/* Download */}
        <a
          href={url}
          target="_blank"
          download
          className={`rounded-md px-2 py-1 text-xs opacity-60 transition-colors hover:opacity-100 ${hoverCls}`}
          title={`Download ${label} PDF`}
        >
          ↓ Download
        </a>
      </div>
    </div>
  );
}

export default function TestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = use(params);
  const utils = trpc.useUtils();
  // Back / delete return to the filtered list the admin drilled in from.
  const returnTo = useReturnTo("/admin/tests");

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
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-muted-foreground -ml-2 w-fit gap-1.5"
      >
        <Link href={returnTo}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to tests
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg leading-snug font-semibold">{test.title}</h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline">
              {test.type.charAt(0).toUpperCase() + test.type.slice(1)}
            </Badge>
            {test.lockedCursor && (
              <Badge
                variant={"outline"}
                className="text-muted-foreground shrink-0"
              >
                <Lock />
                cursor
              </Badge>
            )}
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
              <Link href={withReturnTo(`/admin/test/${testId}/attempts`, returnTo)}>
                <Users className="h-3.5 w-3.5" />
                All Attempts
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={withReturnTo(`/admin/test/${testId}/leaderboard`, returnTo)}>
                <Trophy className="h-3.5 w-3.5" />
                Leaderboard
              </Link>
            </Button>
          </>
        )}
        {isDraft && (
          <Button asChild variant="outline" size="sm">
            <Link href={withReturnTo(`/admin/test/${testId}/edit`, returnTo)}>
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

      {test.matterPdfUrl && (
        <PdfCard
          icon={FileText}
          key={test.matterPdfKey}
          url={test.matterPdfUrl}
          label="Matter"
          accent="violet"
        />
      )}
      {test.outlinePdfKey && test.outlinePdfUrl && (
        <PdfCard
          icon={FileText}
          key={test.outlinePdfKey}
          url={test.outlinePdfUrl}
          label="Outlines"
          accent="blue"
        />
      )}

      <DeleteTestDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        testId={testId}
        testTitle={test.title}
        returnTo={returnTo}
      />
    </div>
  );
}
