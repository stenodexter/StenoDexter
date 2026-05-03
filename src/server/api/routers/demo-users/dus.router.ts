import {
  createTRPCRouter,
  adminProcedure,
  superAdminProcedure,
} from "~/server/api/trpc";
import {
  createDemoUserSchema,
  editDemoUserSchema,
  revokeDemoUserSchema,
  listDemoUsersSchema,
  getDemoUserSchema,
} from "./dus.schema";
import { dusService } from "./dus.service";

export const dusRouter = createTRPCRouter({
  list: adminProcedure
    .input(listDemoUsersSchema)
    .query(({ input }) => dusService.list(input)),

  get: adminProcedure
    .input(getDemoUserSchema)
    .query(({ input }) => dusService.get(input.id)),

  create: adminProcedure
    .input(createDemoUserSchema)
    .mutation(({ input, ctx }) => dusService.create(input, ctx.admin.id)),

  edit: adminProcedure
    .input(editDemoUserSchema)
    .mutation(({ input }) => dusService.edit(input)),

  revoke: adminProcedure
    .input(revokeDemoUserSchema)
    .mutation(({ input }) => dusService.revoke(input.id)),

  delete: adminProcedure
    .input(getDemoUserSchema)
    .mutation(({ input }) => dusService.delete(input.id)),

  resetPassword: adminProcedure
    .input(getDemoUserSchema)
    .mutation(({ input }) => dusService.resetPassword(input.id)),
});
