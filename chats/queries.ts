import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import type { Chat } from "@/db/schema"

/**
 * A single chat's display data.
 */
export type ChatDetail = {
  id: string
  kind: Chat["kind"]
  /** Group name, or the bot's name for direct chats. */
  displayName: string
  /** The chat's face — the earliest-joined member bot until groups land. */
  bot: {
    id: string
    name: string
    job: string
    instructions: string | null
    avatar: string
    sandboxId: string | null
  }
}

/**
 * Fetch one chat by id, scoped to the signed-in Clerk user — the session's
 * userId is part of the WHERE clause, so another user's chat id reads as
 * not found. Group chats fall back to the earliest-joined member bot for
 * name and avatar until group support lands.
 */
export async function getChatById(chatId: string): Promise<ChatDetail | null> {
  const { userId } = await auth()
  if (!userId) return null

  const [row] = await db
    .select({ chat: chats, bot: bots })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .orderBy(asc(chatMembers.joinedAt))
    .limit(1)

  if (!row) return null

  return {
    id: row.chat.id,
    kind: row.chat.kind,
    displayName: row.chat.name ?? row.bot.name,
    bot: {
      id: row.bot.id,
      name: row.bot.name,
      job: row.bot.job,
      instructions: row.bot.instructions,
      avatar: row.bot.avatar,
      sandboxId: row.bot.sandboxId,
    },
  }
}
