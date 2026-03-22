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
});
