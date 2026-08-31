// app/admin/typing-tests/page.tsx
import type { Metadata } from "next";
import { TypingTestList } from "./_components/typing-tests-list";
import { CreateTypingTestButton } from "./_components/create-typing-test-button";

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
        <CreateTypingTestButton />
      </div>
      <TypingTestList />
    </div>
  );
}
