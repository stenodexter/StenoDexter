import { z } from "zod";

export const createDemoUserSchema = z.object({
  expiresAt: z.date().optional(),
  note: z.string().max(500, "Note must be at most 500 characters").optional(),
});

export const editDemoUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  expiresAt: z.date().nullable().optional(),
  note: z
    .string()
    .max(500, "Note must be at most 500 characters")
    .nullable()
    .optional(),
});

export const revokeDemoUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export const listDemoUsersSchema = z.object({
  page: z.number().int().min(1, "Page must be at least 1").default(1),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100, "Limit cannot exceed 100")
    .default(20),
  search: z.string().optional(),
  status: z.enum(["all", "active", "expired", "revoked"]).default("all"),
});

export const getDemoUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export type CreateDemoUserInput = z.infer<typeof createDemoUserSchema>;
export type EditDemoUserInput = z.infer<typeof editDemoUserSchema>;
export type RevokeDemoUserInput = z.infer<typeof revokeDemoUserSchema>;
export type ListDemoUsersInput = z.infer<typeof listDemoUsersSchema>;
