import z from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  paidUserProcedure,
  publicProcedure,
} from "../../trpc";
import { resultService } from "./results.service";
import {
  getResultsAdminSchema,
  getTestResultsSchema,
  GetTopPerformersByTestSchema,
} from "./results.schema";

export const resultRouter = createTRPCRouter({
  // User: view their own attempt result
  getResult: paidUserProcedure
    .input(z.object({ attemptId: z.string() }))
    .query(({ input, ctx }) =>
      resultService.getResult(input.attemptId, ctx.user.id),
    ),

  // Admin/public: all results for a test (optionally filtered by speed)
  getTestResults: publicProcedure
    .input(getTestResultsSchema)
    .query(({ input }) => resultService.getTestResults(input)),

  // Admin: global results feed with rich filters
  getResults: adminProcedure
    .input(getResultsAdminSchema)
    .query(({ input }) => resultService.getResultsAdmin(input)),

  // Public: leaderboard for a test (per-speed or all speeds)
  getTopPerformersByTest: publicProcedure
    .input(GetTopPerformersByTestSchema)
    .query(({ input }) => resultService.getTopPerformersByTest(input)),

  getUsersForTest: adminProcedure
    .input(
      z.object({
        testId: z.string(),
        page: z.number().min(0).default(0),
        limit: z.number().min(1).max(100).default(20),
        type: z.enum(["assessment", "practice"]).optional(),
        search: z.string().optional(),
      }),
    )
    .query(({ input }) => resultService.getUsersForTest(input)),
});
