import { Card, CardContent } from "~/components/ui/card";
import { Clock, FileText } from "lucide-react";

const recentActivity = [
  {
    id: "1",
    title: "Legal Dictation — Contract Law",
    type: "legal" as const,
    score: 88,
    attemptType: "real" as const,
    completedAt: "2h ago",
    duration: "22m",
  },
  {
    id: "2",
    title: "General Dictation — News Passage",
    type: "general" as const,
    score: 74,
    attemptType: "practice" as const,
    completedAt: "6h ago",
    duration: "15m",
  },
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85
      ? "text-emerald-500 bg-emerald-500/10"
      : score >= 60
        ? "text-amber-500 bg-amber-500/10"
        : "text-red-400 bg-red-400/10";

  return (
    <span className={`text-sm font-semibold px-2 py-0.5 rounded-md ${color}`}>
      {score}
    </span>
  );
}

export function RecentActivity() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium">
        Last 24 hours
      </p>

      {recentActivity.length === 0 ? (
        <Card className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No activity yet</p>
        </Card>
      ) : (
        recentActivity.map((item) => (
          <Card key={item.id} className="flex-1">
            <CardContent className="p-4 h-full flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="bg-muted rounded-md p-1.5 shrink-0">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium leading-tight truncate">
                    {item.title}
                  </p>
                </div>
                <ScoreBadge score={item.score} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs capitalize bg-muted px-2 py-0.5 rounded">
                    {item.type}
                  </span>
                  <span className="text-muted-foreground text-xs capitalize">
                    {item.attemptType === "real" ? "Assessment" : "Practice"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">{item.completedAt}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}