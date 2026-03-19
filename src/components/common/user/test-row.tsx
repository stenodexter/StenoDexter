"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Mic, PauseCircle, PenLine, Clock, Users } from "lucide-react";
import { TestStartDialog } from "./test-start-dialog";

type TestType = "legal" | "general";

interface TestRowProps {
  id: string;
  title: string;
  type: TestType;
  dictationSeconds: number;
  breakSeconds: number;
  writtenDurationSeconds: number;
  createdAt: Date;
  attemptCount: number;
  hasAttempted: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function totalDuration(dictation: number, breakSec: number, written: number) {
  return formatDuration(dictation + breakSec + written);
}

function TypeBadge({ type }: { type: TestType }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ring-1 ring-inset ${
        type === "legal"
          ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
          : "bg-violet-500/10 text-violet-400 ring-violet-500/20"
      }`}
    >
      {type}
    </span>
  );
}

function StatPill({
  icon: Icon,
  value,
  bold,
}: {
  icon: React.ElementType;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 ${bold ? "text-foreground" : "text-muted-foreground"}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className={`text-xs tabular-nums ${bold ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function TestRow({
  id,
  title,
  type,
  dictationSeconds,
  breakSeconds,
  writtenDurationSeconds,
  createdAt,
  attemptCount,
  hasAttempted,
}: TestRowProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="border-border bg-card hover:bg-accent/30 flex min-h-[72px] items-center gap-5 rounded-xl border px-5 py-4 transition-colors">
        {/* Title + badge + date */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm leading-snug font-semibold">
              {title}
            </p>
            <TypeBadge type={type} />
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {formatDate(createdAt)}
          </p>
        </div>

        {/* Duration stats */}
        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <StatPill icon={Mic} value={formatDuration(dictationSeconds)} />
          <StatPill icon={PauseCircle} value={formatDuration(breakSeconds)} />
          <StatPill
            icon={PenLine}
            value={formatDuration(writtenDurationSeconds)}
          />
          <div className="bg-border mx-1 h-4 w-px" />
          <StatPill
            icon={Clock}
            value={totalDuration(
              dictationSeconds,
              breakSeconds,
              writtenDurationSeconds,
            )}
            bold
          />
        </div>

        {/* Attempt count */}
        <div className="text-muted-foreground hidden shrink-0 items-center gap-1.5 md:flex">
          <Users className="h-3.5 w-3.5" />
          <span className="w-5 text-center text-xs tabular-nums">
            {attemptCount}
          </span>
        </div>

        {/* CTA */}
        <div className="shrink-0">
          {!hasAttempted ? (
            <Button
              size="sm"
              className="min-w-[100px]"
              onClick={() => setDialogOpen(true)}
            >
              Assessment
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="min-w-[100px]"
              onClick={() => setDialogOpen(true)}
            >
              Practice
            </Button>
          )}
        </div>
      </div>

      <TestStartDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        testId={id}
        testTitle={title}
        hasAttempted={hasAttempted}
      />
    </>
  );
}
