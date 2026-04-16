import { TypingLeaderboard } from "~/components/common/clients/typing-test-leaderboard-client";

interface Props {
  params: { testId: string };
}

export default async function AdminTypingLeaderboardPage({ params }: Props) {
  return (
    <TypingLeaderboard
      testId={params.testId}
      isAdmin={true}
      currentUserId={null}
    />
  );
}