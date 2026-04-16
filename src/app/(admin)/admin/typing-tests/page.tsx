// app/admin/typing-tests/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { TypingTestList } from "./_components/typing-tests-list";

export const metadata: Metadata = { title: "Typing Tests — Admin" };

export default function TypingTestsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Typing Tests</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage typing test transcriptions here.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/typing-tests/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Test
          </Link>
        </Button>
      </div>
      <TypingTestList />
    </div>
  );
}
