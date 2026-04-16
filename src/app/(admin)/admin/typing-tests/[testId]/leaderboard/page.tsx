import { TypingLeaderboard } from "~/components/common/clients/typing-test-leaderboard-client";

interface Props {
  params: Promise<{ testId: string }>;
}

export default async function AdminTypingLeaderboardPage({ params }: Props) {
  const { testId } = await params;

  return (
    <TypingLeaderboard testId={testId} isAdmin={true} currentUserId={null} />
  );
}
