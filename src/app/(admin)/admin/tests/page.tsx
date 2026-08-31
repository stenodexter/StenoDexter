// ─── app/admin/tests/page.tsx ─────────────────────────────────────────────────
import type { Metadata } from "next";
import { TestList } from "./_components/tests-list";
import { CreateTestButton } from "./_components/create-test-button";

export const metadata: Metadata = { title: "Tests — StenoDexter Admin" };

export default function TestsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Tests</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage stenography dictations here.
          </p>
        </div>
        <CreateTestButton />
      </div>
      <TestList />
    </div>
  );
}
