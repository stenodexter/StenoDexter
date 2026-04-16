"use client";

import { use } from "react";
import { TypingTestDetailPage } from "~/components/common/clients/typing-test-details";

export default function Page({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = use(params);
  return <TypingTestDetailPage testId={testId} isAdmin={false} />;
}
