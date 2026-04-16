import type { Metadata } from "next";
import { CreateTypingTestForm } from "./_components/create-typing-test-form";

export const metadata: Metadata = { title: "New Typing Test — Admin" };

export default function NewTypingTestPage() {
  return (
    <div className="mx-auto py-10 max-w-[80%] w-[80%]">
      <div className="mb-6 px-8">
        <h1 className="text-lg font-bold">Create Typing Test</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Tests go live immediately on publish.
        </p>
      </div>
      <CreateTypingTestForm />
    </div>
  );
}
