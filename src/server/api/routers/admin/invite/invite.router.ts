import { z } from "zod";
import { createTRPCRouter, superAdminProcedure } from "~/server/api/trpc";
import { inviteService } from "./invite.service";
import { createInviteSchema } from "./invite.schema";

export const inviteRouter = createTRPCRouter({
  create: superAdminProcedure
    .input(createInviteSchema)
    .mutation(({ input, ctx }) => inviteService.create(input, ctx)),

  list: superAdminProcedure.query(({ ctx }) => inviteService.list(ctx)),

  getById: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input, ctx }) => inviteService.getById(input.id, ctx)),
});
