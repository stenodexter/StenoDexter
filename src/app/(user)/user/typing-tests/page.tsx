// app/(user)/typing-tests/page.tsx
import type { Metadata } from "next";
import { TypingTestFeed } from "./_components/typing-test-feed";

export const metadata: Metadata = { title: "Typing Tests" };

export default function TypingTestsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Typing Tests</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Practice and test your typing.
        </p>
      </div>
      <TypingTestFeed />
    </div>
  );
}
