import { z } from "zod";

export const createInviteSchema = z.object({
  maxUses: z.number().min(1, "Max uses must be at least 1"),
  expiresAt: z.date().optional(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;