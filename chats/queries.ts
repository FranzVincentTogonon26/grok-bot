import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import type { Chat } from "@/db/schema"

/**
 * A member bot's display data.
 */
export type ChatMemberDetail = {
  id: string
  name: string
  job: string
  instructions: string | null
  avatar: string
  sandboxId: string | null
}

/**
 * A single chat's display data.
 */
export type ChatDetail = {
  id: string
  kind: Chat["kind"]
  /** Group name, or the bot's name for direct chats. */
  displayName: string
  /** Every member bot, in joined order. */
  members: ChatMemberDetail[]
  /** The bot behind a direct chat; null for group chats. */
  bot: ChatMemberDetail | null
}

/**
 * Fetch one chat by id, scoped to the signed-in Clerk user — the session's
 * userId is part of the WHERE clause, so another user's chat id reads as
 * not found. Group chats return every member; direct chats return their one
 * bot on `bot` as well.
 */
export async function getChatById(chatId: string): Promise<ChatDetail | null> {
  const { userId } = await auth()
  if (!userId) return null

  const rows = await db
    .select({ chat: chats, bot: bots })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .orderBy(asc(chatMembers.joinedAt), asc(chatMembers.botId))

  const [first] = rows
  if (!first) return null

  const members = rows.map(({ bot }) => ({
    id: bot.id,
    name: bot.name,
    job: bot.job,
    instructions: bot.instructions,
    avatar: bot.avatar,
    sandboxId: bot.sandboxId,
  }))

  return {
    id: first.chat.id,
    kind: first.chat.kind,
    displayName: first.chat.name ?? members[0].name,
    members,
    bot: first.chat.kind === "direct" ? members[0] : null,
  }
}
