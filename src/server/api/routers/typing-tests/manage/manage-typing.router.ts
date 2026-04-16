import {
  createTRPCRouter,
  adminProcedure,
  secureProcedure,
} from "~/server/api/trpc";
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

  get: secureProcedure
    .input(getTypingTestSchema)
    .query(async ({ input, ctx }) => {
      if (ctx.user && ctx.user.id) {
        return await typingTestManageService.get(input, ctx.user.id);
      }

      return await typingTestManageService.get(input);
    }),

  list: secureProcedure
    .input(listTypingTestsSchema)
    .query(async ({ input, ctx }) => {
      if (ctx.user && ctx.user.id) {
        return await typingTestManageService.list(input, ctx.user.id);
      }

      return await typingTestManageService.list(input);
    }),
});
