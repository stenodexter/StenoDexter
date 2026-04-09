"use client";

// ─── app/(user)/test/[testId]/page.tsx ───────────────────────────────────────

import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Progress } from "~/components/ui/progress";
import {
  ArrowLeft,
  Gavel,
  FileText,
  Star,
  Zap,
  Trophy,
  BarChart2,
  PlayCircle,
  Clock,
  CheckCircle2,
  Layers,
  Timer,
  PenLine,
  Coffee,
  Scale,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Suspense, useRef, useState } from "react";
import { TestStartDialog } from "~/components/common/user/test-start-dialog";
import Link from "next/link";
import { cn } from "~/lib/utils";

// ─── types ────────────────────────────────────────────────────────────────────

type Speed = {
  id: string;
  wpm: number;
  dictationSeconds: number;
  breakSeconds: number;
  writtenDurationSeconds: number;
  hasAssessed: boolean;
};

type TestDetails = {
  id: string;
  title: string;
  type: "legal" | "general" | "special";
  createdAt: Date;
  speeds: Speed[];
  hasAttempted: boolean;
  lockedCursor: boolean;
};

type Selected = { test: TestDetails };

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtSec(s: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? (sec > 0 ? `${m}m ${sec}s` : `${m}m`) : `${sec}s`;
}

// ─── config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  legal: {
    icon: Scale,
    label: "Legal",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  general: {
    icon: FileText,
    label: "General",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  special: {
    icon: Star,
    label: "Special",
    className:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  },
} as const;

