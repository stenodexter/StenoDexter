"use client";

// ─── app/admin/tests/create/_components/create-test-form.tsx ─────────────────

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { trpc } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
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
} from "lucide-react";

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
  speeds: z.array(speedSchema).min(1),
});

type SpeedDraft = {
  id: string;
  wpm: number;
  audioKey: string;
  audioFileName: string;
  dictationSeconds: number;
  breakSeconds: number;
  writtenDurationSeconds: number;
  uploading: boolean;
  expanded: boolean;
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
}: {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b px-8 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── small helpers ────────────────────────────────────────────────────────────

function Label({
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
}) {
  const ref = useRef<HTMLInputElement>(null);
  const doneCls =
    accent === "violet"
      ? "border-violet-400/50 bg-violet-500/5"
      : "border-blue-400/50 bg-blue-500/5";

  return (
    <div>
      <div
        onClick={() => !uploading && ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className={cn(
          "relative flex min-h-[90px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-4 text-center transition-all",
          value
            ? doneCls
            : "border-border hover:border-primary/50 hover:bg-muted/20",
          uploading && "pointer-events-none opacity-50",
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
}: {
  speed: SpeedDraft;
  index: number;
  onUpdate: (id: string, patch: Partial<SpeedDraft>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  presign: ReturnType<typeof trpc.store.generatePresignedUrl.useMutation>;
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

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border-2 transition-colors",
        isComplete ? "border-emerald-500/30" : "border-border",
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
          <p className="text-sm font-semibold">
            {speed.wpm > 0 ? `${speed.wpm} WPM` : `Speed ${index + 1}`}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {speed.audioKey
              ? `${speed.audioFileName} · ${fmtSec(speed.dictationSeconds + speed.breakSeconds + speed.writtenDurationSeconds)}`
              : "Upload audio to get started"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {canRemove && (
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
          {/* Audio */}
          <div>
            <Label>
              <Music2 className="h-3.5 w-3.5 text-blue-500" />
              Audio Recording
            </Label>
            <div
              onClick={() => !speed.uploading && audioRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) void handleAudio(f);
              }}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-all",
                speed.audioKey
                  ? "border-emerald-400/50 bg-emerald-500/5"
                  : "border-border hover:bg-muted/20 hover:border-blue-400/50",
                speed.uploading && "pointer-events-none opacity-50",
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
                      {speed.audioFileName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Click to replace
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
              {speed.audioKey && (
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
            <Label>Speed (WPM)</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                value={speed.wpm || ""}
                placeholder="e.g. 95"
                onChange={(e) => u("wpm", Number(e.target.value))}
                className="w-24"
              />
              <div className="flex flex-wrap gap-1.5">
                {WPM_PRESETS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => u("wpm", w)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                      speed.wpm === w
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground",
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
            <Label>
              <PauseCircle className="h-3.5 w-3.5 text-amber-400" />
              Timing
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
                  <Mic className="h-3 w-3 text-blue-500" />
                  {speed.audioKey && speed.dictationSeconds < 60
                    ? "Listening (sec)"
                    : "Listening (min)"}
                </p>
                <Input
                  type="number"
                  min={0}
                  step={speed.audioKey && speed.dictationSeconds < 60 ? 1 : 0.5}
                  value={
                    speed.dictationSeconds
                      ? speed.audioKey && speed.dictationSeconds < 60
                        ? speed.dictationSeconds
                        : +(speed.dictationSeconds / 60).toFixed(2)
                      : ""
                  }
                  readOnly={!!speed.audioKey}
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
                    speed.breakSeconds
                      ? +(speed.breakSeconds / 60).toFixed(2)
                      : ""
                  }
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

// ─── main form ────────────────────────────────────────────────────────────────

export function CreateTestForm() {
  const router = useRouter();
  const presign = trpc.store.generatePresignedUrl.useMutation();
  const submitModeRef = useRef<"draft" | "active">("draft");

  const [speeds, setSpeeds] = useState<SpeedDraft[]>([
    {
      id: uid(),
      wpm: 0,
      audioKey: "",
      audioFileName: "",
      dictationSeconds: 0,
      breakSeconds: 60,
      writtenDurationSeconds: 600,
      uploading: false,
      expanded: true,
    },
  ]);

  const [matterFileName, setMatterFileName] = useState("");
  const [outlineFileName, setOutlineFileName] = useState("");
  const [matterUploading, setMatterUploading] = useState(false);
  const [outlineUploading, setOutlineUploading] = useState(false);

  const createTest = trpc.test.create.useMutation({
    onSuccess: () => {
      toast.success(
        submitModeRef.current === "draft"
          ? "Saved as draft"
          : "Test is now live!",
      );
      router.push("/admin/tests");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateSpeed = (id: string, patch: Partial<SpeedDraft>) =>
    setSpeeds((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

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

  const form = useForm({
    defaultValues: {
      title: "",
      type: "general" as "general" | "legal" | "special",
      matterPdfKey: "",
      outlinePdfKey: "",
      correctAnswer: "",
    },
    onSubmit: async ({ value }) => {
      const speedsOk = speeds.every(
        (s) =>
          s.wpm > 0 &&
          s.audioKey &&
          s.dictationSeconds > 0 &&
          s.writtenDurationSeconds > 0,
      );
      if (!speedsOk) {
        toast.error("Please complete all speed configurations");
        return;
      }
      const parsed = formSchema.safeParse({
        ...value,
        speeds: speeds.map(
          ({
            wpm,
            audioKey,
            dictationSeconds,
            breakSeconds,
            writtenDurationSeconds,
          }) => ({
            wpm,
            audioKey,
            dictationSeconds,
            breakSeconds,
            writtenDurationSeconds,
          }),
        ),
      });
      if (!parsed.success) {
        toast.error(parsed.error.errors[0]?.message ?? "Please check the form");
        return;
      }
      await createTest.mutateAsync({
        ...parsed.data,
        status: submitModeRef.current,
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="w-full"
    >
      {/* ── 1. Details ──────────────────────────────────────────────────────── */}
      <Section
        step="1"
        title="Test Details"
        description="Give your test a name and choose its category."
      >
        <div className="grid grid-cols-[1fr_200px] gap-4">
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                value.length < 3 ? "Min 3 characters" : undefined,
            }}
          >
            {(field) => (
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Legal Dictation — Session 12"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <Err msg={(field.state.meta.errors as string[])[0]} />
              </div>
            )}
          </form.Field>

          <form.Field name="type">
            {(field) => (
              <div>
                <Label>Category</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) =>
                    field.handleChange(v as typeof field.state.value)
                  }
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
      </Section>

      {/* ── 2. Speeds ───────────────────────────────────────────────────────── */}
      <Section
        step="2"
        title="Speed Levels"
        description="Add one or more speed levels. Students pick one before starting."
      >
        <div className="space-y-3">
          {speeds.map((s, i) => (
            <SpeedCard
              key={s.id}
              speed={s}
              index={i}
              onUpdate={updateSpeed}
              onRemove={(id) => setSpeeds((p) => p.filter((x) => x.id !== id))}
              canRemove={speeds.length > 1}
              presign={presign}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setSpeeds((p) => [
              ...p,
              {
                id: uid(),
                wpm: 0,
                audioKey: "",
                audioFileName: "",
                dictationSeconds: 0,
                breakSeconds: 60,
                writtenDurationSeconds: 600,
                uploading: false,
                expanded: true,
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
        description="Upload the matter and outline PDFs, then type the correct answer."
      >
        <div className="mb-5 grid grid-cols-2 gap-4">
          <form.Field name="matterPdfKey">
            {(field) => (
              <div>
                <Label>
                  <FileText className="h-3.5 w-3.5" />
                  Matter PDF
                </Label>
                <PdfDropzone
                  label="Upload matter PDF"
                  hint="The source material students transcribe"
                  value={field.state.value}
                  fileName={matterFileName}
                  uploading={matterUploading}
                  error={field.state.meta.errors.at(0)}
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
                <Label optional>
                  <FilePlus className="h-3.5 w-3.5" />
                  Outline PDF
                </Label>
                <PdfDropzone
                  label="Upload outline PDF"
                  hint="Shorthand notes for graders"
                  value={field.state.value ?? ""}
                  fileName={outlineFileName}
                  uploading={outlineUploading}
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

        <form.Field
          name="correctAnswer"
          validators={{
            onChange: ({ value }) =>
              value.length < 10 ? "Min 10 characters" : undefined,
          }}
        >
          {(field) => (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label>Correct Answer</Label>
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
                className="resize-none font-calibri min-h-[200px] text-lg"
              />
              <Err msg={(field.state.meta.errors as string[])[0]} />
            </div>
          )}
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
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
                onMouseDown={() => {
                  submitModeRef.current = "draft";
                }}
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                onMouseDown={() => {
                  submitModeRef.current = "active";
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <Rocket className="mr-2 h-4 w-4" />
                {isSubmitting ? "Publishing…" : "Publish Test"}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
