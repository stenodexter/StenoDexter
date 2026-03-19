import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import {
  createTestSchema,
  updateTestSchema,
  getTestSchema,
  listTestsSchema,
  listUserTestsSchema,
  getTestsAdminSchema,
} from "./test.schema";

import { testService } from "./test.service";

export const testRouter = createTRPCRouter({
  create: adminProcedure.input(createTestSchema).mutation(({ input, ctx }) => {
    return testService.create(input, ctx.admin.id);
  }),

  update: adminProcedure.input(updateTestSchema).mutation(({ input }) => {
    return testService.update(input);
  }),

  delete: adminProcedure.input(getTestSchema).mutation(({ input }) => {
    return testService.delete(input);
  }),

  list: publicProcedure.input(listTestsSchema).query(({ input }) => {
    return testService.list(input);
  }),

  listForUser: protectedProcedure
    .input(listUserTestsSchema)
    .query(({ input, ctx }) => {
      return testService.listForUserFeed(input, ctx.user.id);
    }),

  get: publicProcedure.input(getTestSchema).query(({ input }) => {
    return testService.getById(input);
  }),

  getTests: adminProcedure.input(getTestsAdminSchema).query(({ input }) => {
    return testService.getTestsAdmin(input);
  }),

  todaysTest: publicProcedure.query(async () => {
    return testService.getLast24HourTests();
  }),
});
