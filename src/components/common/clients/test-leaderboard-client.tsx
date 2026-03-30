"use client";

// ─── Shared leaderboard page ──────────────────────────────────────────────────

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  Trophy,
  Medal,
  Zap,
  BarChart2,
  ChevronLeft,
  Clock,
  Type,
  AlertCircle,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined, email: string) {
  if (name)
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

// ─── rank cell ────────────────────────────────────────────────────────────────

function RankCell({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex items-center gap-1.5">
        <Medal className="h-4 w-4 text-amber-400" />
        <span className="font-bold text-yellow-600 dark:text-yellow-400">
          1
        </span>
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex items-center gap-1.5">
        <Medal className="h-4 w-4 text-slate-400" />
        <span className="font-bold text-slate-500">2</span>
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex items-center gap-1.5">
        <Medal className="h-4 w-4 text-amber-900" />
        <span className="font-bold text-amber-700 dark:text-amber-500">3</span>
      </div>
    );
  return (
    <span className="text-muted-foreground text-sm tabular-nums">{rank}</span>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border px-5 py-3.5"
        >
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// ─── return type inferred from the query ──────────────────────────────────────

type LeaderboardEntry = {
  rank: number;
  user: {
    id: string;
    name: string | null;
    email: string;
    userCode: string | null;
  };
  speed: { id: string; wpm: number } | null;
  score: number;
  accuracy: number;
  wpm: number;
  mistakes: number;
  writingDuration: number | null;
  totalWords: number;
};

// ─── table ────────────────────────────────────────────────────────────────────

function LeaderboardTable({
  entries,
  currentUserId,
  isAdmin,
  testId,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
  isAdmin: boolean;
  testId: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <Trophy className="text-muted-foreground/30 mb-3 h-8 w-8" />
        <p className="text-muted-foreground text-sm font-medium">
          No entries yet
        </p>
        <p className="text-muted-foreground/60 mt-1 text-xs">
          Be the first to complete this speed!
        </p>
      </div>
    );
  }

  const userEntry = entries.find((e) => e.user.id === currentUserId);

  return (
    <div className="space-y-4">
      {/* Current user's position callout when outside top N */}
      {!isAdmin &&
        currentUserId &&
        userEntry &&
        userEntry.rank > entries.length && (
          <div className="border-primary/30 bg-primary/5 flex items-center gap-4 rounded-xl border px-5 py-3.5">
            <span className="text-primary text-xs font-semibold">
              Your position
            </span>
            <span className="text-primary text-sm font-bold tabular-nums">
              #{userEntry.rank}
            </span>
            <div className="text-muted-foreground ml-auto flex items-center gap-4 text-xs">
              <span>{userEntry.totalWords} words</span>
              <span>{userEntry.mistakes} mistakes</span>
              <span>{formatDuration(userEntry.writingDuration)}</span>
            </div>
          </div>
        )}

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Participant</TableHead>
              <TableHead className="w-28 text-right">
                <span className="flex items-center justify-end gap-1.5">
                  Total Typed Words
                </span>
              </TableHead>
              <TableHead className="w-28 text-right">
                <span className="flex items-center justify-end gap-1.5">
                  Mistakes
                </span>
              </TableHead>
              <TableHead className="w-28 text-right">
                <span className="flex items-center justify-end gap-1.5">
                  Transcription Time
                </span>
              </TableHead>
              {!isAdmin && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isMe = entry.user.id === currentUserId;
              return (
                <TableRow
                  key={entry.user.id}
                  className={isMe ? "bg-primary/5 font-medium" : ""}
                >
                  <TableCell className="py-3.5">
                    <RankCell rank={entry.rank} />
                  </TableCell>

                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-3">
                      {/* Avatar: only shown to admin */}
                      {isAdmin && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs font-semibold">
                            {initials(entry.user.name, entry.user.email)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <p className="text-sm leading-none font-medium">
                          {isAdmin
                            ? (entry.user.name ?? entry.user.email)
                            : (entry.user.userCode ?? `User ${entry.rank}`)}
                          {isMe && (
                            <Badge
                              variant="secondary"
                              className="ml-2 text-[10px]"
                            >
                              You
                            </Badge>
                          )}
                        </p>
                        {/* Email only visible to admin */}
                        {isAdmin && (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {entry.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-3.5 text-right text-sm tabular-nums">
                    {entry.totalWords > 0 ? entry.totalWords : "—"}
                  </TableCell>

                  <TableCell className="py-3.5 text-right text-sm tabular-nums">
                    <span
                      className={
                        entry.mistakes === 0
                          ? "font-semibold text-emerald-600 dark:text-emerald-400"
                          : entry.mistakes <= 3
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-destructive"
                      }
                    >
                      {entry.mistakes}
                    </span>
                  </TableCell>

                  <TableCell className="text-muted-foreground py-3.5 text-right text-sm tabular-nums">
                    {formatDuration(entry.writingDuration)}
                  </TableCell>

                  {/* My attempts link — user view only */}
                  {!isAdmin && (
                    <TableCell className="py-3.5 text-right">
                      {isMe && (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/user/tests/${testId}/results`}>
                            <BarChart2 className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface LeaderboardPageProps {
  isAdmin?: boolean;
  currentUserId?: string | null;
}

export function TestLeaderboardPage({
  isAdmin = false,
  currentUserId = null,
}: LeaderboardPageProps) {
  const params = useParams<{ testId: string }>();
  const testId = params.testId;
  const router = useRouter();

  const { data: testData } = trpc.test.get.useQuery({ id: testId });
  const speeds = testData?.speeds ?? [];

  const [activeSpeedId, setActiveSpeedId] = useState<string | null>(null);
  const resolvedSpeedId = activeSpeedId ?? speeds[0]?.id ?? null;

  const { data: leaderboardData, isLoading } =
    trpc.result.getTopPerformersByTest.useQuery(
      { testId, speedId: resolvedSpeedId ?? "", limit: 50 },
      { enabled: !!resolvedSpeedId, staleTime: 30_000 },
    );

  const entries = (leaderboardData ?? []) as LeaderboardEntry[];
  const userEntry = currentUserId
    ? entries.find((e) => e.user.id === currentUserId)
    : null;

  return (
    <div className="w-full space-y-6 px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground mb-2 -ml-2"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            {testData?.title ?? "Leaderboard"}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Ranked by score · Only assessment attempts count
          </p>
        </div>

        {/* User rank summary card */}
        {!isAdmin && userEntry && (
          <div className="bg-card min-w-[120px] shrink-0 rounded-xl border px-5 py-4 text-center">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
              Your rank
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              #{userEntry.rank}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {userEntry.mistakes} mistakes
            </p>
          </div>
        )}

        {!isAdmin && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-8 shrink-0 self-start"
          >
            <Link href={`/user/tests/${testId}/results`}>
              <BarChart2 className="h-3.5 w-3.5" />
              My Attempts
            </Link>
          </Button>
        )}
      </div>

      {/* Speed tabs */}
      {speeds.length > 1 && (
        <div className="flex items-center gap-2">
          <Zap className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0" />
          <div className="flex flex-wrap gap-2">
            {speeds.map((s) => {
              const active = resolvedSpeedId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSpeedId(s.id)}
                  className={`rounded-lg border px-3.5 py-1.5 text-sm font-semibold tabular-nums transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {s.wpm} WPM
                </button>
              );
            })}
          </div>
        </div>
      )}

      {speeds.length === 1 && speeds[0] && (
        <div className="flex items-center gap-2">
          <Zap className="text-muted-foreground/50 h-3.5 w-3.5" />
          <Badge variant="secondary" className="tabular-nums">
            {speeds[0].wpm} WPM
          </Badge>
        </div>
      )}

      {/* Table */}
      {isLoading || !resolvedSpeedId ? (
        <LeaderboardSkeleton />
      ) : (
        <LeaderboardTable
          entries={entries}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          testId={testId}
        />
      )}

      <p className="text-muted-foreground/50 text-center text-xs">
        Switch speed tabs to see each board
      </p>
    </div>
  );
}
