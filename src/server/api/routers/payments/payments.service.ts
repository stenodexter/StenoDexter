import { and, desc, eq, sql } from "drizzle-orm";
import type { db } from "~/server/db";
import { payment, subscription } from "~/server/db/schema";
import type {
  AdminGetPaymentsInput,
  AdminVerifyPaymentInput,
  SubmitPaymentInput,
} from "./payments.schema";
import R2Service, { r2Service } from "~/server/services/r2.service";
import { notificationsService } from "../notifications/notification.service";
import { emailService } from "~/server/services/mail.service";

type Db = typeof db;

export function createPaymentService(db: Db) {
  return {
    async submitPayment(userId: string, data: SubmitPaymentInput) {
      const existing = await db.query.payment.findFirst({
        where: (p: any, { eq, and }: any) =>
          and(eq(p.userId, userId), eq(p.status, "pending")),
      });

      if (existing) {
        throw new Error("You already have a pending payment.");
      }

      await db.insert(payment).values({
        userId,
        type: data.type,
        amount: data.amount,
        fromUPIId: data.fromUPIId,
        screenshotKey: data.screenshotKey,
      });

      return { ok: true };
    },

    async verifyPayment(adminId: string, input: AdminVerifyPaymentInput) {
      const found = await db.query.payment.findFirst({
        where: eq(payment.id, input.paymentId),
        with: {
          user: true,
        },
      });

      if (!found) throw new Error("Payment not found");
      if (found.status !== "pending") throw new Error("Already processed");

      if (input.action === "reject") {
        await db
          .update(payment)
          .set({
            status: "rejected",
            rejectionReason: input.rejectionReason,
            verifiedBy: adminId,
            verifiedAt: new Date(),
          })
          .where(eq(payment.id, input.paymentId));

        await notificationsService.send({
          title: "Payment Rejected",
          message: input.rejectionReason
            ? `Your payment was rejected: ${input.rejectionReason}`
            : "Your payment was rejected. Please try again.",
          to: found.userId,
        });

        if (found.user?.email) {
          await emailService.sendPaymentRejected(
            found.user.email,
            input.rejectionReason,
          );
        }

        return { ok: true };
      }

      await db.transaction(async (tx: any) => {
        await tx
          .update(payment)
          .set({
            status: "approved",
            verifiedBy: adminId,
            verifiedAt: new Date(),
          })
          .where(eq(payment.id, input.paymentId));

        const existing = await tx.query.subscription.findFirst({
          where: (s: any, { eq, and }: any) =>
            and(eq(s.userId, found.userId), eq(s.status, "active")),
        });

        const now = new Date();

        let start: Date;

        if (existing && existing.currentPeriodEnd > now) {
          start = new Date(existing.currentPeriodEnd);
        } else {
          start = now;
        }

        const end = new Date(start);
        end.setDate(end.getDate() + 30);

        if (existing) {
          await tx
            .update(subscription)
            .set({
              currentPeriodEnd: end,
              updatedAt: new Date(),
            })
            .where(eq(subscription.id, existing.id));
        } else {
          await tx.insert(subscription).values({
            id: crypto.randomUUID(),
            userId: found.userId,
            paymentProofId: found.id,
            currentPeriodStart: start,
            currentPeriodEnd: end,
          });
        }
      });

      await notificationsService.send({
        title: "Payment Approved 🎉",
        message: "Your payment has been verified. Subscription is now active.",
        to: found.userId,
      });

      if (found.user?.email) {
        await emailService.sendPaymentApproved(found.user.email);
      }

      return { ok: true };
    },

    // ── Admin: List Payments ─────────────────────────────────────
    async getPayments(input: AdminGetPaymentsInput) {
      const conditions = [];

      if (input.status) conditions.push(eq(payment.status, input.status));
      if (input.userId) conditions.push(eq(payment.userId, input.userId));

      const where = conditions.length ? and(...conditions) : undefined;

      const [data, [countRow]] = await Promise.all([
        db.query.payment.findMany({
          where,
          orderBy: desc(payment.createdAt),
          limit: input.limit,
          offset: input.page * input.limit,

          with: {
            user: true,
          },
        }),

        db
          .select({ count: sql<number>`count(*)` })
          .from(payment)
          .where(where),
      ]);

      const total = countRow?.count ?? 0;

      return {
        data: data.map((d) => ({
          ...d,
          screenshotURL: R2Service.getPublicUrl(d.screenshotKey),
          user: {
            ...d.user,
            userProfilePic: R2Service.getPublicUrl(d.user.image),
          },
        })),
        meta: {
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    },

    async getMyPayments(userId: string, page: number, limit: number) {
      const [data, [countRow]] = await Promise.all([
        db.query.payment.findMany({
          where: eq(payment.userId, userId),
          orderBy: desc(payment.createdAt),
          limit,
          offset: page * limit,
        }),

        db
          .select({ count: sql<number>`count(*)` })
          .from(payment)
          .where(eq(payment.userId, userId)),
      ]);

      const total = countRow?.count ?? 0;

      return {
        data: data.map((d) => ({
          ...d,
          screenshotURL: R2Service.getPublicUrl(d.screenshotKey),
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
  };
}
