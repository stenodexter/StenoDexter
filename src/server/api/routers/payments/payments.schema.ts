import z from "zod";

export const PLAN_AMOUNTS: Record<string, number> = {
  app: 1500,
  typing: 500,
  full: 2000,
};

export const submitPaymentSchema = z
  .object({
    plan: z.enum(["app", "typing", "full"]),
    screenshotKey: z.string().min(1, "Payment screenshot is required"),
    fromUPIId: z.string().min(1, "UPI ID is required"),
    type: z.enum(["renew", "fresh"]),
    amount: z.number().optional(),
  })
  .transform((v) => ({
    ...v,
    amount: PLAN_AMOUNTS[v.plan]!,
  }));

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
