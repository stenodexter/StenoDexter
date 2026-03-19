"use client";

// ─── components/report-card/report-card-view.tsx ─────────────────────────────

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Trophy,
  Gauge,
  Target,
  AlertCircle,
  Activity,
  BarChart3,
  FileText,
  Gavel,
  ExternalLink,
  ArrowLeft,
  Star,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

type Mode = "admin" | "user";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AccText({ v }: { v: number }) {
  return (
    <span
      className={
        v >= 90
          ? "text-emerald-500"
          : v >= 70
            ? "text-amber-500"
            : "text-destructive"
      }
    >
      {v}%
    </span>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function KpiStrip({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    color: string;
  }[];
}) {
  return (
    <div
      className={`grid grid-cols-${items.length} divide-x rounded-xl border`}
    >
      {items.map(({ label, value, sub, icon: Icon, color }) => (
        <div
          key={label}
          className="flex items-center justify-between px-3.5 py-2.5"
        >
          <div>
            <p className="text-muted-foreground text-[9px] font-semibold tracking-widest uppercase">
              {label}
            </p>
            <p className="mt-0.5 text-base leading-tight font-bold tabular-nums">
              {value}
            </p>
            {sub && <p className="text-muted-foreground text-[10px]">{sub}</p>}
          </div>
          <Icon className={`h-3 w-3 shrink-0 ${color}`} />
        </div>
      ))}
    </div>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

type SeriesPoint = {
  index: number;
  submittedAt: Date;
  accuracy: number;
  mistakes: number;
  wpm: number;
  score: number;
};

function LineChart({ series }: { series: SeriesPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: SeriesPoint;
  } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || series.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const PAD = { top: 12, right: 16, bottom: 32, left: 40 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;
    const n = series.length;

    // Resolve CSS variables
    const probe = document.createElement("span");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);

    probe.className = "text-muted-foreground";
    const mutedColor = getComputedStyle(probe).color || "rgba(100,100,100,0.5)";
    probe.className = "text-border";
    const borderColor =
      getComputedStyle(probe).color || "rgba(255,255,255,0.1)";
    document.body.removeChild(probe);

    const accColor = "#10b981"; // emerald-500
    const mistakesColor = "#f59e0b"; // amber-500

    // Y ranges
    const maxAcc = 100;
    const minAcc = Math.max(0, Math.min(...series.map((p) => p.accuracy)) - 10);
    const maxMis = Math.max(...series.map((p) => p.mistakes), 5);
    const minMis = 0;

    const xOf = (i: number) => PAD.left + (i / (n - 1)) * cW;
    const yOfAcc = (v: number) =>
      PAD.top + (1 - (v - minAcc) / (maxAcc - minAcc)) * cH;
    const yOfMis = (v: number) =>
      PAD.top + (1 - (v - minMis) / (maxMis - minMis)) * cH;

    // Grid lines
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (i / 4) * cH;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();

      // Y axis labels (accuracy)
      const accVal = Math.round(maxAcc - (i / 4) * (maxAcc - minAcc));
      ctx.fillStyle = mutedColor;
      ctx.font = `${(10 * dpr) / dpr}px sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(`${accVal}%`, PAD.left - 4, y + 3);
    }

    // X axis labels (every ~10 points)
    ctx.textAlign = "center";
    const step = Math.max(1, Math.floor(n / 6));
    for (let i = 0; i < n; i += step) {
      const x = xOf(i);
      ctx.fillStyle = mutedColor;
      ctx.fillText(
        format(new Date(series[i]!.submittedAt), "MMM d"),
        x,
        H - PAD.bottom + 14,
      );
    }

    // Draw line helper
    const drawLine = (pts: number[][], color: string, dashed = false) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      if (dashed) ctx.setLineDash([4, 3]);
      else ctx.setLineDash([]);
      pts.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x!, y!);
        else ctx.lineTo(x!, y!);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Accuracy fill
    const accPts = series.map((p, i) => [xOf(i), yOfAcc(p.accuracy)]);
    ctx.beginPath();
    accPts.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x!, y!);
      else ctx.lineTo(x!, y!);
    });
    ctx.lineTo(xOf(n - 1), PAD.top + cH);
    ctx.lineTo(PAD.left, PAD.top + cH);
    ctx.closePath();
    ctx.fillStyle = `${accColor}18`;
    ctx.fill();

    // Lines
    drawLine(accPts, accColor);
    drawLine(
      series.map((p, i) => [xOf(i), yOfMis(p.mistakes)]),
      mistakesColor,
      true,
    );

    // Dots on hover point
    if (tooltip) {
      const p = tooltip.point;
      const idx = series.indexOf(p);
      if (idx >= 0) {
        [
          [xOf(idx), yOfAcc(p.accuracy), accColor],
          [xOf(idx), yOfMis(p.mistakes), mistakesColor],
        ].forEach(([x, y, c]) => {
          ctx.beginPath();
          ctx.arc(x as number, y as number, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = c as string;
          ctx.fill();
        });
      }
    }
  }, [series, tooltip]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || series.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const PAD_LEFT = 40;
    const PAD_RIGHT = 16;
    const cW = rect.width - PAD_LEFT - PAD_RIGHT;
    const ratio = (e.clientX - rect.left - PAD_LEFT) / cW;
    const idx = Math.max(
      0,
      Math.min(series.length - 1, Math.round(ratio * (series.length - 1))),
    );
    const point = series[idx]!;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, point });
  };

  if (series.length < 2) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border">
        <p className="text-muted-foreground text-sm">
          Need at least 2 attempts for a chart
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Progress Over Time
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 rounded-full bg-emerald-500" />{" "}
            Accuracy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-amber-500" />{" "}
            Mistakes
          </span>
        </div>
      </div>
      <div ref={containerRef} className="relative px-1 py-2">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: "140px", display: "block" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />
        {tooltip && (
          <div
            className="bg-popover pointer-events-none absolute z-10 rounded-lg border px-3 py-2 text-xs shadow-md"
            style={{
              left: Math.min(
                tooltip.x + 12,
                (containerRef.current?.offsetWidth ?? 300) - 140,
              ),
              top: Math.max(8, tooltip.y - 60),
            }}
          >
            <p className="text-muted-foreground mb-1">
              {format(new Date(tooltip.point.submittedAt), "MMM d, yyyy")}
            </p>
            <div className="space-y-0.5">
              <p>
                <span className="font-semibold text-emerald-500">Acc:</span>{" "}
                <span className="font-bold tabular-nums">
                  {tooltip.point.accuracy}%
                </span>
              </p>
              <p>
                <span className="font-semibold text-amber-500">Mistakes:</span>{" "}
                <span className="font-bold tabular-nums">
                  {tooltip.point.mistakes}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">WPM:</span>{" "}
                <span className="tabular-nums">{tooltip.point.wpm}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Test-Wise Table ──────────────────────────────────────────────────────────

function TestWiseTable({
  rows,
}: {
  rows: {
    testId: string;
    attempts: number;
    bestScore: number;
    avgScore: number;
    bestWpm: number;
    avgWpm: number;
    bestAccuracy: number;
    avgAccuracy: number;
  }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
          Per-Test Breakdown
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <div className="bg-muted/40 grid grid-cols-[minmax(0,1fr)_52px_80px_80px_76px_76px_72px_72px] gap-x-4 border-b px-4 py-2">
          {["Test", "#", "B.Score", "Avg", "B.WPM", "WPM", "B.Acc", "Acc"].map(
            (h, i) => (
              <span
                key={i}
                className={[
                  "text-muted-foreground text-[10px] font-semibold tracking-widest whitespace-nowrap uppercase",
                  i > 0 ? "text-right" : "",
                ].join(" ")}
              >
                {h}
              </span>
            ),
          )}
        </div>
        {rows.map((r, idx) => (
          <Link
            key={r.testId}
            href={`/admin/test/${r.testId}`}
            className={[
              "group hover:bg-muted/40 grid grid-cols-[minmax(0,1fr)_52px_80px_80px_76px_76px_72px_72px] items-center gap-x-4 px-4 py-2.5 transition-colors",
              idx !== rows.length - 1 ? "border-b" : "",
            ].join(" ")}
          >
            <span className="text-foreground/80 group-hover:text-primary truncate text-xs font-medium transition-colors">
              {r.testId}
            </span>
            <span className="text-muted-foreground text-right text-xs tabular-nums">
              {r.attempts}
            </span>
            <span className="text-right text-xs font-bold text-amber-500 tabular-nums">
              {Math.round(r.bestScore)}
            </span>
            <span className="text-right text-xs tabular-nums">
              {Number(r.avgScore).toFixed(1)}
            </span>
            <span className="text-right text-xs font-semibold text-blue-500 tabular-nums">
              {Math.round(r.bestWpm)}
            </span>
            <span className="text-muted-foreground text-right text-xs tabular-nums">
              {Number(r.avgWpm).toFixed(1)}
            </span>
            <span className="text-right text-xs font-semibold tabular-nums">
              <AccText v={Math.round(r.bestAccuracy)} />
            </span>
            <span className="text-right text-xs tabular-nums">
              <AccText v={Math.round(r.avgAccuracy)} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Paginated Attempts Table ─────────────────────────────────────────────────

function AttemptsTable({
  userId,
  mode,
  includePractice,
}: {
  userId?: string;
  mode: Mode;
  includePractice: boolean;
}) {
  const [page, setPage] = useState(0);
  const LIMIT = 15;

  // Reset to page 0 when filter changes
  // Reset page when includePractice changes
  const [prevInclude, setPrevInclude] = useState(includePractice);
  if (prevInclude !== includePractice) {
    setPrevInclude(includePractice);
    if (page !== 0) setPage(0);
  }

  const typeFilter = includePractice ? undefined : ("assessment" as const);

  const query =
    mode === "admin"
      ? trpc.user.getAttemptsPaginatedAdmin.useSuspenseQuery({
          userId: userId!,
          page,
          limit: LIMIT,
          type: typeFilter,
        })
      : trpc.user.getAttemptsPaginated.useSuspenseQuery({
          page,
          limit: LIMIT,
          type: typeFilter,
        });

  const [{ data, meta }] = query;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Attempts
          </span>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {meta.total} total
        </span>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border py-10">
          <p className="text-muted-foreground text-sm">No attempts yet</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border">
            <div className="bg-muted/40 grid grid-cols-[minmax(0,1fr)_88px_64px_56px_68px_52px_100px_24px] gap-x-4 border-b px-4 py-2">
              {[
                { h: "Test", right: false },
                { h: "Type", right: false },
                { h: "Score", right: true },
                { h: "WPM", right: true },
                { h: "Acc", right: true },
                { h: "Err", right: true },
                { h: "When", right: true },
                { h: "", right: false },
              ].map(({ h, right }, i) => (
                <span
                  key={i}
                  className={[
                    "text-muted-foreground text-[9px] font-semibold tracking-widest uppercase",
                    right ? "text-right" : "",
                  ].join(" ")}
                >
                  {h}
                </span>
              ))}
            </div>

            {data.map((row, idx) => (
              <div
                key={row.attemptId}
                className={[
                  "group hover:bg-muted/40 grid grid-cols-[minmax(0,1fr)_88px_64px_56px_68px_52px_100px_24px] items-center gap-x-4 px-4 py-2.5 transition-colors",
                  idx !== data.length - 1 ? "border-b" : "",
                ].join(" ")}
              >
                {/* Test */}
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={[
                      "shrink-0 rounded p-0.5",
                      row.test?.type === "legal"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-sky-500/10 text-sky-400",
                    ].join(" ")}
                  >
                    {row.test?.type === "legal" ? (
                      <Gavel className="h-2 w-2" />
                    ) : (
                      <FileText className="h-2 w-2" />
                    )}
                  </span>
                  <Link
                    href={`/admin/test/${row.test?.id}`}
                    className="hover:text-primary min-w-0 truncate text-xs transition-colors"
                  >
                    {row.test?.title ?? "—"}
                  </Link>
                </div>

                {/* Type */}
                <span
                  className={[
                    "inline-block rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase ring-1",
                    row.type === "assessment"
                      ? "bg-primary/10 text-primary ring-primary/20"
                      : "bg-muted text-muted-foreground ring-border",
                  ].join(" ")}
                >
                  {row.type === "assessment" ? "Assess" : "Practice"}
                </span>

                {/* Score */}
                <p className="text-right text-xs font-bold tabular-nums">
                  {row.result.score}
                </p>

                {/* WPM */}
                <p className="text-muted-foreground text-right text-xs tabular-nums">
                  {row.result.wpm}
                </p>

                {/* Accuracy */}
                <p className="text-right text-xs font-semibold tabular-nums">
                  <AccText v={row.result.accuracy} />
                </p>

                {/* Mistakes */}
                <p
                  className={[
                    "text-right text-xs tabular-nums",
                    row.result.mistakes === 0
                      ? "text-emerald-500"
                      : row.result.mistakes > 10
                        ? "text-destructive"
                        : "text-muted-foreground",
                  ].join(" ")}
                >
                  {row.result.mistakes}
                </p>

                {/* When */}
                <p className="text-muted-foreground text-right text-[10px] tabular-nums">
                  {formatDistanceToNow(new Date(row.result.submittedAt), {
                    addSuffix: true,
                  })}
                </p>

                {/* Link */}
                <div className="flex justify-end">
                  <Link href={`/user/attempt/${row.attemptId}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-0.5">
              <p className="text-muted-foreground text-xs tabular-nums">
                {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, meta.total)} of{" "}
                {meta.total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                {Array.from(
                  { length: Math.min(meta.totalPages, 5) },
                  (_, i) => {
                    const pg =
                      meta.totalPages <= 5
                        ? i
                        : Math.max(0, Math.min(page - 2, meta.totalPages - 5)) +
                          i;
                    return (
                      <Button
                        key={pg}
                        variant={pg === page ? "default" : "ghost"}
                        size="sm"
                        className="h-6 w-6 p-0 text-[11px]"
                        onClick={() => setPage(pg)}
                      >
                        {pg + 1}
                      </Button>
                    );
                  },
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={page + 1 >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Core View ────────────────────────────────────────────────────────────────

function ReportCardCore({ mode, userId }: { mode: Mode; userId?: string }) {
  const router = useRouter();
  const [includePractice, setIncludePractice] = useState(true);
  const typeFilter = includePractice ? undefined : ("assessment" as const);

  const [report] =
    mode === "admin"
      ? trpc.user.getReportAdmin.useSuspenseQuery({
          userId: userId!,
          type: typeFilter,
        })
      : trpc.user.getReport.useSuspenseQuery({ type: typeFilter });

  const [bests] =
    mode === "admin"
      ? trpc.user.getPersonalBestsAdmin.useSuspenseQuery({
          userId: userId!,
          type: typeFilter,
        })
      : trpc.user.getPersonalBests.useSuspenseQuery({ type: typeFilter });

  const [testWise] =
    mode === "admin"
      ? trpc.user.getTestWisePerformanceAdmin.useSuspenseQuery({
          userId: userId!,
          type: typeFilter,
        })
      : trpc.user.getTestWisePerformance.useSuspenseQuery({ type: typeFilter });

  const [series] =
    mode === "admin"
      ? trpc.user.getProgressSeriesAdmin.useSuspenseQuery({
          userId: userId!,
          type: typeFilter,
        })
      : trpc.user.getProgressSeries.useSuspenseQuery({ type: typeFilter });

  const totalAttempts = Number(report?.totalAttempts ?? 0);
  const avgAcc = Math.round(Number(report?.avgAccuracy ?? 0));
  const avgWpm = Math.round(Number(report?.avgWpm ?? 0));
  const avgScore = Number(report?.avgScore ?? 0).toFixed(1);
  const totalMistakes = Number(report?.totalMistakes ?? 0);

  return (
    <div className="w-full space-y-3 px-6 py-5">
      {/* Back (admin only) */}
      {mode === "admin" && (
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          {mode === "user" && <Star className="h-4 w-4 text-amber-500" />}
          {mode === "user" ? "My Report Card" : "Report Card"}
        </h1>
        {/* Practice toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="practice-toggle"
            checked={includePractice}
            onCheckedChange={setIncludePractice}
            className="scale-90"
          />
          <Label
            htmlFor="practice-toggle"
            className={[
              "cursor-pointer text-xs transition-colors select-none",
              includePractice ? "text-foreground" : "text-muted-foreground",
            ].join(" ")}
          >
            Include practice
          </Label>
        </div>
      </div>

      {/* KPI strip */}
      <KpiStrip
        items={[
          {
            label: "Attempts",
            value: totalAttempts,
            sub: "all time",
            icon: Activity,
            color: "text-violet-500",
          },
          {
            label: "Avg Acc",
            value: `${avgAcc}%`,
            sub: avgAcc >= 85 ? "Excellent" : avgAcc >= 70 ? "Good" : "Improve",
            icon: Target,
            color:
              avgAcc >= 85
                ? "text-emerald-500"
                : avgAcc >= 70
                  ? "text-amber-500"
                  : "text-destructive",
          },
          {
            label: "Avg WPM",
            value: avgWpm,
            sub: "words/min",
            icon: Gauge,
            color: "text-blue-500",
          },
          {
            label: "Avg Score",
            value: avgScore,
            icon: TrendingUp,
            color: "text-emerald-500",
          },
          {
            label: "Total Errors",
            value: totalMistakes,
            sub: `~${(totalMistakes / Math.max(totalAttempts, 1)).toFixed(1)}/attempt`,
            icon: AlertCircle,
            color: "text-amber-500",
          },
        ]}
      />

      {/* Personal bests */}
      {bests && (
        <div className="grid grid-cols-3 divide-x rounded-xl border">
          {[
            {
              label: "Best Score",
              value: Math.round(Number(bests.bestScore)),
              icon: Trophy,
              color: "text-amber-500",
            },
            {
              label: "Best WPM",
              value: Math.round(Number(bests.bestWpm)),
              icon: Gauge,
              color: "text-blue-500",
            },
            {
              label: "Best Acc",
              value: `${Math.round(Number(bests.bestAccuracy))}%`,
              icon: Target,
              color: "text-emerald-500",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="flex items-center justify-between px-3.5 py-2.5"
            >
              <div>
                <p className="text-muted-foreground text-[9px] font-semibold tracking-widest uppercase">
                  {label}
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums">
                  {value}
                </p>
              </div>
              <Icon className={`h-3 w-3 ${color}`} />
            </div>
          ))}
        </div>
      )}

      {/* Line chart */}
      <LineChart
        series={series.map((s) => ({
          ...s,
          submittedAt: new Date(s.submittedAt),
        }))}
      />

      <Separator />

      {/* Test-wise table */}
      <TestWiseTable
        rows={testWise.map((r) => ({
          testId: r.testId,
          attempts: Number(r.attempts),
          bestScore: Number(r.bestScore),
          avgScore: Number(r.avgScore),
          bestWpm: Number(r.bestWpm),
          avgWpm: Number(r.avgWpm),
          bestAccuracy: Number(r.bestAccuracy),
          avgAccuracy: Number(r.avgAccuracy),
        }))}
      />

      <Separator />

      {/* Attempts table — paginated */}
      <Suspense
        fallback={
          <div className="divide-y overflow-hidden rounded-xl border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2">
                <Skeleton className="h-3 flex-1" />
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-3 w-10" />
                ))}
              </div>
            ))}
          </div>
        }
      >
        <AttemptsTable
          userId={userId}
          mode={mode}
          includePractice={includePractice}
        />
      </Suspense>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="w-full space-y-3 px-6 py-5">
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-5 w-36" />

      {/* KPI */}
      <div className="grid grid-cols-5 divide-x rounded-xl border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5 px-4 py-3">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>

      {/* Bests */}
      <div className="grid grid-cols-3 divide-x rounded-xl border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5 px-4 py-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[200px] rounded-xl border" />

      <Separator />

      {/* Tables */}
      <div className="divide-y overflow-hidden rounded-xl border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2">
            <Skeleton className="h-3 flex-1" />
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-3 w-12" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function AdminReportCard({ userId }: { userId: string }) {
  trpc.user.getReportAdmin.useQuery({ userId }, { staleTime: 60_000 });
  trpc.user.getPersonalBestsAdmin.useQuery({ userId }, { staleTime: 60_000 });
  trpc.user.getTestWisePerformanceAdmin.useQuery(
    { userId },
    { staleTime: 60_000 },
  );
  trpc.user.getProgressSeriesAdmin.useQuery({ userId }, { staleTime: 60_000 });
  trpc.user.getAttemptsPaginatedAdmin.useQuery(
    { userId, page: 0, limit: 15 },
    { staleTime: 30_000 },
  );

  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportCardCore mode="admin" userId={userId} />
    </Suspense>
  );
}

export function UserReportCard() {
  trpc.user.getReport.useQuery(undefined, { staleTime: 60_000 });
  trpc.user.getPersonalBests.useQuery(undefined, { staleTime: 60_000 });
  trpc.user.getTestWisePerformance.useQuery(undefined, { staleTime: 60_000 });
  trpc.user.getProgressSeries.useQuery(undefined, { staleTime: 60_000 });
  trpc.user.getAttemptsPaginated.useQuery(
    { page: 0, limit: 15 },
    { staleTime: 30_000 },
  );

  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportCardCore mode="user" />
    </Suspense>
  );
}
