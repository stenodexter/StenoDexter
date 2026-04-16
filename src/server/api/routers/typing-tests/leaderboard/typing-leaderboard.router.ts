import {
  adminProcedure,
  createTRPCRouter,
  secureProcedure,
} from "~/server/api/trpc";
import z from "zod";
import { typingLeaderboardService } from "./typing-leaderboard.service";

export const typingLeaderboardRouter = createTRPCRouter({
  getLeaderboard: secureProcedure
    .input(z.object({ testId: z.string(), limit: z.number().optional() }))
    .query(({ input }) =>
      typingLeaderboardService.getLeaderboard(input.testId, {
        limit: input.limit,
      }),
    ),

  getUsersForTest: adminProcedure
    .input(
      z.object({
        testId: z.string(),
        page: z.number().default(0),
        limit: z.number().default(20),
        search: z.string().optional(),
        type: z.enum(["test", "practice"]).optional(),
      }),
    )
    .query(({ input }) => typingLeaderboardService.getUsersForTest(input)),
});
