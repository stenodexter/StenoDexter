import {
  createTRPCRouter,
  superAdminProcedure,
  systemAdminProcedure,
} from "~/server/api/trpc";
import { inviteService } from "./invite.service";
import {
  createInviteSchema,
  updateInviteSchema,
  deleteInviteSchema,
  deleteManyInviteSchema,
  promoteAdminSchema,
} from "./invite.schema";

export const inviteRouter = createTRPCRouter({
  create: superAdminProcedure
    .input(createInviteSchema)
    .mutation(({ input, ctx }) => inviteService.create(input, ctx.admin!.id)),
  list: superAdminProcedure.query(() => inviteService.list()),
  getById: superAdminProcedure
    .input(deleteInviteSchema)
    .query(({ input }) => inviteService.getById(input.id)),
  update: superAdminProcedure
    .input(updateInviteSchema)
    .mutation(({ input }) => inviteService.update(input)),
  delete: superAdminProcedure
    .input(deleteInviteSchema)
    .mutation(({ input }) => inviteService.delete(input.id)),
  deleteMany: superAdminProcedure
    .input(deleteManyInviteSchema)
    .mutation(({ input }) => inviteService.deleteMany(input.ids)),
  listAdmins: superAdminProcedure.query(() => inviteService.listAdmins()),

  promoteToSuper: systemAdminProcedure
    .input(promoteAdminSchema)
    .mutation(({ input, ctx }) =>
      inviteService.promoteToSuper(input.adminId, ctx.admin!.id),
    ),
  demoteFromSuper: systemAdminProcedure
    .input(promoteAdminSchema)
    .mutation(({ input, ctx }) =>
      inviteService.demoteFromSuper(input.adminId, ctx.admin!.id),
    ),
});
