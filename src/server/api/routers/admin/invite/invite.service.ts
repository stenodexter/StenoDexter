import { nanoid } from "nanoid";
import { adminInvite } from "~/server/db/schema";
import type { TRPCContext } from "~/server/api/trpc";
import type { CreateInviteInput } from "./invite.schema";

export const inviteService = {
  async create(input: CreateInviteInput, ctx: TRPCContext) {
    const { maxUses, expiresAt } = input;

    const [invite] = await ctx.db
      .insert(adminInvite)
      .values({
        id: nanoid(),
        token: nanoid(8),
        createdByAdminId: ctx.admin!.id,
        maxUses,
        usedCount: 0,
        expiresAt: expiresAt ?? null,
      })
      .returning();

    return invite;
  },

  async list(ctx: TRPCContext) {
    return ctx.db.query.adminInvite.findMany({
      orderBy: (i, { desc }) => [desc(i.createdAt)],
    });
  },

  async getById(id: string, ctx: TRPCContext) {
    return ctx.db.query.adminInvite.findFirst({
      where: (i, { eq }) => eq(i.id, id),
    });
  },
};