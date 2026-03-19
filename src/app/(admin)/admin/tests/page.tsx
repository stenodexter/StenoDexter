import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { TestList } from "./_components/tests-list";

export const metadata: Metadata = {
  title: "Tests — StenoDexter Admin",
};

export default function TestsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Tests</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage stenography assessments and dictation sessions.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs font-semibold"
        >
          <Link href="/admin/tests/new">
            <Plus className="h-3.5 w-3.5" />
            Create Test
          </Link>
        </Button>
      </div>

      <TestList />
    </div>
  );
}
