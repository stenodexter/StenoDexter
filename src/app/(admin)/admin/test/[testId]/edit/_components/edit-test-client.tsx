"use client";

// ─── app/admin/test/[testId]/edit/_components/edit-test-form.tsx ──────────────

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState, useRef, Suspense } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { trpc } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Save,
  Rocket,
  Mic,
  PauseCircle,
  Keyboard,
  FileText,
  FilePlus,
  ChevronDown,
  ChevronUp,
  Music2,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { Switch } from "~/components/ui/switch";

// ─── schemas ──────────────────────────────────────────────────────────────────

const speedSchema = z.object({
  wpm: z.number().int().min(1),
  audioKey: z.string().min(1),
  dictationSeconds: z.number().int().min(1),
  breakSeconds: z.number().int().min(0),
  writtenDurationSeconds: z.number().int().min(1),
});

const formSchema = z.object({
  title: z.string().min(3),
  type: z.enum(["general", "legal", "special"]),
  matterPdfKey: z.string().min(1),
  outlinePdfKey: z.string().optional(),
  correctAnswer: z.string().min(10),
  solutionAudioKey: z.string().optional(),
  lockedCursor: z.boolean().default(false),
});

// ─── speed draft type ─────────────────────────────────────────────────────────

type SpeedDraft = {
  dbId: string | undefined;
  id: string;
  wpm: number;
  audioKey: string;
  audioFileName: string;
  dictationSeconds: number;
  breakSeconds: number;
  writtenDurationSeconds: number;
  uploading: boolean;
  expanded: boolean;
  markedForDeletion: boolean;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function fmtSec(s: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60),
    sec = s % 60;
  return m > 0 ? (sec > 0 ? `${m}m ${sec}s` : `${m}m`) : `${s}s`;
}

// ─── section wrapper ──────────────────────────────────────────────────────────

