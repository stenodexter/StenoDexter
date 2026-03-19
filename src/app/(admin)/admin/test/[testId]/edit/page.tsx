import EditTestClient from "./_components/edit-test-client";

export default function EditTestPage({
  params,
}: {
  params: { testId: string };
}) {
  return <EditTestClient testId={params.testId} />;
}
