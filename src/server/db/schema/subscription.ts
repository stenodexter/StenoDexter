// ─── server/db/schema/payment.ts ─────────────────────────────────────────────

import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { admin } from "./admin";
import { nanoid } from "nanoid";

export const paymentsTypeEnum = pgEnum("payments_type", ["renew", "fresh"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "approved",
  "rejected",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "expired",
  "revoked",
]);

export const planEnum = pgEnum("plan_type", ["app", "typing", "full"]);
export const subscriptionEnum = pgEnum("subscription_type", ["app", "typing"]);

export const payment = pgTable(
  "payment_proof",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    amount: integer("amount").notNull(),

    screenshotKey: text("screenshot_key").notNull(),

    status: paymentStatusEnum("status").default("pending").notNull(),

    type: paymentsTypeEnum("type").notNull(),

    plan: planEnum("plan").default("app").notNull(),

    verifiedBy: text("verified_by").references(() => admin.id, {
      onDelete: "set null",
    }),

    fromUPIId: text("from_upi_id").notNull(),

    verifiedAt: timestamp("verified_at", { withTimezone: true }),

    rejectionReason: text("rejection_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("unique_pending_payment_per_user")
      .on(t.userId)
      .where(sql`status = 'pending'`),

    index("payment_user_idx").on(t.userId),
  ],
);

export const subscription = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    paymentProofId: text("payment_proof_id").references(() => payment.id),

    status: subscriptionStatusEnum("status").default("active").notNull(),

    type: subscriptionEnum("type").default("app").notNull(),

    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
    }).notNull(),

    lastReminderSentAt: timestamp("last_reminder_sent_at", {
      withTimezone: true,
    }),

    revocationReason: text("revocation_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("subscription_user_idx").on(t.userId),

    uniqueIndex("one_active_sub_per_user_per_plan")
      .on(t.userId, t.type)
      .where(sql`status = 'active'`),
  ],
);

export const paymentRelations = relations(payment, ({ one }) => ({
  user: one(user, {
    fields: [payment.userId],
    references: [user.id],
  }),
  admin: one(admin, {
    fields: [payment.verifiedBy],
    references: [admin.id],
  }),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
  payment: one(payment, {
    fields: [subscription.paymentProofId],
    references: [payment.id],
  }),
}));
