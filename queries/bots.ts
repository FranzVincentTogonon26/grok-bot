import { auth } from "@clerk/nextjs/server"
import { asc, desc, eq } from "drizzle-orm"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import type { Chat } from "@/db/schema"

/**
 * A chat summarized for the sidebar list.
 */
export type SidebarChat = {
  id: string
  kind: Chat["kind"]
  /** Group name, or the bot's name for direct chats. */
  displayName: string
  /** Avatar seeds for the chat's members, in joined order. */
  memberAvatars: string[]
  lastMessagePreview: string | null
  lastMessageAt: Date
}

/**
 * The signed-in Clerk user's chats, newest activity first. Scoped to the
 * session's userId — never trust a userId from the caller.
 *
 * A chat has one row per member. Direct chats have one; group chats collect
 * every member avatar so the sidebar can render the member stack instead of
 * pinning the chat to its first bot.
 */
export async function getSidebarChats(): Promise<SidebarChat[]> {
  const { userId } = await auth()
  if (!userId) return []

  const rows = await db
    .select({ chat: chats, bot: bots })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(eq(chats.userId, userId))
    .orderBy(
      desc(chats.lastMessageAt),
      asc(chatMembers.joinedAt),
      asc(chatMembers.botId),
    )

  const byChat = new Map<string, SidebarChat>()
  for (const { chat, bot } of rows) {
    const existing = byChat.get(chat.id)
    if (existing) {
      existing.memberAvatars.push(bot.avatar)
      continue
    }

    byChat.set(chat.id, {
      id: chat.id,
      kind: chat.kind,
      displayName: chat.name ?? bot.name,
      memberAvatars: [bot.avatar],
      lastMessagePreview: chat.lastMessagePreview,
      lastMessageAt: chat.lastMessageAt,
    })
  }

  return [...byChat.values()]
}

/**
 * A bot option for the group chat dialog.
 */
export type BotOption = {
  id: string
  name: string
  avatar: string
}

/**
 * The signed-in Clerk user's bots, in creation order.
 */
export async function getBotOptions(): Promise<BotOption[]> {
  const { userId } = await auth()
  if (!userId) return []

  return db
    .select({ id: bots.id, name: bots.name, avatar: bots.avatar })
    .from(bots)
    .where(eq(bots.userId, userId))
    .orderBy(asc(bots.createdAt), asc(bots.name))
}
