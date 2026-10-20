"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { bots } from "@/db/schema"
import { botFormSchema } from "@/db/validation"

/**
 * Form fields + the avatar seed chosen (or shuffled) in the dialog.
 */
const createBotSchema = botFormSchema.extend({
  avatar: z.string().min(1),
})

export type CreateBotInput = z.infer<typeof createBotSchema>

export async function createBot(input: CreateBotInput) {
  // Server Actions are public endpoints — always verify auth.
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const parsed = createBotSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid bot data." }
  }

  const [bot] = await db
    .insert(bots)
    .values({ ...parsed.data, userId })
    .returning({ id: bots.id })

  revalidatePath("/")

  return { ok: true as const, id: bot.id }
}
