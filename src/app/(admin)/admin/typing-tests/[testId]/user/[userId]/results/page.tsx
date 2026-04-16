import { TypingTestResultsPage } from "~/components/common/clients/user-typing-test-results-client";

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <TypingTestResultsPage userId={userId} isAdmin />;
}
