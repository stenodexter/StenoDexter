import { TestLeaderboardPage } from "~/components/common/clients/test-leaderboard-client";
import { api } from "~/trpc/server";

export default async function UserLeaderboardPage() {
  const user = await api.user.me();

  return (
    <TestLeaderboardPage isAdmin={false} currentUserId={user.id ?? null} />
  );
}
