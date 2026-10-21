"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { z } from "zod"

import { db } from "@/db"
import { botFormSchema, botUpdateSchema } from "@/db/validation"
import { bots, chatMembers, chats } from "@/db/schema"
import {
  createBotSandbox,
  deleteBotSandbox,
  isMissingDefaultRegionError,
} from "@/lib/daytona"

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

  // One sandbox per bot. Provision it before the inserts so a bot row never
  // exists without its sandbox; if the inserts fail, the sandbox is reclaimed.
  let sandboxId: string
  try {
    sandboxId = await createBotSandbox(botId)
  } catch (error) {
    if (isMissingDefaultRegionError(error)) {
      console.error(
        `Failed to create a sandbox for bot ${botId}: the Daytona organization has no default region. Set one at https://app.daytona.io/dashboard.`,
        error,
      )
      return {
        ok: false as const,
        error:
          "Daytona has no default region yet. Set one at app.daytona.io/dashboard, then try again.",
      }
    }

    console.error("Failed to create a sandbox for bot", botId, error)
    return {
      ok: false as const,
      error: "Couldn't create the bot's sandbox. Try again.",
    }
  }

  try {
    await db.batch([
      db.insert(bots).values({ id: botId, ...parsed.data, userId, sandboxId }),
      db.insert(chats).values({ id: chatId, kind: "direct", userId }),
      db.insert(chatMembers).values({ chatId, botId }),
    ])
  } catch (error) {
    // Don't leave a sandbox behind when the bot never made it into the db.
    await deleteBotSandbox(sandboxId).catch((cleanupError: unknown) => {
      console.error(
        "Failed to reclaim the sandbox for bot",
        botId,
        sandboxId,
        cleanupError,
      )
    })
    throw error
  }

  revalidatePath("/")

  return { ok: true as const, botId, chatId }
}

export type UpdateBotInput = z.infer<typeof botUpdateSchema>

export async function updateBot(input: UpdateBotInput) {
  // Server Actions are public endpoints — always verify auth.
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const parsed = botUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid bot data." }
  }

  const { botId, avatar, name, job, instructions } = parsed.data

  // userId in the WHERE clause: another user's bot id updates nothing.
  const [updated] = await db
    .update(bots)
    .set({ name, job, instructions, avatar })
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning({ id: bots.id })

  if (!updated) {
    return { ok: false as const, error: "Bot not found." }
  }

  // Refresh the sidebar list and every chat page this bot appears on.
  revalidatePath("/")

  const memberships = await db
    .select({ chatId: chatMembers.chatId })
    .from(chatMembers)
    .where(eq(chatMembers.botId, botId))

  for (const { chatId } of memberships) {
    revalidatePath(`/chats/${chatId}`)
  }

  return { ok: true as const }
}

/**
 * Delete payload: just the server-owned bot id.
 */
const deleteBotSchema = z.object({
  botId: z.string().min(1),
})

export type DeleteBotInput = z.infer<typeof deleteBotSchema>

export async function deleteBot(input: DeleteBotInput) {
  // Server Actions are public endpoints — always verify auth.
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const parsed = deleteBotSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid bot data." }
  }

  const { botId } = parsed.data

  // Collect the bot's chats BEFORE the delete cascades its memberships away.
  const memberships = await db
    .select({ chatId: chatMembers.chatId, kind: chats.kind })
    .from(chatMembers)
    .innerJoin(chats, eq(chats.id, chatMembers.chatId))
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(and(eq(chatMembers.botId, botId), eq(bots.userId, userId)))

  // userId in the WHERE clause: another user's bot id deletes nothing.
  const [deleted] = await db
    .delete(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning({ id: bots.id, sandboxId: bots.sandboxId })

  if (!deleted) {
    return { ok: false as const, error: "Bot not found." }
  }

  // A direct chat only exists because of its bot, so it goes too; the
  // membership row already cascaded with the bot delete. Group chats stay.
  const directChatIds = memberships
    .filter((membership) => membership.kind === "direct")
    .map((membership) => membership.chatId)

  if (directChatIds.length > 0) {
    await db.delete(chats).where(inArray(chats.id, directChatIds))
  }

  // The bot is gone, so release its sandbox. A failure here leaves an orphan
  // in Daytona, but must never turn a completed delete into an error.
  if (deleted.sandboxId) {
    try {
      await deleteBotSandbox(deleted.sandboxId)
    } catch (error) {
      console.error(
        "Failed to delete the sandbox for bot",
        botId,
        deleted.sandboxId,
        error,
      )
    }
  }

  revalidatePath("/")

  for (const { chatId } of memberships) {
    revalidatePath(`/chats/${chatId}`)
  }

  return { ok: true as const }
}
