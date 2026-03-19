
import { RecentActivity } from "~/components/common/user/tests/activity";
import { ScoreChart } from "~/components/common/user/tests/score-chart";
import { TestFeed } from "~/components/common/user/tests/test-feed";
import { Separator } from "~/components/ui/separator";

export default function UserDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your progress and attempt tests
          </p>
        </div>

        {/* ── Section 1: Chart + Recent Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-72">
          {/* Score Chart — 2/3 width */}
          <div className="lg:col-span-2 h-72 lg:h-full">
            <ScoreChart />
          </div>

          {/* Recent Activity — 1/3 width, 2 stacked cards */}
          <div className="h-72 lg:h-full">
            <RecentActivity />
          </div>
        </div>

        <Separator />

        {/* ── Section 2: Test Feed ── */}
        <div className="space-y-4">
          <div className="my-3 mb-6">
            <h4 className="font-semibold ">
              Available Tests
            </h4>
            <p className="text-muted-foreground text-xs mt-0.5">
              Assessment tests can only be attempted once. Practice as many
              times as you like.
            </p>
          </div>

          <TestFeed />
        </div>
      </div>
    </div>
  );
}