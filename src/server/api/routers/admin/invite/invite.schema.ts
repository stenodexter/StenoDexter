import { z } from "zod";
export type { InviteStatus } from "~/server/db/schema";

export const createInviteSchema = z.object({
  maxUses: z.number().int().min(1, "Max uses must be at least 1"),
  expiresAt: z.date().optional(),
});

export const updateInviteSchema = z.object({
  id: z.string(),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.date().nullable().optional(),
  invalidate: z.boolean().optional(),
});

export const deleteInviteSchema = z.object({ id: z.string() });
export const deleteManyInviteSchema = z.object({
  ids: z.array(z.string()).min(1),
});
export const promoteAdminSchema = z.object({ adminId: z.string() });

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type UpdateInviteInput = z.infer<typeof updateInviteSchema>;
