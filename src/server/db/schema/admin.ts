import { relations } from "drizzle-orm";
import {
  boolean,
  index,
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

export const admin = pgTable(
  "admin",
  {
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
  },
  (t) => [
    // Listing all admins invited by a given admin
    index("admin_invited_by_idx").on(t.invitedByAdminId),

    // Filtering super/system admins (small table but used in auth checks)
    index("admin_is_super_idx").on(t.isSuper),
    index("admin_is_system_idx").on(t.isSystem),
  ],
);

export const adminSession = pgTable(
  "admin_session",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id")
      .notNull()
      .references(() => admin.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(), // unique() already creates an index
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    // Core auth lookup: token + expiry (hits on every request without cache)
    index("admin_session_token_expires_idx").on(t.token, t.expiresAt),

    // Listing / revoking all sessions for an admin
    index("admin_session_admin_id_idx").on(t.adminId),

    // Sweeping expired sessions in cleanup jobs
    index("admin_session_expires_at_idx").on(t.expiresAt),
  ],
);

export const adminInvite = pgTable(
  "admin_invite",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(), // unique() already creates an index
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
  },
  (t) => [
    // Listing invites created by a specific admin (admin dashboard)
    index("admin_invite_created_by_idx").on(t.createdByAdminId),

    // Filtering active invites — most common query when validating an invite
    index("admin_invite_status_idx").on(t.status),

    // Composite: validating a token that is still active and not expired
    // WHERE token = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
    index("admin_invite_token_status_expires_idx").on(
      t.token,
      t.status,
      t.expiresAt,
    ),

    // Sweeping expired invites in cleanup jobs
    index("admin_invite_expires_at_idx").on(t.expiresAt),
  ],
);

export const adminInviteUsage = pgTable(
  "admin_invite_usage",
  {
    id: text("id").primaryKey(),
    inviteId: text("invite_id")
      .notNull()
      .references(() => adminInvite.id, { onDelete: "cascade" }),
    usedByAdminId: text("used_by_admin_id")
      .notNull()
      .references(() => admin.id, { onDelete: "cascade" }),
    usedAt: timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // Counting / listing usages for a given invite (checking maxUses)
    index("admin_invite_usage_invite_id_idx").on(t.inviteId),

    // Checking whether a specific admin already used an invite (prevent double-use)
    index("admin_invite_usage_used_by_idx").on(t.usedByAdminId),

    // Composite: both checks together in one index scan
    index("admin_invite_usage_invite_used_by_idx").on(
      t.inviteId,
      t.usedByAdminId,
    ),
  ],
);

// Relations unchanged
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
