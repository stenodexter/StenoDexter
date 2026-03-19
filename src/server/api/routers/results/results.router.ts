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
  getResult: paidUserProcedure
    .input(
      z.object({
        attemptId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await resultService.getResult(input.attemptId, ctx.user.id);
    }),

  getTestResults: adminProcedure
    .input(getTestResultsSchema)
    .query(async ({ input }) => {
      return await resultService.getTestResults(input);
    }),

  getResults: adminProcedure
    .input(getResultsAdminSchema)
    .query(async ({ input }) => {
      return await resultService.getResultsAdmin(input);
    }),

  getTopPerformersByTest: publicProcedure
    .input(GetTopPerformersByTestSchema)
    .query(async ({ input }) => {
      return await resultService.getTopPerformersByTest(input);
    }),
});
