// app/not-built/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";

export default function NotBuiltPage() {
  const router = useRouter();

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          This page isn’t built yet
        </h1>

        <p className="text-muted-foreground">
          We’re working on it. Please check back later.
        </p>

        <Button onClick={() => router.push("/user")} variant={"outline"}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
