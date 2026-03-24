import { TestResultsPage } from "~/components/common/clients/user-test-results-client";

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <TestResultsPage userId={userId} isAdmin={true} />;
}
