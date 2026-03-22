import type { Metadata } from "next";
import { CreateTestForm } from "./_components/create-test-form";

export const metadata: Metadata = {
  title: "Create Test · StenoDexter",
};

export default function NewTestPage() {
  return (
    <div className="mx-auto w-[80%] py-8">
      <div className="mb-7">
        <p className="text-muted-foreground mb-1 font-mono text-[10px] font-bold tracking-[0.15em] uppercase">
          Admin · Tests
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Create Test</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure speeds, content, and timing for the new assessment.
        </p>
      </div>
      <CreateTestForm />
    </div>
  );
}
