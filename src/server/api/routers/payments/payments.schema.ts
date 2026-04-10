import z from "zod";
import { env } from "~/env";

export const submitPaymentSchema = z.object({
  amount: z
    .number()
    .gte(env.APP_SUBSCRIPTION_PRICE, "Invalid payment amount")
    .lte(env.APP_SUBSCRIPTION_PRICE, "Invalid payment amount"),
  screenshotKey: z.string().min(1, "Payment screenshot is required"),
  fromUPIId: z.string().min(1, "UPI ID is required"),
  type: z.enum(["renew", "fresh"]),
});

export const adminVerifyPaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z
    .string()
    .min(1, "Please provide a rejection reason")
    .optional(),
});

export const adminGetPaymentsSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  userId: z.string().optional(),
  page: z.number().min(0).default(0),
  limit: z.number().min(1).max(100, "Limit cannot exceed 100").default(20),
});

export const userGetPaymentsSchema = z.object({
  page: z.number().min(0).default(0),
  limit: z.number().min(1).max(100, "Limit cannot exceed 100").default(10),
});

export type AdminGetPaymentsInput = z.infer<typeof adminGetPaymentsSchema>;
export type AdminVerifyPaymentInput = z.infer<typeof adminVerifyPaymentSchema>;
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;
