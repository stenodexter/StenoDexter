import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { relations } from "drizzle-orm";
import { admin } from "./admin";

export const hallOfFame = pgTable(
  "hall_of_fame",
  {
    id: text("id")
      .$defaultFn(() => nanoid(8))
      .primaryKey(),

    name: text("name").notNull(),
    photoKey: text("photo_key"),
    department: text("department").notNull(),
    batch: text("batch"),
    note: text("note"),

    addedById: text("added_by_id")
      .notNull()
      .default("system")
      .references(() => admin.id, { onDelete: "set default" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("hof_department_idx").on(t.department),
    index("hof_created_at_idx").on(t.createdAt),
  ],
);

export const hallOfFameRelations = relations(hallOfFame, ({ one }) => ({
  addedBy: one(admin, {
    fields: [hallOfFame.addedById],
    references: [admin.id],
  }),
}));
