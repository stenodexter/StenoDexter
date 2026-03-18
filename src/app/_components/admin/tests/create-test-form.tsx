"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import {
  Upload,
  Clock,
  FileAudio,
  BookOpen,
  Mic,
  PauseCircle,
  Keyboard,
  CheckCircle2,
  Save,
  Rocket,
  Info,
  X,
} from "lucide-react";
import { trpc } from "~/trpc/react";

// ── Schema ──────────────────────────────────────────────────────────────────

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  tag: z.enum(["general", "legal"]),
  dictationDuration: z.number().min(1),
  breakAfterAudio: z.number().min(0),
  typingDuration: z.number().min(1),
  audioUrl: z.string().url("Please upload an audio file"),
  matter: z.string().min(10, "Correct answer must be at least 10 characters"),
  outlines: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ── Timeline bar ─────────────────────────────────────────────────────────────

function TimelineBar({
  dictation,
  pause,
  typing,
}: {
  dictation: number;
  pause: number;
  typing: number;
}) {
  const total = dictation + pause + typing || 1;
  const dictPct = (dictation / total) * 100;
  const pausePct = (pause / total) * 100;
  const typePct = (typing / total) * 100;

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>Timeline Preview</span>
        <span>Total: {total}m</span>
      </div>
      <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
        <div
          className="bg-blue-500 transition-all duration-300"
          style={{ width: `${dictPct}%` }}
        />
        <div
          className="bg-amber-400 transition-all duration-300"
          style={{ width: `${pausePct}%` }}
        />
        <div
          className="bg-emerald-500 transition-all duration-300"
          style={{ width: `${typePct}%` }}
        />
      </div>
      <div className="text-muted-foreground flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          Dictation ({dictation}m)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          Break ({pause}m)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Typing ({typing}m)
        </span>
      </div>
    </div>
  );
}

