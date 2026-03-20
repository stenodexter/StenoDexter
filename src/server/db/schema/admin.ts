import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const inviteStatusEnum = pgEnum("invite_status", [
  "active",
  "invalidated",
  "expired",
  "limit_reached",
]);

export type InviteStatus = (typeof inviteStatusEnum.enumValues)[number];

export const admin = pgTable("admin", {
  id: text("id").primaryKey(),

  name: text("name").notNull(),

  username: text("username").notNull().unique(),

  passwordHash: text("password_hash").notNull(),

  image: text("profile_picture_key"),

  isSuper: boolean("is_super").default(false).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),

  invitedByAdminId: text("invited_by_admin_id").references(
    (): any => admin.id,
    { onDelete: "set null" },
  ),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const adminSession = pgTable("admin_session", {
  id: text("id").primaryKey(),
  adminId: text("admin_id")
    .notNull()
    .references(() => admin.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const adminInvite = pgTable("admin_invite", {
  id: text("id").primaryKey(),

  token: text("token").notNull().unique(),

  createdByAdminId: text("created_by_admin_id")
    .notNull()
    .references(() => admin.id, { onDelete: "cascade" }),

  maxUses: integer("max_uses").notNull(),
  usedCount: integer("used_count").default(0).notNull(),

  status: inviteStatusEnum("status").default("active").notNull(),

  expiresAt: timestamp("expires_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const adminInviteUsage = pgTable("admin_invite_usage", {
  id: text("id").primaryKey(),

  inviteId: text("invite_id")
    .notNull()
    .references(() => adminInvite.id, { onDelete: "cascade" }),

  usedByAdminId: text("used_by_admin_id")
    .notNull()
    .references(() => admin.id, { onDelete: "cascade" }),

  usedAt: timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminInviteRelations = relations(adminInvite, ({ one, many }) => ({
  createdBy: one(admin, {
    fields: [adminInvite.createdByAdminId],
    references: [admin.id],
  }),
  usages: many(adminInviteUsage),
}));

export const adminInviteUsageRelations = relations(
  adminInviteUsage,
  ({ one }) => ({
    invite: one(adminInvite, {
      fields: [adminInviteUsage.inviteId],
      references: [adminInvite.id],
    }),
    usedBy: one(admin, {
      fields: [adminInviteUsage.usedByAdminId],
      references: [admin.id],
    }),
  }),
);

export const adminSessionRelations = relations(adminSession, ({ one }) => ({
  admin: one(admin, {
    fields: [adminSession.adminId],
    references: [admin.id],
  }),
}));