// ─── type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: TestDetails["type"] }) {
  const { icon: Icon, label, className } = TYPE_CONFIG[type];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 text-xs font-normal", className)}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// ─── kpi card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-4">
      <p className="text-muted-foreground mb-1.5 text-[11px] tracking-wide uppercase">
        {label}
      </p>
      <p
        className={cn(
          "text-2xl font-medium",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ─── time breakdown row ───────────────────────────────────────────────────────

function TimeRow({
  icon: Icon,
  label,
  seconds,
  totalSeconds,
  barClassName,
}: {
  icon: React.ElementType;
  label: string;
  seconds: number;
  totalSeconds: number;
  barClassName: string;
}) {
  const pct = totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground flex w-[88px] shrink-0 items-center gap-1.5">
        <Icon className="h-3 w-3" />
        <span className="text-[11px]">{label}</span>
      </div>
      <Progress value={pct} className={cn("h-1.5 flex-1", barClassName)} />
      <span className="text-foreground w-[46px] text-right text-[11px] font-medium tabular-nums">
        {fmtSec(seconds)}
      </span>
    </div>
  );
}

// ─── speed card ───────────────────────────────────────────────────────────────

function SpeedCard({ speed, onStart }: { speed: Speed; onStart: () => void }) {
  const total =
    speed.dictationSeconds + speed.breakSeconds + speed.writtenDurationSeconds;

  return (
    <div className="bg-card hover:border-border flex flex-col gap-0 rounded-xl border p-5 transition-colors">
      {/* header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
            <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xl font-medium tabular-nums">
            {speed.wpm}
            <span className="text-muted-foreground ml-1 text-sm font-normal">
              wpm
            </span>
          </span>
        </div>

        {speed.hasAssessed && (
          <Badge
            variant="secondary"
            className="gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            Assessed
          </Badge>
        )}
      </div>

      {/* time breakdown */}
      <div className="mb-4 flex flex-col gap-2.5">
        <TimeRow
          icon={Timer}
          label="Audio"
          seconds={speed.dictationSeconds}
          totalSeconds={total}
          barClassName="[&>div]:bg-amber-500"
        />
        <TimeRow
          icon={Coffee}
          label="Break"
          seconds={speed.breakSeconds}
          totalSeconds={total}
          barClassName="[&>div]:bg-blue-400"
        />
        <TimeRow
          icon={PenLine}
          label="Transcription"
          seconds={speed.writtenDurationSeconds}
          totalSeconds={total}
          barClassName="[&>div]:bg-teal-500"
        />
      </div>

      <Separator className="mb-4" />

      {/* total */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
          <Clock className="h-3 w-3" />
          Total duration
        </span>
        <span className="text-sm font-medium tabular-nums">
          {fmtSec(total)}
        </span>
      </div>

      {/* action */}
      <Button
        variant="outline"
        size="sm"
        className="w-full cursor-pointer"
        onClick={onStart}
      >
        <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
        {speed.hasAssessed ? "Practice" : `Start at ${speed.wpm} wpm`}
      </Button>
    </div>
  );
}

// ─── loading skeleton ─────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="w-full space-y-8 px-6 py-8">
      <Skeleton className="h-8 w-24" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Separator />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function TestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const selectedSpeedId = useRef<string | null>(null);

  const [selected, setSelected] = useState<Selected | null>(null);

  const { data, isLoading, error } = trpc.test.get.useQuery(
    { id: testId },
    { retry: false },
  );

  if (isLoading) return <PageSkeleton />;

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
        <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <FileText className="text-muted-foreground h-6 w-6" />
        </div>
        <h2 className="mb-1.5 text-lg font-medium">Test not found</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          This test doesn&apos;t exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => router.push("/user/tests")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to tests
        </Button>
      </div>
    );
  }

  const test = data as unknown as TestDetails;
  console.log(test.speeds);
  const assessedCount = test.speeds.filter((s) => s.hasAssessed).length;

  return (
    <Suspense>
      <div className="w-full px-6 py-8">
        {/* back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/user/tests")}
          className="text-muted-foreground hover:text-foreground mb-6 -ml-2 gap-1.5 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to tests
        </Button>

        {/* header */}
        <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <TypeBadge type={test.type} />
            <h1 className="text-2xl leading-tight font-medium tracking-tight">
              {test.title}
            </h1>
            <p className="text-muted-foreground text-xs">
              Published {format(new Date(test.createdAt), "do MMMM YYY")}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href={`/user/tests/${test.id}/results`}>
                <BarChart2 className="mr-1.5 h-3.5 w-3.5" />
                My results
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href={`/user/tests/${test.id}/leaderboard`}>
                <Trophy className="mr-1.5 h-3.5 w-3.5" />
                Leaderboard
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 text-xs text-white hover:bg-emerald-500"
              onClick={() => setSelected({ test })}
            >
              <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
              Attempt test
            </Button>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* kpis */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          <KpiCard label="Speed levels" value={test.speeds.length} />
          <KpiCard
            label="Assessed"
            value={`${assessedCount} / ${test.speeds.length}`}
            muted={assessedCount === 0}
          />
        </div>

        {/* speed levels */}
        <section>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-sm font-medium">Speed levels</h2>
            <Badge variant="secondary" className="text-xs">
              {test.speeds.length}
            </Badge>
          </div>
          <p className="text-muted-foreground mb-5 text-xs">
            Each speed level can be assessed once. Pick one to begin.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {test.speeds.map((speed) => (
              <SpeedCard
                key={speed.id}
                speed={speed}
                onStart={() => {
                  selectedSpeedId.current = speed.id;
                  setSelected({ test });
                }}
              />
            ))}
          </div>

          {/* legend */}
          <div className="mt-4 flex items-center gap-4">
            {[
              { color: "bg-amber-500", label: "Audio" },
              { color: "bg-blue-400", label: "Break" },
              { color: "bg-teal-500", label: "Transcription" },
            ].map(({ color, label }) => (
              <span
                key={label}
                className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
              >
                <span className={cn("h-2 w-2 rounded-sm", color)} />
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* dialog */}
        <TestStartDialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null);
              selectedSpeedId.current = null;
            }
          }}
          lockedCursor={!!selected?.test.lockedCursor}
          testId={selected?.test.id ?? ""}
          testTitle={selected?.test.title ?? ""}
          speeds={selected?.test.speeds ?? []}
          selectedSpeedId={selectedSpeedId.current ?? undefined}
        />
      </div>
    </Suspense>
  );
}
