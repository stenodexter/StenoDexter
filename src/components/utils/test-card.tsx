"use client";

import { FileText, Gavel, Mic, Pause, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";


type TestType = "legal" | "general";
type TestStatus = "draft" | "active";

export interface TestCardData {
  id: string;
  title: string;
  type: TestType;
  status: TestStatus;
  breakSeconds: number;
  writtenDurationSeconds: number;
  dictationSeconds: number;
  createdAt: Date;
  attemptCount: number;
}

interface TestCardProps {
  test: TestCardData;
  onClick?: (id: string) => void;
}

function fmtSec(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export function TestCard({ test, onClick }: TestCardProps) {
  const isActive = test.status === "active";
  const isLegal = test.type === "legal";

  return (
    <div
      onClick={() => onClick?.(test.id)}
      className={[
        "group flex flex-col gap-3 rounded-xl px-4 py-3.5",
        "border-border bg-card text-card-foreground border",
        "transition-all duration-150",
        onClick &&
          "hover:bg-muted/40 dark:hover:bg-muted/20 hover:border-border/80 cursor-pointer hover:shadow-sm",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Row 1 — title + status */}
      <div className="flex items-start justify-between gap-3">
        <h6 className="flex-1 leading-snug font-bold tracking-tight">
          {test.title}
        </h6>

        <span
          className={[
            "mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase",
            isActive
              ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
              : "bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30",
          ].join(" ")}
        >
          {test.status}
        </span>
      </div>

      {/* Row 2 — type + total duration */}
      <div className="flex items-center gap-2">
        <span
          className={[
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5",
            "text-[9px] font-bold tracking-widest uppercase ring-1",
            isLegal
              ? "bg-amber-500/10 text-amber-400 ring-amber-500/25"
              : "bg-sky-500/10 text-sky-400 ring-sky-500/25",
          ].join(" ")}
        >
          {isLegal ? (
            <Gavel className="h-2.5 w-2.5" />
          ) : (
            <FileText className="h-2.5 w-2.5" />
          )}
          {test.type}
        </span>

        <span className="text-muted-foreground text-[14px]">
          {fmtSec(
            test.dictationSeconds +
              test.writtenDurationSeconds +
              test.breakSeconds,
          )}
        </span>
      </div>

      {/* Row 3 — timing */}
      <div className="flex items-end gap-4">
        {[
          { label: "Dictation", icon: Mic, value: test.dictationSeconds },
          { label: "Break", icon: Pause, value: test.breakSeconds },
          {
            label: "Writing",
            icon: Clock,
            value: test.writtenDurationSeconds,
          },
        ].map(({ label, icon: Icon, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-muted-foreground flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase">
              <Icon className="h-2.5 w-2.5" /> {label}
            </span>
            <span className="text-[13px] font-bold tabular-nums">
              {fmtSec(value)}
            </span>
          </div>
        ))}

        <div className="ml-auto flex flex-col items-end gap-0.5">
          <span className="text-muted-foreground text-[9px] font-semibold tracking-widest uppercase">
            Attempts
          </span>
          <span className="text-[13px] font-bold tabular-nums">
            {test.attemptCount}
          </span>
        </div>
      </div>

      {/* Row 4 — footer */}
      <p className="text-muted-foreground text-[12px]">
        Created{" "}
        {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
      </p>
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

interface TestCardGridProps {
  tests: TestCardData[];
  sidebarOpen?: boolean;
  onCardClick?: (id: string) => void;
}

export function TestCardGrid({
  tests,
  sidebarOpen = true,
  onCardClick,
}: TestCardGridProps) {
  return (
    <div
      className={[
        "grid gap-5",
        sidebarOpen
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      ].join(" ")}
    >
      {tests.map((t) => (
        <TestCard  key={t.id} test={t} onClick={onCardClick} />
      ))}
    </div>
  );
}
