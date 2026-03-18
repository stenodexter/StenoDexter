import type { Metadata } from "next";
import { CreateTestForm } from "~/app/_components/admin/tests/create-test-form";

export const metadata: Metadata = {
  title: "Create Test · StenoDexter",
};

export default function NewTestPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-2 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Create Stenography Test
        </h1>
        <p className="text-muted-foreground text-sm">
          Configure audio, timing, and content for the candidate assessment.
        </p>
      </div>
      <CreateTestForm />
    </div>
  );
}
