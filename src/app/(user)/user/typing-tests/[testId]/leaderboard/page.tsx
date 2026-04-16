import { TypingLeaderboard } from "~/components/common/clients/typing-test-leaderboard-client";
import { api } from "~/trpc/server";

interface Props {
  params: { testId: string };
}

export default async function UserTypingLeaderboardPage({ params }: Props) {
  const user = await api.user.me();
  const currentUserId = user?.id ?? null;

  return (
    <TypingLeaderboard
      testId={params.testId}
      isAdmin={false}
      currentUserId={currentUserId}
    />
  );
}
