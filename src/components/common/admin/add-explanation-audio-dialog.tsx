"use client";

// ─── app/admin/tests/_components/solution-audio-dialog.tsx ───────────────────

import { useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { CheckCircle2, FileAudio, Mic, Upload, X } from "lucide-react";

interface SolutionAudioDialogProps {
  testId: string;
  onSuccess?: () => void;
  existingAudioUrl?: string | null;
  buttonSize?: "xs" | "lg" | "default" | "sm";
}

type UploadState = "idle" | "uploading" | "saving" | "error";

export function SolutionAudioDialog({
  testId,
  onSuccess,
  existingAudioUrl,
  buttonSize = "sm",
}: SolutionAudioDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const presign = trpc.store.generatePresignedUrl.useMutation();
  const saveAudio = trpc.test.uploadExplanationAudioForTest.useMutation({
    onSuccess: () => {
      toast.success("Explanations audio saved!");
      onSuccess?.();
      handleClose();
    },
    onError: (e) => {
      toast.error(e.message);
      setUploadState("error");
    },
  });

  const isLoading = uploadState === "uploading" || uploadState === "saving";

  function handleClose() {
    if (isLoading) return;
    setOpen(false);
    setTimeout(() => {
      setFile(null);
      setUploadState("idle");
    }, 200);
  }

  function acceptFile(f: File) {
    const validMimeTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/x-m4a",
    ];

    const validExtensions = ["mp3", "wav", "mpeg", "mpg", "m4a", "mp4"];

    const ext = f.name.split(".").pop()?.toLowerCase();

    if (
      !f.type.startsWith("audio/") &&
      !validMimeTypes.includes(f.type) &&
      !validExtensions.includes(ext || "")
    ) {
      toast.error("Please select a valid audio file (MP3, WAV, MPEG, M4A…)");
      return;
    }

    setFile(f);
    setUploadState("idle");
  }

  async function handleUpload() {
    if (!file) return;

    try {
      // 1. Get presigned URL
      setUploadState("uploading");
      const { uploadUrl, key } = await presign.mutateAsync({
        folder: "explanations",
        contentType: file.type,
        ext: file.name.split(".").pop() ?? "mp3",
      });

      // 2. PUT directly to R2
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error("Upload to storage failed");

      // 3. Save the key via the dedicated procedure
      setUploadState("saving");
      await saveAudio.mutateAsync({ testId, audioKey: key });
    } catch {
      toast.error("Upload failed — please try again");
      setUploadState("error");
    }
  }

  const dropzoneCls = cn(
    "relative flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-6 text-center transition-all duration-200",
    dragOver && "border-violet-400/70 bg-violet-500/5 scale-[1.01]",
    !dragOver &&
      !file &&
      "border-border hover:border-violet-400/50 hover:bg-muted/20",
    file && uploadState !== "error" && "border-emerald-400/50 bg-emerald-500/5",
    uploadState === "error" && "border-destructive/40 bg-destructive/5",
    isLoading && "pointer-events-none opacity-60",
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? setOpen(true) : handleClose())}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={buttonSize}
          className="ml-auto border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-500"
        >
          <FileAudio className="h-3.5 w-3.5" />
          {existingAudioUrl
            ? "Replace explanation audio"
            : "Add explanation audio"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileAudio className="h-4 w-4 text-violet-500" />
            {existingAudioUrl
              ? "Replace Explanation Audio"
              : "Upload Explanation Audio"}
          </DialogTitle>
          <DialogDescription>
            This audio walkthrough plays for students after they submit. MP3,
            WAV, and MP4 are supported.
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone */}
        <div
          className={dropzoneCls}
          onClick={() => !isLoading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) acceptFile(f);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.mpeg,.mpg,.m4a,.mp4,audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) acceptFile(f);
              e.target.value = "";
            }}
          />

          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
              file && uploadState !== "error"
                ? "bg-emerald-500/15 text-emerald-600"
                : uploadState === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-violet-500/10 text-violet-500",
            )}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            ) : file && uploadState !== "error" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </div>

          {file ? (
            <div className="w-full">
              <p className="truncate px-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {file.name.length > 45
                  ? file.name.slice(0, 45) + "..."
                  : file.name}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {(file.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                {uploadState === "uploading"
                  ? "Uploading to storage…"
                  : uploadState === "saving"
                    ? "Saving…"
                    : "Click to change file"}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">
                {dragOver ? "Drop to select" : "Click or drag audio here"}
              </p>
              <p className="text-muted-foreground text-xs">
                MP3, WAV, MP4 — any audio format works
              </p>
            </>
          )}

          {file && !isLoading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setUploadState("idle");
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-2.5 right-2.5 rounded-md p-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {existingAudioUrl && !file && (
          <p className="text-muted-foreground text-center text-xs">
            An explanation audio is already attached. Uploading will replace it.
          </p>
        )}

        {uploadState === "error" && (
          <p className="text-destructive text-center text-xs">
            Something went wrong. Please try again.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="bg-violet-600 text-white hover:bg-violet-500"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {uploadState === "saving" ? "Saving…" : "Uploading…"}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-3.5 w-3.5" />
                Upload & Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
