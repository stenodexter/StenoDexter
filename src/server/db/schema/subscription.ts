import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { admin } from "./admin";

export const payment = pgTable(
  "payment_proof",
  {
    id: text("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    amount: integer("amount").notNull(),

    screenshotKey: text("screenshot_key").notNull(),

    status: text("status", {
      enum: ["pending", "approved", "rejected"],
    })
      .$defaultFn(() => "pending")
      .notNull(),

    transactionId: text("transaction_id"),

    verifiedBy: text("verified_by").references(() => admin.id, {
      onDelete: "set null",
    }),

    fromUPIId: text("from_upi_id").notNull(),

    verifiedAt: timestamp("verified_at", { withTimezone: true }),

    rejectionReason: text("rejection_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("unique_pending_payment_per_user")
      .on(t.userId)
      .where(sql`status = 'pending'`),
  ],
);

export const subscription = pgTable("subscription", {
  id: text("id").primaryKey(),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  paymentProofId: text("payment_proof_id").references(() => payment.id),

  status: text("status", {
    enum: ["active", "expired"],
  })
    .$defaultFn(() => "active")
    .notNull(),

  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  })
    .$defaultFn(() => new Date())
    .notNull(),

  currentPeriodEnd: timestamp("current_period_end", {
    withTimezone: true,
  }).notNull(),

  lastReminderSentAt: timestamp("last_reminder_sent_at", {
    withTimezone: true,
  }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
});

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