function Section({
  step,
  title,
  description,
  children,
  locked,
}: {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <div className={cn("border-b px-8 py-8", locked && "opacity-60")}>
      <div className="mb-6 flex items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            locked
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          {locked ? <Lock className="h-3.5 w-3.5" /> : step}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {locked && (
              <Badge variant="secondary" className="text-[10px]">
                Locked — test is active
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── micro-components ─────────────────────────────────────────────────────────

function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
      {children}
      {optional && (
        <span className="text-muted-foreground font-normal">(optional)</span>
      )}
    </p>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground mt-1 text-xs">{children}</p>;
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-destructive mt-1 text-xs">{msg}</p>;
}

// ─── PDF dropzone ─────────────────────────────────────────────────────────────

function PdfDropzone({
  label,
  hint,
  value,
  fileName,
  uploading,
  error,
  onFile,
  onClear,
  accent,
  disabled,
}: {
  label: string;
  hint: string;
  value: string;
  fileName: string;
  uploading: boolean;
  error?: string;
  onFile: (f: File) => void;
  onClear: () => void;
  accent: "violet" | "blue";
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const doneCls =
    accent === "violet"
      ? "border-violet-400/50 bg-violet-500/5"
      : "border-blue-400/50 bg-blue-500/5";

  return (
    <div>
      <div
        onClick={() => !uploading && !disabled && ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className={cn(
          "relative flex min-h-[90px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-4 text-center transition-all",
          value
            ? doneCls
            : "border-border hover:border-primary/50 hover:bg-muted/20",
          (uploading || disabled) && "pointer-events-none opacity-50",
        )}
      >
        <input
          ref={ref}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />

        {value ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {fileName}
            </p>
            <p className="text-muted-foreground text-xs">Click to replace</p>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="text-muted-foreground hover:text-foreground absolute top-2 right-2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : uploading ? (
          <>
            <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-sm">Uploading…</p>
          </>
        ) : (
          <>
            <FileText className="text-muted-foreground h-6 w-6" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-muted-foreground text-xs">{hint}</p>
          </>
        )}
      </div>
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </div>
  );
}

// ─── timeline ─────────────────────────────────────────────────────────────────

function Timeline({ d, b, t }: { d: number; b: number; t: number }) {
  const total = d + b + t || 1;
  return (
    <div className="bg-muted/40 space-y-1.5 rounded-lg p-3">
      <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${(d / total) * 100}%` }}
        />
        <div
          className="bg-amber-400 transition-all"
          style={{ width: `${(b / total) * 100}%` }}
        />
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${(t / total) * 100}%` }}
        />
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Listening {fmtSec(d)}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Break {fmtSec(b)}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Writing {fmtSec(t)}
        </span>
        <span className="text-foreground/70 ml-auto font-medium">
          Total {fmtSec(d + b + t)}
        </span>
      </div>
    </div>
  );
}

// ─── speed card ───────────────────────────────────────────────────────────────

const WPM_PRESETS = [80, 85, 90, 95, 100, 105, 110, 120];

function SpeedCard({
  speed,
  index,
  onUpdate,
  onRemove,
  canRemove,
  presign,
  locked,
}: {
  speed: SpeedDraft;
  index: number;
  onUpdate: (id: string, patch: Partial<SpeedDraft>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  presign: ReturnType<typeof trpc.store.generatePresignedUrl.useMutation>;
  locked: boolean;
}) {
  const audioRef = useRef<HTMLInputElement>(null);

  const getAudioDuration = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const a = new Audio();
      const url = URL.createObjectURL(file);
      a.src = url;
      a.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Math.ceil(a.duration));
      };
      a.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });

  const handleAudio = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Please upload an audio file");
      return;
    }
    onUpdate(speed.id, { uploading: true, audioFileName: file.name });
    try {
      const [duration, { uploadUrl, key }] = await Promise.all([
        getAudioDuration(file),
        presign.mutateAsync({
          folder: "dictations",
          contentType: file.type,
          ext: file.name.split(".").pop() ?? "mp3",
        }),
      ]);
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error();
      onUpdate(speed.id, {
        audioKey: key,
        dictationSeconds: duration > 0 ? duration : speed.dictationSeconds,
        uploading: false,
      });
      toast.success(
        duration > 0
          ? `Audio ready · ${fmtSec(duration)} detected`
          : "Audio uploaded",
      );
    } catch {
      toast.error("Audio upload failed");
      onUpdate(speed.id, { uploading: false });
    }
  };

  const u = (k: keyof SpeedDraft, v: SpeedDraft[keyof SpeedDraft]) =>
    onUpdate(speed.id, { [k]: v });

  const isComplete =
    speed.wpm > 0 &&
    !!speed.audioKey &&
    speed.dictationSeconds > 0 &&
    speed.writtenDurationSeconds > 0;

  const isExisting = !!speed.dbId;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 transition-colors",
        isComplete ? "border-emerald-500/30" : "border-border",
        locked && isExisting && "opacity-70",
      )}
    >
      {/* Header */}
      <div
        className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors"
        onClick={() => u("expanded", !speed.expanded)}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            isComplete
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">
              {speed.wpm > 0 ? `${speed.wpm} WPM` : `Speed ${index + 1}`}
            </p>
            {isExisting && (
              <Badge variant="secondary" className="text-[10px]">
                Existing
              </Badge>
            )}
            {!isExisting && (
              <Badge
                variant="outline"
                className="border-blue-400/50 text-[10px] text-blue-500"
              >
                New
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {speed.audioKey
              ? `${speed.audioFileName || "Audio uploaded"} · ${fmtSec(speed.dictationSeconds + speed.breakSeconds + speed.writtenDurationSeconds)}`
              : "Upload audio to get started"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {canRemove && !(locked && isExisting) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(speed.id);
              }}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {speed.expanded ? (
            <ChevronUp className="text-muted-foreground h-4 w-4" />
          ) : (
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          )}
        </div>
      </div>

      {/* Body */}
      {speed.expanded && (
        <div className="bg-muted/10 space-y-5 border-t px-5 py-5">
          {locked && isExisting && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/8 px-3 py-2.5">
              <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                This speed variant is locked. Existing speeds cannot be edited
                on an active test.
              </p>
            </div>
          )}

          {/* Audio */}
          <div>
            <FieldLabel>
              <Music2 className="h-3.5 w-3.5 text-blue-500" />
              Audio Recording
            </FieldLabel>
            <div
              onClick={() =>
                !speed.uploading &&
                !(locked && isExisting) &&
                audioRef.current?.click()
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (locked && isExisting) return;
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) void handleAudio(f);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-all",
                speed.audioKey
                  ? "border-emerald-400/50 bg-emerald-500/5"
                  : "border-border hover:bg-muted/20 hover:border-blue-400/50",
                (speed.uploading || (locked && isExisting)) &&
                  "pointer-events-none opacity-50",
              )}
            >
              <input
                ref={audioRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleAudio(f);
                }}
              />
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  speed.audioKey
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-blue-500/10 text-blue-500",
                )}
              >
                {speed.uploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                ) : speed.audioKey ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {speed.audioKey ? (
                  <>
                    <p className="truncate text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {speed.audioFileName || "Audio file uploaded"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {locked && isExisting ? "Locked" : "Click to replace"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      {speed.uploading
                        ? "Uploading…"
                        : "Click or drag audio here"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      MP3, WAV, MP4 · Duration detected automatically
                    </p>
                  </>
                )}
              </div>
              {speed.audioKey && !(locked && isExisting) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    u("audioKey", "");
                    u("audioFileName", "");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* WPM */}
          <div>
            <FieldLabel>Speed (WPM)</FieldLabel>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                value={speed.wpm || ""}
                placeholder="e.g. 95"
                onChange={(e) => u("wpm", Number(e.target.value))}
                className="w-24"
                disabled={locked && isExisting}
              />
              <div className="flex flex-wrap gap-1.5">
                {WPM_PRESETS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    disabled={locked && isExisting}
                    onClick={() => u("wpm", w)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                      speed.wpm === w
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                      locked && isExisting && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timing */}
          <div>
            <FieldLabel>
              <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
              Timing
            </FieldLabel>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
                  <Mic className="h-3 w-3 text-blue-500" />
                  Listening (min)
                </p>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={
                    speed.dictationSeconds
                      ? +(speed.dictationSeconds / 60).toFixed(2)
                      : ""
                  }
                  readOnly={!!speed.audioKey}
                  disabled={locked && isExisting}
                  onChange={(e) =>
                    u(
                      "dictationSeconds",
                      Math.round(Number(e.target.value) * 60),
                    )
                  }
                />
                {speed.audioKey && (
                  <Hint>Auto-filled · {fmtSec(speed.dictationSeconds)}</Hint>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
                  <PauseCircle className="h-3 w-3 text-amber-400" />
                  Break (min)
                </p>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={
                    speed.breakSeconds != null
                      ? +(speed.breakSeconds / 60).toFixed(2)
                      : ""
                  }
                  disabled={locked && isExisting}
                  onChange={(e) =>
                    u("breakSeconds", Math.round(Number(e.target.value) * 60))
                  }
                />
              </div>
              <div>
                <p className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
                  <Keyboard className="h-3 w-3 text-emerald-500" />
                  Writing (min)
                </p>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={
                    speed.writtenDurationSeconds
                      ? +(speed.writtenDurationSeconds / 60).toFixed(2)
                      : ""
                  }
                  disabled={locked && isExisting}
                  onChange={(e) =>
                    u(
                      "writtenDurationSeconds",
                      Math.round(Number(e.target.value) * 60),
                    )
                  }
                />
              </div>
            </div>
          </div>
          {speed.dictationSeconds +
            speed.breakSeconds +
            speed.writtenDurationSeconds >
            0 && (
            <Timeline
              d={speed.dictationSeconds}
              b={speed.breakSeconds}
              t={speed.writtenDurationSeconds}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── inner form ───────────────────────────────────────────────────────────────

function EditTestFormInner({ testId }: { testId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const presign = trpc.store.generatePresignedUrl.useMutation();

  // "save" = save as draft (no validation gate), "launch" = publish with full validation
  const submitModeRef = useRef<"save" | "launch">("save");

  const [testData] = trpc.test.get.useSuspenseQuery({ id: testId });

  const isActive = testData.status === "active";

  // ── speed state ───────────────────────────────────────────────────────────
  const [speeds, setSpeeds] = useState<SpeedDraft[]>(() =>
    (testData.speeds ?? []).map((s) => ({
      dbId: s.id,
      id: uid(),
      wpm: s.wpm,
      audioKey: s.audioKey,
      audioFileName: `${s.wpm}wpm-audio`,
      dictationSeconds: s.dictationSeconds,
      breakSeconds: s.breakSeconds,
      writtenDurationSeconds: s.writtenDurationSeconds,
      uploading: false,
      expanded: false,
      markedForDeletion: false,
    })),
  );

  // ── PDF state ─────────────────────────────────────────────────────────────
  const [matterFileName, setMatterFileName] = useState(
    testData.matterPdfKey ? "matter.pdf" : "",
  );
  const [outlineFileName, setOutlineFileName] = useState(
    testData.outlinePdfKey ? "outline.pdf" : "",
  );
  const [matterUploading, setMatterUploading] = useState(false);
  const [outlineUploading, setOutlineUploading] = useState(false);

  // ── solution audio state ──────────────────────────────────────────────────
  const [solutionAudioFileName, setSolutionAudioFileName] = useState(
    testData.solutionAudioKey ? "solution-audio" : "",
  );
  const [solutionAudioUploading, setSolutionAudioUploading] = useState(false);
  const solutionAudioRef = useRef<HTMLInputElement>(null);

  // ── mutations ─────────────────────────────────────────────────────────────
  const updateTest = trpc.test.update.useMutation({
    onSuccess: () => {
      void utils.test.get.invalidate({ id: testId });
      void utils.test.list.invalidate();
      toast.success(
        submitModeRef.current === "launch"
          ? "Test is now live!"
          : "Saved as draft.",
      );
      router.push("/admin/tests");
    },
    onError: (e) => toast.error(e.message),
  });

  const addSpeed = trpc.test.addSpeed.useMutation();
  const deleteSpeed = trpc.test.deleteSpeed.useMutation();

  // ── form ──────────────────────────────────────────────────────────────────
  const form = useForm({
    defaultValues: {
      title: testData.title,
      type: testData.type as "general" | "legal" | "special",
      matterPdfKey: testData.matterPdfKey ?? "",
      outlinePdfKey: testData.outlinePdfKey ?? "",
      correctAnswer: testData.correctAnswer ?? "",
      solutionAudioKey: testData.solutionAudioKey ?? "",
      lockedCursor: testData.lockedCursor ?? false,
    },
    onSubmit: async ({ value }) => {
      const activeSpeeds = speeds.filter((s) => !s.markedForDeletion);

      // ── Save as draft: bypass heavy validation ────────────────────────────
      if (submitModeRef.current === "save") {
        try {
          const toDelete = speeds.filter((s) => s.markedForDeletion && s.dbId);
          await Promise.all(
            toDelete.map((s) =>
              deleteSpeed.mutateAsync({ id: s.dbId!, testId }),
            ),
          );

          const toAdd = activeSpeeds.filter(
            (s) => !s.dbId && s.audioKey && s.wpm > 0,
          );
          await Promise.all(
            toAdd.map((s) =>
              addSpeed.mutateAsync({
                testId,
                wpm: s.wpm,
                audioKey: s.audioKey,
                dictationSeconds: s.dictationSeconds,
                breakSeconds: s.breakSeconds,
                writtenDurationSeconds: s.writtenDurationSeconds,
              }),
            ),
          );

          await updateTest.mutateAsync(
            isActive
              ? {
                  id: testId,
                  correctAnswer: value.correctAnswer || undefined,
                  solutionAudioKey: value.solutionAudioKey || undefined,
                }
              : {
                  id: testId,
                  title: value.title || undefined,
                  type: value.type,
                  matterPdfKey: value.matterPdfKey || undefined,
                  outlinePdfKey: value.outlinePdfKey || undefined,
                  correctAnswer: value.correctAnswer || undefined,
                  lockedCursor: value.lockedCursor,
                  solutionAudioKey: value.solutionAudioKey || undefined,
                },
          );
        } catch (e: any) {
          toast.error(e?.message ?? "Something went wrong");
        }
        return;
      }

      // ── Launch: full validation ───────────────────────────────────────────
      if (activeSpeeds.length === 0) {
        toast.error("At least one speed variant is required");
        return;
      }

      const hasIncomplete = activeSpeeds.some(
        (s) =>
          !s.dbId &&
          (s.wpm === 0 ||
            !s.audioKey ||
            s.dictationSeconds === 0 ||
            s.writtenDurationSeconds === 0),
      );
      if (hasIncomplete) {
        toast.error("Please complete all new speed configurations");
        return;
      }

      const parsed = formSchema.safeParse(value);
      if (!parsed.success) {
        toast.error(parsed.error.errors[0]?.message ?? "Please check the form");
        return;
      }

      try {
        const toDelete = speeds.filter((s) => s.markedForDeletion && s.dbId);
        await Promise.all(
          toDelete.map((s) => deleteSpeed.mutateAsync({ id: s.dbId!, testId })),
        );

        const toAdd = activeSpeeds.filter((s) => !s.dbId);
        await Promise.all(
          toAdd.map((s) =>
            addSpeed.mutateAsync({
              testId,
              wpm: s.wpm,
              audioKey: s.audioKey,
              dictationSeconds: s.dictationSeconds,
              breakSeconds: s.breakSeconds,
              writtenDurationSeconds: s.writtenDurationSeconds,
            }),
          ),
        );

        await updateTest.mutateAsync(
          isActive
            ? {
                id: testId,
                correctAnswer: parsed.data.correctAnswer,
                solutionAudioKey: parsed.data.solutionAudioKey || undefined,
              }
            : {
                id: testId,
                title: parsed.data.title,
                type: parsed.data.type,
                matterPdfKey: parsed.data.matterPdfKey,
                outlinePdfKey: parsed.data.outlinePdfKey || undefined,
                correctAnswer: parsed.data.correctAnswer,
                lockedCursor: parsed.data.lockedCursor,
                solutionAudioKey: parsed.data.solutionAudioKey || undefined,
                status: "active",
              },
        );
      } catch (e: any) {
        toast.error(e?.message ?? "Something went wrong");
      }
    },
  });

  // ── derived ───────────────────────────────────────────────────────────────
  const activeSpeeds = speeds.filter((s) => !s.markedForDeletion);

  const updateSpeed = (id: string, patch: Partial<SpeedDraft>) =>
    setSpeeds((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const removeSpeed = (id: string) => {
    setSpeeds((p) =>
      p
        .map((s) => {
          if (s.id !== id) return s;
          return { ...s, markedForDeletion: true };
        })
        .filter((s) => !(s.id === id && !s.dbId)),
    );
  };

  const uploadPdf = async (
    file: File,
    folder: string,
    setUploading: (v: boolean) => void,
    setName: (v: string) => void,
    onKey: (k: string) => void,
  ) => {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF");
      return;
    }
    setUploading(true);
    setName(file.name);
    try {
      const { uploadUrl, key } = await presign.mutateAsync({
        folder,
        contentType: "application/pdf",
        ext: "pdf",
      });
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      });
      if (!res.ok) throw new Error();
      onKey(key);
      toast.success("PDF uploaded");
    } catch {
      toast.error("PDF upload failed");
      setName("");
    } finally {
      setUploading(false);
    }
  };

  const isBusy =
    updateTest.isPending || addSpeed.isPending || deleteSpeed.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="w-full"
    >
      {/* Active test banner */}
      {isActive && (
        <div className="mx-8 mt-6 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/8 px-4 py-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              This test is live
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Only the <strong>correct answer</strong> and{" "}
              <strong>solution audio</strong> can be changed. Speed variants and
              test details are locked. You may add new speed variants.
            </p>
          </div>
        </div>
      )}

      {/* ── 1. Details ──────────────────────────────────────────────────────── */}
      <Section
        step="1"
        title="Test Details"
        description="Test name and category."
        locked={isActive}
      >
        <div className="grid grid-cols-[1fr_200px] gap-4">
          <form.Field
            name="title"
            validators={{
              onSubmit: ({ value }) =>
                submitModeRef.current === "launch" && value.length < 3
                  ? "Min 3 characters"
                  : undefined,
            }}
          >
            {(field) => (
              <div>
                <FieldLabel>Title</FieldLabel>
                <Input
                  placeholder="e.g. Legal Dictation — Session 12"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isActive}
                />
                <Err msg={(field.state.meta.errors as string[])[0]} />
              </div>
            )}
          </form.Field>

          <form.Field name="type">
            {(field) => (
              <div>
                <FieldLabel>Category</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(v) =>
                    field.handleChange(v as typeof field.state.value)
                  }
                  disabled={isActive}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
        </div>
        <form.Field name="lockedCursor">
          {(field) => (
            <div className="mt-4 flex items-center gap-3">
              <Switch
                id="lockedCursor"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                disabled={isActive}
                className="cursor-pointer"
              />
              <label htmlFor="lockedCursor" className="cursor-pointer text-sm">
                Lock cursor during dictation
              </label>
            </div>
          )}
        </form.Field>
      </Section>

      {/* ── 2. Speeds ───────────────────────────────────────────────────────── */}
      <Section
        step="2"
        title="Speed Levels"
        description={
          isActive
            ? "Existing speeds are locked. You may add new speed variants."
            : "Edit speed levels. Students pick one before starting."
        }
      >
        <div className="space-y-3">
          {activeSpeeds.map((s, i) => (
            <SpeedCard
              key={s.id}
              speed={s}
              index={i}
              onUpdate={updateSpeed}
              onRemove={removeSpeed}
              canRemove={activeSpeeds.length > 1}
              presign={presign}
              locked={isActive}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setSpeeds((p) => [
              ...p,
              {
                dbId: undefined,
                id: uid(),
                wpm: 0,
                audioKey: "",
                audioFileName: "",
                dictationSeconds: 0,
                breakSeconds: 60,
                writtenDurationSeconds: 600,
                uploading: false,
                expanded: true,
                markedForDeletion: false,
              },
            ])
          }
          className="border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-medium transition-all"
        >
          <Plus className="h-4 w-4" />
          Add another speed level
        </button>
      </Section>

      {/* ── 3. Materials ────────────────────────────────────────────────────── */}
      <Section
        step="3"
        title="Test Materials"
        description="PDFs and the correct answer transcription."
        locked={isActive}
      >
        <div className="mb-5 grid grid-cols-2 gap-4">
          <form.Field name="matterPdfKey">
            {(field) => (
              <div>
                <FieldLabel>
                  <FileText className="h-3.5 w-3.5" />
                  Matter PDF
                </FieldLabel>
                <PdfDropzone
                  label="Upload matter PDF"
                  hint="The source material students transcribe"
                  value={field.state.value}
                  fileName={matterFileName}
                  uploading={matterUploading}
                  error={field.state.meta.errors.at(0)}
                  disabled={isActive}
                  onFile={(f) =>
                    uploadPdf(
                      f,
                      "matters",
                      setMatterUploading,
                      setMatterFileName,
                      field.handleChange,
                    )
                  }
                  onClear={() => {
                    field.handleChange("");
                    setMatterFileName("");
                  }}
                  accent="violet"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="outlinePdfKey">
            {(field) => (
              <div>
                <FieldLabel optional>
                  <FilePlus className="h-3.5 w-3.5" />
                  Outline PDF
                </FieldLabel>
                <PdfDropzone
                  label="Upload outline PDF"
                  hint="Shorthand notes for graders"
                  value={field.state.value ?? ""}
                  fileName={outlineFileName}
                  uploading={outlineUploading}
                  disabled={isActive}
                  onFile={(f) =>
                    uploadPdf(
                      f,
                      "outlines",
                      setOutlineUploading,
                      setOutlineFileName,
                      (k) => field.handleChange(k),
                    )
                  }
                  onClear={() => {
                    field.handleChange("");
                    setOutlineFileName("");
                  }}
                  accent="blue"
                />
              </div>
            )}
          </form.Field>
        </div>

        {/* Correct answer — always editable */}
        <form.Field
          name="correctAnswer"
          validators={{
            onSubmit: ({ value }) =>
              submitModeRef.current === "launch" && value.length < 10
                ? "Min 10 characters"
                : undefined,
          }}
        >
          {(field) => (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <FieldLabel>
                  Correct Answer
                  {isActive && (
                    <Badge
                      variant="outline"
                      className="ml-1 border-emerald-400/50 text-[10px] text-emerald-600 dark:text-emerald-400"
                    >
                      Editable
                    </Badge>
                  )}
                </FieldLabel>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {field.state.value.length} chars
                </span>
              </div>
              <Textarea
                placeholder="Type the exact correct transcription here — student answers are scored against this."
                rows={12}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="min-h-[200px] resize-none font-[Calibri,_'Carlito',_'Liberation_Sans',_sans-serif] text-[17px]"
              />
              <Err msg={(field.state.meta.errors as string[])[0]} />
            </div>
          )}
        </form.Field>

        {/* Solution audio — always editable */}
        <form.Field name="solutionAudioKey">
          {(field) => {
            const handleSolutionAudio = async (file: File) => {
              if (!file.type.startsWith("audio/")) {
                toast.error("Please upload an audio file");
                return;
              }
              setSolutionAudioUploading(true);
              setSolutionAudioFileName(file.name);
              try {
                const { uploadUrl, key } = await presign.mutateAsync({
                  folder: "solutions",
                  contentType: file.type,
                  ext: file.name.split(".").pop() ?? "mp3",
                });
                const res = await fetch(uploadUrl, {
                  method: "PUT",
                  body: file,
                  headers: { "Content-Type": file.type },
                });
                if (!res.ok) throw new Error();
                field.handleChange(key);
                toast.success("Explanation audio uploaded");
              } catch {
                toast.error("Audio upload failed");
                setSolutionAudioFileName("");
              } finally {
                setSolutionAudioUploading(false);
              }
            };

            return (
              <div className="mt-5">
                <FieldLabel optional>
                  <Music2 className="h-3.5 w-3.5 text-violet-500" />
                  Explanation Audio
                  {isActive && (
                    <Badge
                      variant="outline"
                      className="ml-1 border-emerald-400/50 text-[10px] text-emerald-600 dark:text-emerald-400"
                    >
                      Editable
                    </Badge>
                  )}
                </FieldLabel>
                <Hint>
                  Audio walkthrough of the correct answer — played to students
                  after submission. Can be replaced at any time.
                </Hint>
                <div
                  onClick={() =>
                    !solutionAudioUploading && solutionAudioRef.current?.click()
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) void handleSolutionAudio(f);
                  }}
                  className={cn(
                    "mt-2 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-all",
                    field.state.value
                      ? "border-emerald-400/50 bg-emerald-500/5"
                      : "border-border hover:bg-muted/20 hover:border-violet-400/50",
                    solutionAudioUploading && "pointer-events-none opacity-50",
                  )}
                >
                  <input
                    ref={solutionAudioRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleSolutionAudio(f);
                    }}
                  />
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      field.state.value
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-violet-500/10 text-violet-500",
                    )}
                  >
                    {solutionAudioUploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                    ) : field.state.value ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {field.state.value ? (
                      <>
                        <p className="truncate text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          {solutionAudioFileName || "Audio uploaded"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Click to replace
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">
                          {solutionAudioUploading
                            ? "Uploading…"
                            : "Click or drag audio here"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          MP3, WAV, MP4 · Played back after student submits
                        </p>
                      </>
                    )}
                  </div>
                  {field.state.value && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        field.handleChange("");
                        setSolutionAudioFileName("");
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          }}
        </form.Field>
      </Section>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t px-8 py-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/tests")}
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          {/* CTA 1 — Save as Draft (no validation, always visible unless active) */}
          {!isActive && (
            <Button
              type="submit"
              variant="outline"
              disabled={isBusy}
              onMouseDown={() => {
                submitModeRef.current = "save";
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateTest.isPending && submitModeRef.current === "save"
                ? "Saving…"
                : "Save as Draft"}
            </Button>
          )}

          {/* Active test: single save button (draft concept doesn't apply) */}
          {isActive && (
            <Button
              type="submit"
              variant="outline"
              disabled={isBusy}
              onMouseDown={() => {
                submitModeRef.current = "save";
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {isBusy ? "Saving…" : "Save Changes"}
            </Button>
          )}

          {/* CTA 2 — Launch (full validation, only for draft tests) */}
          {!isActive && (
            <Button
              type="submit"
              disabled={isBusy}
              onMouseDown={() => {
                submitModeRef.current = "launch";
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Rocket className="mr-2 h-4 w-4" />
              {updateTest.isPending && submitModeRef.current === "launch"
                ? "Uploading..."
                : "Upload Test"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-0 divide-y">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4 px-8 py-8">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-64" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ─── export ───────────────────────────────────────────────────────────────────

export default function EditTestClient({ testId }: { testId: string }) {
  const router = useRouter();
  trpc.test.get.useQuery({ id: testId }, { staleTime: 60_000 });

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Header */}
      <div className="border-b px-8 py-6">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h1 className="text-xl font-semibold tracking-tight">Edit Test</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Update test details, speed variants, and materials.
        </p>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <EditTestFormInner testId={testId} />
      </Suspense>
    </div>
  );
}
