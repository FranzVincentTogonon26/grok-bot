import { nanoid } from "nanoid";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Schema is push-only (`npm run db:push`) — see the Database rules in AGENTS.md.
 */
export const bots = pgTable(
  "bots",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    /** Third-party user id (e.g. Clerk `user_...`). */
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    /** Seed for the bot's face; defaults to nanoid. */
    avatar: text("avatar").notNull().$defaultFn(() => nanoid()),
    /** What the bot is for, in a phrase. */
    job: text("job").notNull(),
    /** How it should go about the job. */
    instructions: text("instructions"),
    /** Third-party id of the agent's sandbox, created lazily later. */
    sandboxId: text("sandbox_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)],
);

export type Bot = typeof bots.$inferSelect;
export type NewBot = typeof bots.$inferInsert;
