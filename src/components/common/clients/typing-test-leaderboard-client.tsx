"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Trophy,
  Medal,
  ChevronLeft,
  BarChart2,
  Download,
  Clock,
  Target,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

function formatSeconds(s: number | null | undefined) {
  if (!s && s !== 0) return "—";
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function accColor(a: number) {
  if (a >= 95) return "text-emerald-600 dark:text-emerald-400";
  if (a >= 85) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function marksColor(m: number) {
  if (m >= 40) return "text-emerald-600 dark:text-emerald-400";
  if (m >= 25) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function mistakesColor(full: number, half: number) {
  const total = full + half * 0.5;
  if (total === 0) return "text-emerald-600 dark:text-emerald-400";
  if (total <= 3) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
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
        <Medal className="h-4 w-4 text-amber-800" />
        <span className="font-bold text-amber-700 dark:text-amber-500">3</span>
      </div>
    );
  return (
    <span className="text-muted-foreground text-sm tabular-nums">{rank}</span>
  );
}

// ─── stat pill ────────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="bg-muted/40 flex items-center gap-2 rounded-lg border px-3 py-2">
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${className ?? "text-muted-foreground"}`}
      />
      <div>
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          {label}
        </p>
        <p className={`text-sm font-bold tabular-nums ${className ?? ""}`}>
          {value}
        </p>
      </div>
    </div>
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
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

// ─── entry type (from router return) ─────────────────────────────────────────

type LeaderboardEntry = {
  rank: number;
  userId: string;
  resultId: string;
  user: {
    name: string | null;
    email: string;
    userCode: string | null;
  };
  marksOutOf50: number;
  accuracy: number;
  netDph: number;
  grossWpm: number;
  netWpm: number;
  fullMistakes: number;
  halfMistakes: number;
  grossErrors: number;
  totalStrokes: number;
  netStrokes: number;
  transcriptionTimeSeconds: number;
  attemptedAt: Date;
};

// ─── table ────────────────────────────────────────────────────────────────────

function LeaderboardTable({
  entries,
  currentUserId,
  isAdmin,
  testId,
  testDurationSeconds,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
  isAdmin: boolean;
  testId: string;
  testDurationSeconds: number;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
        <Trophy className="text-muted-foreground/30 mb-3 h-8 w-8" />
        <p className="text-muted-foreground text-sm font-medium">
          No entries yet
        </p>
        <p className="text-muted-foreground/60 mt-1 text-xs">
          Be the first to complete this test!
        </p>
      </div>
    );
  }

  const userEntry = entries.find((e) => e.userId === currentUserId);

  return (
    <div className="space-y-4">
      {/* User's position callout if outside visible list */}
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
            <div className="text-muted-foreground ml-auto flex items-center gap-4 text-xs tabular-nums">
              <span>{userEntry.marksOutOf50.toFixed(2)} / 50</span>
              <span>{userEntry.accuracy.toFixed(1)}%</span>
              <span>{formatSeconds(userEntry.transcriptionTimeSeconds)}</span>
            </div>
          </div>
        )}

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Participant</TableHead>
              <TableHead className="w-28 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-3 w-3" />
                  Marks / 50
                </div>
              </TableHead>
              <TableHead className="w-28 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Target className="h-3 w-3" />
                  Accuracy
                </div>
              </TableHead>
              <TableHead className="w-28 text-center">Net DPH</TableHead>
              <TableHead className="w-28 text-center">Gross WPM</TableHead>
              <TableHead className="w-24 text-center">Full / Half</TableHead>
              <TableHead className="w-32 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Time Taken
                </div>
              </TableHead>
              <TableHead className="w-24 text-center">Total / Net KS</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isMe = entry.userId === currentUserId;
              return (
                <TableRow
                  key={entry.userId}
                  className={isMe ? "bg-primary/5 font-medium" : ""}
                >
                  <TableCell className="py-3.5">
                    <RankCell rank={entry.rank} />
                  </TableCell>

                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs font-semibold">
                            {initials(entry.user.name, entry.user.email)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {isAdmin
                              ? (entry.user.name ?? entry.user.email)
                              : (entry.user.userCode ??
                                `Candidate ${entry.rank}`)}
                          </p>
                          {isAdmin && entry.user.userCode && (
                            <span className="bg-muted shrink-0 rounded-md px-2 py-0.5 font-mono text-xs">
                              {entry.user.userCode.toUpperCase()}
                            </span>
                          )}
                          {isMe && (
                            <Badge variant="secondary" className="text-[10px]">
                              You
                            </Badge>
                          )}
                        </div>
                        {isAdmin && (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {entry.user.email}
                          </p>
                        )}
                        <p className="text-muted-foreground text-[10px]">
                          {formatDistanceToNow(new Date(entry.attemptedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Marks / 50 */}
                  <TableCell className="py-3.5 text-center">
                    <span
                      className={`text-sm font-bold tabular-nums ${marksColor(entry.marksOutOf50)}`}
                    >
                      {entry.marksOutOf50.toFixed(2)}
                    </span>
                  </TableCell>

                  {/* Accuracy */}
                  <TableCell className="py-3.5 text-center">
                    <span
                      className={`text-sm font-semibold tabular-nums ${accColor(entry.accuracy)}`}
                    >
                      {entry.accuracy.toFixed(1)}%
                    </span>
                  </TableCell>

                  {/* Net DPH */}
                  <TableCell className="py-3.5 text-center text-sm tabular-nums">
                    {Math.round(entry.netDph).toLocaleString()}
                  </TableCell>

                  {/* Gross WPM */}
                  <TableCell className="py-3.5 text-center text-sm tabular-nums">
                    {entry.grossWpm}
                  </TableCell>

                  {/* Full / Half mistakes */}
                  <TableCell className="py-3.5 text-center">
                    <span
                      className={`text-sm tabular-nums ${mistakesColor(entry.fullMistakes, entry.halfMistakes)}`}
                    >
                      {entry.fullMistakes}
                      <span className="text-muted-foreground">/</span>
                      {entry.halfMistakes}
                    </span>
                  </TableCell>

                  {/* Time taken */}
                  <TableCell className="text-muted-foreground py-3.5 text-center text-sm tabular-nums">
                    {formatSeconds(entry.transcriptionTimeSeconds)}
                    <span className="text-muted-foreground/50 text-[10px]">
                      {" "}
                      / {formatSeconds(testDurationSeconds)}
                    </span>
                  </TableCell>

                  {/* Total / Net keystrokes */}
                  <TableCell className="text-muted-foreground py-3.5 text-center text-sm tabular-nums">
                    {entry.totalStrokes}
                    <span className="text-muted-foreground/50">/</span>
                    {entry.netStrokes}
                  </TableCell>

                  {/* CTA */}
                  <TableCell className="py-3.5 text-right">
                    {isMe && !isAdmin && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/user/typing-tests/${testId}/results`}>
                          <BarChart2 className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                    {isAdmin && (
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={`/admin/typing-tests/${testId}/user/${entry.userId}/results`}
                        >
                          <BarChart2 className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface TypingLeaderboardProps {
  testId: string;
  isAdmin?: boolean;
  currentUserId?: string | null;
}

export function TypingLeaderboard({
  testId,
  isAdmin = false,
  currentUserId = null,
}: TypingLeaderboardProps) {
  const router = useRouter();

  const { data: testData } = trpc.typingTest.manage.get.useQuery(
    { id: testId },
    { staleTime: 60_000 },
  );

  const { data: entries = [], isLoading } =
    trpc.typingTest.leaderboard.getLeaderboard.useQuery(
      { testId, limit: 100 },
      { staleTime: 30_000 },
    );

  const userEntry = currentUserId
    ? entries.find((e) => e.userId === currentUserId)
    : null;

  // Summary stats
  const avgMarks = useMemo(() => {
    if (!entries.length) return null;
    return entries.reduce((s, e) => s + e.marksOutOf50, 0) / entries.length;
  }, [entries]);

  const avgAccuracy = useMemo(() => {
    if (!entries.length) return null;
    return entries.reduce((s, e) => s + e.accuracy, 0) / entries.length;
  }, [entries]);

  const handleDownloadPDF = () => {
    if (!testData || !entries.length) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(testData.title ?? "Typing Test Leaderboard", pageWidth / 2, 44, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Generated on ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}  ·  Assessment attempts only`,
      pageWidth / 2,
      60,
      { align: "center" },
    );
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 76,
      head: [
        [
          "Rank",
          "Name",
          "Email",
          "SD ID",
          "Marks / 50",
          "Accuracy",
          "Net DPH",
          "Gross WPM",
          "Full Err",
          "Half Err",
          "Time Taken",
          "Total KS",
          "Net KS",
        ],
      ],
      body: entries.map((e) => [
        `#${e.rank}`,
        e.user.name ?? e.user.email,
        e.user.email,
        e.user.userCode ?? "—",
        e.marksOutOf50.toFixed(2),
        `${e.accuracy.toFixed(1)}%`,
        Math.round(e.netDph).toLocaleString(),
        String(e.grossWpm),
        String(e.fullMistakes),
        String(e.halfMistakes),
        formatSeconds(e.transcriptionTimeSeconds),
        String(e.totalStrokes),
        String(e.netStrokes),
      ]),
      headStyles: {
        fillColor: [20, 20, 20],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: 30 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        0: { halign: "center", cellWidth: 32 },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
        7: { halign: "center" },
        8: { halign: "center" },
        9: { halign: "center" },
        10: { halign: "center" },
        11: { halign: "center" },
        12: { halign: "center" },
      },
      didParseCell(data) {
        if (data.column.index === 4 && data.section === "body") {
          const val = parseFloat(String(data.cell.raw));
          if (val >= 40) data.cell.styles.textColor = [5, 150, 105];
          else if (val >= 25) data.cell.styles.textColor = [180, 100, 0];
          else data.cell.styles.textColor = [200, 30, 30];
        }
        if (data.column.index === 5 && data.section === "body") {
          const val = parseFloat(String(data.cell.raw));
          if (val >= 95) data.cell.styles.textColor = [5, 150, 105];
          else if (val >= 85) data.cell.styles.textColor = [180, 100, 0];
          else data.cell.styles.textColor = [200, 30, 30];
        }
      },
      margin: { left: 30, right: 30 },
    });

    doc.save(
      `typing-leaderboard-${(testData.title ?? testId).replace(/\s+/g, "-").toLowerCase()}.pdf`,
    );
  };

  return (
    <div className="w-full space-y-6 px-6 py-8">
      {/* ── Header ── */}
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
            {entries.length} candidate{entries.length !== 1 ? "s" : ""} ranked
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* User rank card */}
          {!isAdmin && userEntry && (
            <div className="bg-card min-w-[110px] shrink-0 rounded-xl border px-4 py-3.5 text-center">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                Your rank
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                #{userEntry.rank}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                {userEntry.marksOutOf50.toFixed(2)} / 50
              </p>
            </div>
          )}

          {/* Admin: PDF download */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={!entries.length}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Rank List
            </Button>
          )}

          {/* User: my attempts link */}
          {!isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/user/typing-tests/${testId}/results`}>
                <BarChart2 className="mr-1.5 h-3.5 w-3.5" />
                My Attempts
              </Link>
            </Button>
          )}

          {/* Admin: view all attempts */}
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/typing-tests/${testId}/attempts`}>
                <BarChart2 className="mr-1.5 h-3.5 w-3.5" />
                All Attempts
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary stat pills (admin only) ── */}
      {isAdmin && entries.length > 0 && avgMarks !== null && (
        <div className="flex flex-wrap gap-3">
          <StatPill
            icon={Trophy}
            label="Top Score"
            value={`${entries[0]!.marksOutOf50.toFixed(2)} / 50`}
            className="text-amber-500"
          />
          <StatPill
            icon={Star}
            label="Avg Marks"
            value={`${avgMarks.toFixed(2)} / 50`}
          />
          <StatPill
            icon={Target}
            label="Avg Accuracy"
            value={`${avgAccuracy!.toFixed(1)}%`}
          />
          <StatPill
            icon={Clock}
            label="Fastest"
            value={formatSeconds(
              Math.min(...entries.map((e) => e.transcriptionTimeSeconds)),
            )}
          />
        </div>
      )}

      {/* ── Table ── */}
      {isLoading ? (
        <LeaderboardSkeleton />
      ) : (
        <LeaderboardTable
          entries={entries as LeaderboardEntry[]}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          testId={testId}
          testDurationSeconds={testData?.durationSeconds ?? 0}
        />
      )}

      <p className="text-muted-foreground/50 text-center text-xs">
        Ranked by marks · ties broken by accuracy then time
      </p>
    </div>
  );
}
