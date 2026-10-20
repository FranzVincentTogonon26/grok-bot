import type { z } from "zod"
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
