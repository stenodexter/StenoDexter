// components/common/typing-test/marks-calculation-dialog.tsx
"use client";

import { BookOpen } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

// ─── main dialog ──────────────────────────────────────────────────────────────

export function MarksCalculationDialog({ dphTarget = 8000, maxMarks = 50 }) {
  const steps = [
    {
      label: "Right strokes",
      formula: "Total strokes − error strokes",
      eg: `1092 − 33 = 1059`,
    },
    {
      label: "Strokes per minute",
      formula: "Right strokes ÷ duration (min)",
      eg: `1059 ÷ 5 = 211.80`,
    },
    {
      label: "Net DPH",
      formula: "Strokes/min × 60",
      eg: `211.80 × 60 = 12,708`,
    },
    {
      label: `Marks out of ${maxMarks}`,
      formula: `(${maxMarks} ÷ ${dphTarget.toLocaleString()}) × Net DPH`,
      eg: `...= 79.43 → capped at ${maxMarks}`,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 gap-1.5 text-xs"
        >
          <BookOpen className="h-3 w-3" /> How marks are calculated
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            How marks are calculated
          </DialogTitle>
        </DialogHeader>
        <div className="divide-border divide-y">
          {steps.map(({ label, formula, eg }, i) => (
            <div key={i} className="flex gap-3 py-3">
              <span className="text-muted-foreground mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]">
                {i + 1}
              </span>
              <div>
                <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                  {label}
                </p>
                <p className="font-mono text-sm">{formula}</p>
                <p className="text-muted-foreground text-xs">{eg}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="bg-muted/40 text-muted-foreground rounded-md px-3 py-2 text-xs">
          <span className="text-foreground font-medium">
            {dphTarget.toLocaleString()} DPH
          </span>{" "}
          required for full{" "}
          <span className="text-foreground font-medium">{maxMarks} marks</span>.
          Score is capped at {maxMarks}.
        </p>
      </DialogContent>
    </Dialog>
  );
}
