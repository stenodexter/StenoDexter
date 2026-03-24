"use client";

// ─── app/admin/admissions/_components/screenshot-dialog.tsx ──────────────────

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ExternalLink } from "lucide-react";

interface ScreenshotDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  screenshotUrl: string;
  userName: string;
}

export function ScreenshotDialog({
  open,
  onOpenChange,
  screenshotUrl,
  userName,
}: ScreenshotDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Payment Screenshot — {userName}</span>
            <a
              href={screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-normal transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Open original
            </a>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center overflow-hidden rounded-xl border bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshotUrl}
            alt={`Payment screenshot for ${userName}`}
            className="max-h-[70vh] w-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
