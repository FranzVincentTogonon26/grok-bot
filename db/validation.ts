import { z } from "zod"
import { createInsertSchema } from "drizzle-zod"

import { bots } from "./schema"

/**
 * Insert schema generated from the bots table (drizzle-zod), with
 * form-level refinements on top of the column-derived validation.
 */
export const botInsertSchema = createInsertSchema(bots, {
  name: (schema) => schema.min(1, "Name is required"),
  job: (schema) => schema.min(1, "Job is required"),
  instructions: (schema) => schema.nullish(),
})

/**
 * The user-facing subset. id/avatar come from column defaults,
 * userId comes from Clerk, and avatar's seed is passed by the dialog.
 */
export const botFormSchema = botInsertSchema.pick({
  name: true,
  job: true,
  instructions: true,
})

export type BotFormValues = z.infer<typeof botFormSchema>

/**
 * Update form: the shared user-facing fields plus server-owned inputs — the
 * bot id being edited and the avatar seed the dialog currently shows.
 */
export const botUpdateSchema = botFormSchema.extend({
  botId: z.string().min(1),
  avatar: z.string().min(1),
})

/**
 * Group chat name. `chats.name` is nullable because direct chats use their
 * bot's name, so this form-level field is deliberately stricter than the
 * generated insert schema.
 */
const groupChatNameSchema = z.string().trim().min(1, "Name is required")

/**
 * The group creation form: a name and the bots that belong in the group.
 * `memberIds` is form-only; the chat and membership rows are built server-side.
 */
export const groupChatFormSchema = z.object({
  name: groupChatNameSchema,
  memberIds: z.array(z.string().min(1)).min(2, "Pick at least two bots"),
})

export type GroupChatFormValues = z.infer<typeof groupChatFormSchema>

export type BotUpdateValues = z.infer<typeof botUpdateSchema>
