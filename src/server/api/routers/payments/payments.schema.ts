import z from "zod";
import { env } from "~/env";

export const submitPaymentSchema = z.object({
  amount: z
    .number()
    .gte(env.APP_SUBSCRIPTION_PRICE)
    .lte(env.APP_SUBSCRIPTION_PRICE),
  screenshotKey: z.string(),
  transactionId: z.string().optional(),
  fromUPIId: z.string(),
});

export const adminVerifyPaymentSchema = z.object({
  paymentId: z.string(),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

export const adminGetPaymentsSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  userId: z.string().optional(),
  page: z.number().min(0).default(0),
  limit: z.number().min(1).max(100).default(20),
});

export const userGetPaymentsSchema = z.object({
  page: z.number().min(0).default(0),
  limit: z.number().min(1).max(100).default(10),
});

export type AdminGetPaymentsInput = z.infer<typeof adminGetPaymentsSchema>;
export type AdminVerifyPaymentInput = z.infer<typeof adminVerifyPaymentSchema>;
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;
