import { auth } from "~/server/better-auth/config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TypingTestResultsPage } from "~/components/common/clients/user-typing-test-results-client";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <TypingTestResultsPage userId={session.user.id} isAdmin={false} />;
}