// ── Audio Dropzone ────────────────────────────────────────────────────────────
function AudioDropzone({
  value,
  onChange,
  onDurationDetected,
  error,
}: {
  value: string;
  onChange: (url: string) => void;
  onDurationDetected: (minutes: number) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const generatePresignedUrl = trpc.store.generatePresignedUrl.useMutation();

  const getAudioDurationMinutes = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      audio.src = url;
      audio.addEventListener("loadedmetadata", () => {
        URL.revokeObjectURL(url);
        resolve(Math.ceil(audio.duration / 60));
      });
      audio.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
    });

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Only audio files are supported.");
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      // 1. Detect duration before upload
      const durationMinutes = await getAudioDurationMinutes(file);

      // 2. Get presigned URL
      const ext = file.name.split(".").pop() ?? "mp3";
      const { uploadUrl, fileUrl } = await generatePresignedUrl.mutateAsync({
        folder: "audio",
        contentType: file.type,
        ext,
      });

      // 3. Upload directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      // 4. Commit values
      onChange(fileUrl);
      if (durationMinutes > 0) {
        onDurationDetected(durationMinutes);
        toast.success(`Audio uploaded · ${durationMinutes}m detected`);
      } else {
        toast.success("Audio uploaded successfully.");
      }
    } catch {
      toast.error("Upload failed. Please try again.");
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="space-y-1.5">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors ${error ? "border-destructive/60 bg-destructive/5" : "border-border hover:border-primary/50 hover:bg-muted/40"} ${uploading ? "pointer-events-none opacity-70" : ""} ${value ? "border-emerald-500/50 bg-emerald-500/5" : ""} `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        {value ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-emerald-600">
                {fileName ?? "Audio uploaded"}
              </p>
              <p className="text-muted-foreground text-xs">Click to replace</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setFileName(null);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              {uploading ? (
                <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
              ) : (
                <Upload className="text-muted-foreground h-5 w-5" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {uploading ? "Uploading…" : "Drag & drop your audio file here"}
              </p>
              {!uploading && (
                <p className="text-muted-foreground text-xs">
                  or{" "}
                  <span className="text-primary underline underline-offset-2">
                    click to browse
                  </span>
                </p>
              )}
              <p className="text-muted-foreground mt-1 text-[11px]">
                Supported: MP3, WAV, MP4 (audio only)
              </p>
            </div>
          </>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

// ── Field Error ───────────────────────────────────────────────────────────────

function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return <p className="text-destructive mt-1 text-xs">{errors[0]}</p>;
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export function CreateTestForm() {
  const router = useRouter();
  const [submitMode, setSubmitMode] = useState<"draft" | "launch">("draft");

  //   const createTest = trpc.admin.test.create.useMutation({
  //     onSuccess: () => {
  //       toast.success(
  //         submitMode === "draft"
  //           ? "Test saved as draft."
  //           : "Test launched successfully!",
  //       );
  //       router.push("/admin/tests");
  //     },
  //     onError: (err) => toast.error(err.message),
  //   });

  const form = useForm({
    defaultValues: {
      title: "",
      tag: "general",
      dictationDuration: 0,
      breakAfterAudio: 1,
      typingDuration: 10,
      audioUrl: "",
      matter: "",
      outlines: "",
    },
    onSubmit: async ({ value }) => {
      const parsed = formSchema.safeParse(value);
      if (!parsed.success) {
        toast.error("Please fix the errors before submitting.");
        return;
      }
      //   await createTest.mutateAsync({ ...parsed.data, status: submitMode });
    },
  });

  return (
    <TooltipProvider>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="space-y-5"
      >
        {/* ── 1. Basics ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="text-primary h-4 w-4" />
              Test Details
            </CardTitle>
            <CardDescription>
              Basic information about this assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <form.Field
              name="title"
              validators={{
                onChange: ({ value }) =>
                  !value || value.length < 3 ? "Min 3 characters" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="title">Test Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Legal Dictation – Session 4"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldError errors={field.state.meta.errors as string[]} />
                </div>
              )}
            </form.Field>

            {/* Tag */}
            <form.Field name="tag">
              {(field) => (
                <div className="space-y-1.5">
                  <Label>
                    Category
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="text-muted-foreground ml-1.5 inline h-3.5 w-3.5" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Used to organise and filter tests by domain.
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) =>
                      field.handleChange(v as "general" | "legal")
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">
                        <span className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            General
                          </Badge>
                          General Purpose
                        </span>
                      </SelectItem>
                      <SelectItem value="legal">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            Legal
                          </Badge>
                          Legal Domain
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </CardContent>
        </Card>

        {/* ── 2. Audio ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileAudio className="text-primary h-4 w-4" />
              Audio File
            </CardTitle>
            <CardDescription>
              Upload the dictation audio for this test.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.Field
              name="audioUrl"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Audio file is required" : undefined,
              }}
            >
              {(field) => (
                <AudioDropzone
                  value={field.state.value}
                  onChange={field.handleChange}
                  onDurationDetected={(minutes) =>
                    form.setFieldValue("dictationDuration", minutes)
                  }
                  error={(field.state.meta.errors as string[])[0]}
                />
              )}
            </form.Field>
          </CardContent>
        </Card>

        {/* ── 3. Timing ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="text-primary h-4 w-4" />
              Test Timing
            </CardTitle>
            <CardDescription>
              Three-phase timing: dictation → break → typing window.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {/* Dictation */}
              <form.Field
                name="dictationDuration"
                validators={{
                  onChange: ({ value }) =>
                    value < 1 ? "Min 1 minute" : undefined,
                }}
              >
                {(field) => (
                  <form.Subscribe selector={(s) => s.values.audioUrl}>
                    {(audioUrl) => (
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          <Mic className="h-3.5 w-3.5 text-blue-500" />
                          Dictation (min)
                          {audioUrl && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="text-muted-foreground h-3 w-3" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Auto-detected from audio. Remove the file to
                                edit manually.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(Number(e.target.value))
                          }
                          onBlur={field.handleBlur}
                          readOnly
                          disabled
                          className={
                            audioUrl ? "cursor-not-allowed opacity-60" : ""
                          }
                        />
                        <p className="text-muted-foreground text-[11px]">
                          {audioUrl
                            ? "Auto-detected from audio"
                            : "Audio playback time"}
                        </p>
                        <FieldError
                          errors={field.state.meta.errors as string[]}
                        />
                      </div>
                    )}
                  </form.Subscribe>
                )}
              </form.Field>

              {/* Break */}
              <form.Field name="breakAfterAudio">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
                      Break (min)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      onBlur={field.handleBlur}
                    />
                    <p className="text-muted-foreground text-[11px]">
                      Pause before typing
                    </p>
                  </div>
                )}
              </form.Field>

              {/* Typing */}
              <form.Field
                name="typingDuration"
                validators={{
                  onChange: ({ value }) =>
                    value < 1 ? "Min 1 minute" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Keyboard className="h-3.5 w-3.5 text-emerald-500" />
                      Typing (min)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      onBlur={field.handleBlur}
                    />
                    <p className="text-muted-foreground text-[11px]">
                      Transcription window
                    </p>
                    <FieldError errors={field.state.meta.errors as string[]} />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Live timeline bar */}
            <form.Subscribe
              selector={(s) => [
                s.values.dictationDuration,
                s.values.breakAfterAudio,
                s.values.typingDuration,
              ]}
            >
              {([d, b, t]) => (
                <TimelineBar
                  dictation={Number(d)}
                  pause={Number(b)}
                  typing={Number(t)}
                />
              )}
            </form.Subscribe>
          </CardContent>
        </Card>

        {/* ── 4. Content tabs ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="text-primary h-4 w-4" />
              Test Content
            </CardTitle>
            <CardDescription>
              Provide the matter (correct transcription) and optional outlines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="matter">
              <TabsList className="mb-4">
                <TabsTrigger value="matter">
                  Matter / Correct Answer
                </TabsTrigger>
                <TabsTrigger value="outlines">Outlines</TabsTrigger>
              </TabsList>

              <TabsContent value="matter">
                <form.Field
                  name="matter"
                  validators={{
                    onChange: ({ value }) =>
                      !value || value.length < 10
                        ? "Min 10 characters"
                        : undefined,
                  }}
                >
                  {(field) => (
                    <div className="space-y-1.5">
                      <Textarea
                        placeholder="Enter the exact correct transcription that candidates should produce…"
                        rows={15}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="resize-none font-mono text-sm"
                      />
                      <div className="flex items-center justify-between">
                        <FieldError
                          errors={field.state.meta.errors as string[]}
                        />
                        <span className="text-muted-foreground ml-auto text-xs">
                          {field.state.value.length} characters
                        </span>
                      </div>
                    </div>
                  )}
                </form.Field>
              </TabsContent>

              <TabsContent value="outlines">
                <form.Field name="outlines">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Textarea
                        placeholder="Optional shorthand outlines, notes, or hints for graders…"
                        rows={15}
                        value={field.state.value ?? ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="resize-none font-mono text-sm"
                      />
                      <p className="text-muted-foreground text-[11px]">
                        Shorthand outlines or grader notes (optional).
                      </p>
                    </div>
                  )}
                </form.Field>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* ── Actions ── */}
        <Separator />
        <div className="flex items-center justify-end gap-3 pb-8">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/tests")}
          >
            Cancel
          </Button>

          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setSubmitMode("draft")}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => setSubmitMode("launch")}
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  {isSubmitting && submitMode === "launch"
                    ? "Launching…"
                    : "Launch Test"}
                </Button>
              </>
            )}
          </form.Subscribe>
        </div>
      </form>
    </TooltipProvider>
  );
}
