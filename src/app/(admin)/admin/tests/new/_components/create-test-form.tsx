"use client";

// ─── app/admin/tests/create/_components/create-test-form.tsx ─────────────────

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { trpc } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Upload,
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
  GripVertical,
  Zap,
} from "lucide-react";

// ─── schemas ──────────────────────────────────────────────────────────────────

const speedSchema = z.object({
  wpm: z.number().int().min(1, "Required"),
  audioKey: z.string().min(1, "Upload audio"),
  dictationSeconds: z.number().int().min(1, "Min 1s"),
  breakSeconds: z.number().int().min(0),
  writtenDurationSeconds: z.number().int().min(1, "Min 1s"),
});

const formSchema = z.object({
  title: z.string().min(3, "Min 3 characters"),
  type: z.enum(["general", "legal", "special"]),
  matterPdfKey: z.string().min(1, "Upload matter PDF"),
  outlinePdfKey: z.string().optional(),
  correctAnswer: z.string().min(10, "Min 10 characters"),
  speeds: z.array(speedSchema).min(1, "Add at least one speed"),
});

type SpeedDraft = {
  id: string; // local only
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
  const m = Math.floor(s / 60),
    sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${s}s`;
}

function SectionHeader({
  num,
  title,
  description,
}: {
  num: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[11px] font-black tracking-widest">
        {num}
      </div>
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
    </div>
  );
}

function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-destructive mt-1 text-[11px]">{msg}</p>;
}

// ─── file dropzone (generic) ──────────────────────────────────────────────────

type DropzoneProps = {
  accept: string;
  label: string;
  hint: string;
  value: string;
  fileName: string;
  uploading: boolean;
  error?: string;
  onFile: (file: File) => void;
  onClear: () => void;
  icon: React.ReactNode;
  accentClass: string; // e.g. "border-violet-500/50 bg-violet-500/5"
};

function Dropzone({
  accept,
  label,
  hint,
  value,
  fileName,
  uploading,
  error,
  onFile,
  onClear,
  icon,
  accentClass,
}: DropzoneProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div className="space-y-1">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !uploading && ref.current?.click()}
        className={cn(
          "relative flex min-h-[88px] cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed px-5 py-4 transition-all",
          error ? "border-destructive/50 bg-destructive/5" : "",
          value
            ? cn("border-dashed", accentClass)
            : "border-border hover:border-primary/40 hover:bg-muted/30",
          uploading ? "pointer-events-none opacity-60" : "",
        )}
      >
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />

        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            value
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-muted text-muted-foreground",
          )}
        >
          {uploading ? (
            <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
          ) : value ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            icon
          )}
        </div>

        <div className="min-w-0 flex-1">
          {value ? (
            <>
              <p className="truncate text-sm font-medium text-emerald-600">
                {fileName || label}
              </p>
              <p className="text-muted-foreground text-xs">Click to replace</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                {uploading ? "Uploading…" : label}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">{hint}</p>
            </>
          )}
        </div>

        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-muted-foreground hover:text-foreground absolute top-2 right-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="text-destructive text-[11px]">{error}</p>}
    </div>
  );
}

// ─── timeline bar ─────────────────────────────────────────────────────────────

function Timeline({ d, b, t }: { d: number; b: number; t: number }) {
  const total = d + b + t || 1;
  return (
    <div className="space-y-1.5">
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
      <div className="text-muted-foreground flex gap-4 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Dict {fmtSec(d)}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Break {fmtSec(b)}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Write {fmtSec(t)}
        </span>
        <span className="text-foreground/70 ml-auto font-medium">
          Total {fmtSec(d + b + t)}
        </span>
      </div>
    </div>
  );
}

// ─── speed card ───────────────────────────────────────────────────────────────

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
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      audio.src = url;
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Math.ceil(audio.duration));
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });

  const handleAudio = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Audio files only");
      return;
    }
    onUpdate(speed.id, { uploading: true, audioFileName: file.name });
    try {
      const [duration, presigned] = await Promise.all([
        getAudioDuration(file),
        presign.mutateAsync({
          folder: "dictations",
          contentType: file.type,
          ext: file.name.split(".").pop() ?? "mp3",
        }),
      ]);
      const res = await fetch(presigned.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error("Upload failed");
      onUpdate(speed.id, {
        audioKey: presigned.key,
        dictationSeconds: duration > 0 ? duration : speed.dictationSeconds,
        uploading: false,
      });
      toast.success(`${fmtSec(duration)} detected`);
    } catch {
      toast.error("Audio upload failed");
      onUpdate(speed.id, { uploading: false });
    }
  };

  const u = (k: keyof SpeedDraft, v: SpeedDraft[keyof SpeedDraft]) =>
    onUpdate(speed.id, { [k]: v });

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      {/* Header */}
      <div
        className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors select-none"
        onClick={() => u("expanded", !speed.expanded)}
      >
        <GripVertical className="text-muted-foreground/40 h-4 w-4 shrink-0" />

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="bg-primary/10 flex h-6 w-6 shrink-0 items-center justify-center rounded">
            <Zap className="text-primary h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold">Speed {index + 1}</span>
          {speed.wpm > 0 && (
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
              {speed.wpm} WPM
            </span>
          )}
          {speed.audioKey && (
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
              Audio ✓
            </span>
          )}
          {speed.dictationSeconds > 0 && (
            <span className="text-muted-foreground text-[10px] tabular-nums">
              {fmtSec(
                speed.dictationSeconds +
                  speed.breakSeconds +
                  speed.writtenDurationSeconds,
              )}{" "}
              total
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(speed.id);
              }}
              className="text-muted-foreground hover:text-destructive p-1 transition-colors"
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
        <div className="space-y-4 border-t px-4 py-4">
          {/* WPM + Audio row */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                WPM
              </Label>
              <Input
                type="number"
                min={1}
                value={speed.wpm || ""}
                placeholder="e.g. 95"
                onChange={(e) => u("wpm", Number(e.target.value))}
                className="text-sm tabular-nums"
              />
              <p className="text-muted-foreground text-[10px]">
                Words per minute
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Audio file
              </Label>
              <div
                onClick={() => !speed.uploading && audioRef.current?.click()}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-all",
                  speed.audioKey
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/20",
                  speed.uploading && "pointer-events-none opacity-60",
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
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded",
                    speed.audioKey
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {speed.uploading ? (
                    <div className="border-primary h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" />
                  ) : speed.audioKey ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {speed.audioKey ? (
                    <>
                      <p className="truncate text-sm font-medium text-emerald-600">
                        {speed.audioFileName}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        Click to replace
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        {speed.uploading
                          ? "Uploading…"
                          : "Drop audio or click to upload"}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        MP3, WAV, MP4 audio
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
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Timing row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase">
                <Mic className="h-3 w-3 text-blue-500" />
                Dictation (sec)
              </Label>
              <Input
                type="number"
                min={1}
                value={speed.dictationSeconds || ""}
                onChange={(e) => u("dictationSeconds", Number(e.target.value))}
                className="text-sm tabular-nums"
                readOnly={!!speed.audioKey}
              />
              {speed.audioKey && (
                <p className="text-muted-foreground text-[10px]">
                  Auto-detected
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase">
                <PauseCircle className="h-3 w-3 text-amber-400" />
                Break (sec)
              </Label>
              <Input
                type="number"
                min={0}
                value={speed.breakSeconds}
                onChange={(e) => u("breakSeconds", Number(e.target.value))}
                className="text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase">
                <Keyboard className="h-3 w-3 text-emerald-500" />
                Writing (sec)
              </Label>
              <Input
                type="number"
                min={1}
                value={speed.writtenDurationSeconds || ""}
                onChange={(e) =>
                  u("writtenDurationSeconds", Number(e.target.value))
                }
                className="text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Timeline */}
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
        submitModeRef.current === "draft" ? "Saved as draft" : "Test launched!",
      );
      router.push("/admin/tests");
    },
    onError: (e) => toast.error(e.message),
  });

  const addSpeed = () =>
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
    ]);

  const updateSpeed = (id: string, patch: Partial<SpeedDraft>) =>
    setSpeeds((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const removeSpeed = (id: string) =>
    setSpeeds((p) => p.filter((s) => s.id !== id));

  const uploadPdf = async (
    file: File,
    folder: string,
    setUploading: (v: boolean) => void,
    setName: (v: string) => void,
    fieldSetter: (key: string) => void,
  ) => {
    if (file.type !== "application/pdf") {
      toast.error("PDF files only");
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
      fieldSetter(key);
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
      const speedsValid = speeds.every(
        (s) =>
          s.wpm > 0 &&
          s.audioKey &&
          s.dictationSeconds > 0 &&
          s.writtenDurationSeconds > 0,
      );
      if (!speedsValid) {
        toast.error("Complete all speed configurations");
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
        toast.error(parsed.error.errors[0]?.message ?? "Fix form errors");
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
      className="w-full space-y-0"
    >
      {/* ─── 01 Basics ─────────────────────────────────────────────────────── */}
      <div className="border-b px-8 py-8">
        <SectionHeader
          num="01"
          title="Test Details"
          description="Title and category for this assessment."
        />
        <div className="grid grid-cols-[1fr_240px] gap-6">
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                value.length < 3 ? "Min 3 characters" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  Title
                </Label>
                <Input
                  placeholder="e.g. Legal Dictation — Session 12"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="h-10 text-sm"
                />
                <FieldErr msg={(field.state.meta.errors as string[])[0]} />
              </div>
            )}
          </form.Field>

          <form.Field name="type">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  Category
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) =>
                    field.handleChange(v as typeof field.state.value)
                  }
                >
                  <SelectTrigger size={"sm"} className="h-10 text-sm">
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
      </div>

      {/* ─── 02 Speeds ─────────────────────────────────────────────────────── */}
      <div className="border-b px-8 py-8">
        <SectionHeader
          num="02"
          title="Speed Variants"
          description="Each speed has its own audio file, WPM rating, and timing. Users choose before starting."
        />

        <div className="space-y-3">
          {speeds.map((s, i) => (
            <SpeedCard
              key={s.id}
              speed={s}
              index={i}
              onUpdate={updateSpeed}
              onRemove={removeSpeed}
              canRemove={speeds.length > 1}
              presign={presign}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addSpeed}
          className="border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-muted/20 mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-3 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add another speed
        </button>
      </div>

      {/* ─── 03 Content ────────────────────────────────────────────────────── */}
      <div className="border-b px-8 py-8">
        <SectionHeader
          num="03"
          title="Test Content"
          description="Upload matter and outline PDFs. The correct answer is used for scoring."
        />

        <div className="mb-6 grid grid-cols-2 gap-6">
          {/* Matter PDF */}
          <form.Field name="matterPdfKey">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  Matter PDF <span className="text-destructive">*</span>
                </Label>
                <Dropzone
                  accept="application/pdf"
                  label="Upload matter PDF"
                  hint="The source material for this test"
                  value={field.state.value}
                  fileName={matterFileName}
                  uploading={matterUploading}
                  error={(field.state.meta.errors as unknown as string[])[0]}
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
                  icon={<FileText className="h-5 w-5" />}
                  accentClass="border-violet-500/40 bg-violet-500/5"
                />
              </div>
            )}
          </form.Field>

          {/* Outline PDF */}
          <form.Field name="outlinePdfKey">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  Outline PDF{" "}
                  <span className="text-muted-foreground/50 font-normal normal-case">
                    (optional)
                  </span>
                </Label>
                <Dropzone
                  accept="application/pdf"
                  label="Upload outline PDF"
                  hint="Shorthand notes or grader reference"
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
                  icon={<FilePlus className="h-5 w-5" />}
                  accentClass="border-blue-500/40 bg-blue-500/5"
                />
              </div>
            )}
          </form.Field>
        </div>

        {/* Correct Answer */}
        <form.Field
          name="correctAnswer"
          validators={{
            onChange: ({ value }) =>
              value.length < 10 ? "Min 10 characters" : undefined,
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  Correct Answer <span className="text-destructive">*</span>
                </Label>
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {field.state.value.length} chars
                </span>
              </div>
              <Textarea
                placeholder="Enter the exact correct transcription. This is used for automatic scoring against user submissions."
                rows={12}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="resize-none font-mono text-sm leading-relaxed"
              />
              <FieldErr msg={(field.state.meta.errors as string[])[0]} />
            </div>
          )}
        </form.Field>
      </div>

      {/* ─── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/tests")}
        >
          Cancel
        </Button>

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
                onMouseDown={() => {
                  submitModeRef.current = "draft";
                }}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Draft
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                onMouseDown={() => {
                  submitModeRef.current = "active";
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <Rocket className="mr-1.5 h-3.5 w-3.5" />
                {isSubmitting ? "Launching…" : "Launch Test"}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
