"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { z } from "zod"

import { db } from "@/db"
import { botFormSchema } from "@/db/validation"
import { bots, chatMembers, chats } from "@/db/schema"

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

  // Pre-generate ids so the three inserts can be built up-front and run
  // as ONE atomic Neon transaction via db.batch — the neon-http driver
  // has no interactive `db.transaction()`, but batch() is atomic server-side.
  const botId = nanoid()
  const chatId = nanoid()

  await db.batch([
    db.insert(bots).values({ id: botId, ...parsed.data, userId }),
    db.insert(chats).values({ id: chatId, kind: "direct", userId }),
    db.insert(chatMembers).values({ chatId, botId }),
  ])

  revalidatePath("/")

  return { ok: true as const, botId, chatId }
}
