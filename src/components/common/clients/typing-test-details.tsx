// components/common/typing-test/typing-test-detail-page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import {
  Trophy,
  Users,
  Pencil,
  Trash2,
  CalendarDays,
  Clock,
  FileText,
  PlayCircle,
  BarChart2,
  ChevronLeft,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DeleteTypingTestDialog } from "~/app/(admin)/admin/typing-tests/_components/delete-typing-test-dialog";
import { TypingTestStartDialog } from "../user/typing-test-start-dialog";
// ─── types ────────────────────────────────────────────────────────────────────

type TypingTestDetail = {
  id: string;
  title: string;
  correctTranscription: string;
  durationSeconds: number;
  createdAt: Date;
  userAttemptCount: number;
  isAssessed: boolean;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

// ─── stat block ───────────────────────────────────────────────────────────────

function StatBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
        {label}
      </span>
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Separator />
      <div className="flex gap-6">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Separator />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

// ─── admin view ───────────────────────────────────────────────────────────────

function AdminView({
  test,
  testId,
}: {
  test: TypingTestDetail;
  testId: string;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const utils = trpc.useUtils();

  return (
    <>
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

      <DeleteTypingTestDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        testId={testId}
        testTitle={test.title}
      />
    </>
  );
}

// ─── user view ────────────────────────────────────────────────────────────────

function UserView({ test }: { test: TypingTestDetail }) {
  const [startOpen, setStartOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className={
            test.isAssessed
              ? undefined
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }
          variant={test.isAssessed ? "outline" : "default"}
          onClick={() => setStartOpen(true)}
        >
          <PlayCircle className="h-3.5 w-3.5" />
          {test.isAssessed ? "Practice Again" : "Start Test"}
        </Button>

        <Button asChild variant="outline" size="sm">
          <Link href={`/user/typing-tests/${test.id}/results`}>
            <BarChart2 className="h-3.5 w-3.5" />
            My Results
          </Link>
        </Button>

        <Button asChild variant="outline" size="sm">
          <Link href={`/user/typing-tests/${test.id}/leaderboard`}>
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard
          </Link>
        </Button>
      </div>

      <TypingTestStartDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        test={test}
      />
    </>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function TypingTestDetailPage({
  testId,
  isAdmin = false,
}: {
  testId: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  const { data: test, isLoading } = trpc.typingTest.manage.get.useQuery(
    { id: testId },
    { staleTime: 60_000 },
  );

  if (isLoading) return <PageSkeleton />;

  if (!test) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-muted-foreground text-sm">Test not found.</p>
      </div>
    );
  }

  const t = test as unknown as TypingTestDetail;
  const wordCount = t.correctTranscription
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="mx-auto flex w-[60%] flex-col gap-6 px-4 py-10">
      {/* back */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground -ml-2 w-fit gap-1.5 text-xs"
        onClick={() => router.back()}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back
      </Button>

      {/* header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-lg leading-snug font-semibold">{t.title}</h1>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <CalendarDays className="h-3 w-3" />
          <span>
            Created{" "}
            {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      <Separator />

      {/* stats */}
      <div className="flex flex-wrap gap-6">
        <StatBlock
          label="Duration"
          value={fmtDuration(t.durationSeconds)}
          icon={Clock}
        />
        <StatBlock
          label="Transcription"
          value={`${wordCount} words`}
          icon={FileText}
        />
        {!isAdmin && (
          <StatBlock
            label="Your Attempts"
            value={t.userAttemptCount}
            icon={RotateCcw}
          />
        )}
        {!isAdmin && t.isAssessed && (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
              Status
            </span>
            <Badge variant="secondary" className="w-fit gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Assessed
            </Badge>
          </div>
        )}
      </div>

      <Separator />

      {/* CTAs */}
      {isAdmin ? <AdminView test={t} testId={testId} /> : <UserView test={t} />}

      {/* transcription preview */}
      {isAdmin && (
        <div className="bg-muted/30 rounded-xl border p-5">
          <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-widest uppercase">
            Passage
          </p>
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{
              fontFamily: "'Calibri', 'Carlito', 'Liberation Sans', sans-serif",
            }}
          >
            {t.correctTranscription}
          </p>
        </div>
      )}
    </div>
  );
}
