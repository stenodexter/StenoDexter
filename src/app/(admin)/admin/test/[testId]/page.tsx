import TestDetailClient from "./_components/test-details-client";


export default function TestDetailPage({
  params,
}: {
  params: { testId: string };
}) {
  return <TestDetailClient testId={params.testId} />;
}
 
 