import { z } from "zod";

export const registerSchema = z.object({
  name: z.string(),
  username: z.string(),
  password: z.string().min(6),
  code: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  username: z.string(),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof loginSchema>;
