import { createTRPCRouter } from "../../trpc";
import { typingAttemptRouter } from "./attempt/typing-attempt.router";
import { typingLeaderboardRouter } from "./leaderboard/typing-leaderboard.router";
import { manageTypingRouter } from "./manage/manage-typing.router";
import { typingResultRouter } from "./results/typing-results.router";

export const typingTestRouter = createTRPCRouter({
  manage: manageTypingRouter,
  attempt: typingAttemptRouter,
  result: typingResultRouter,
  leaderboard: typingLeaderboardRouter,
});
