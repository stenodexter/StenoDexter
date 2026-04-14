// typing-test.router.ts

import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import {
  createTypingTestSchema,
  updateTypingTestSchema,
  getTypingTestSchema,
  listTypingTestsSchema,
} from "./manage.typing.schema";
import { typingTestManageService } from "./manage-typing.service";

export const manageTypingRouter = createTRPCRouter({
  create: adminProcedure
    .input(createTypingTestSchema)
    .mutation(({ input, ctx }) =>
      typingTestManageService.create(input, ctx.admin.id),
    ),

  update: adminProcedure
    .input(updateTypingTestSchema)
    .mutation(({ input }) => typingTestManageService.update(input)),

  delete: adminProcedure
    .input(getTypingTestSchema)
    .mutation(({ input }) => typingTestManageService.delete(input)),

  get: adminProcedure
    .input(getTypingTestSchema)
    .query(({ input }) => typingTestManageService.get(input)),

  list: adminProcedure
    .input(listTypingTestsSchema)
    .query(({ input }) => typingTestManageService.list(input)),
});
