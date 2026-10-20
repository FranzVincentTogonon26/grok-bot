import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Starter schema — replace or extend with your product tables.
 */
export const users = pgTable("users", {
  /** Clerk user id (user_...) */
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
