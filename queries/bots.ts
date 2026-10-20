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
  /** Seed for the ChatAvatar (DiceBear gaze). */
  botAvatar: string
  lastMessagePreview: string | null
  lastMessageAt: Date
}

/**
 * The signed-in Clerk user's chats, newest activity first. Scoped to the
 * session's userId — never trust a userId from the caller.
 *
 * Group chats duplicate the chat row per member; the first membership (the
 * earliest-joined bot) becomes the chat's face. Group naming comes later.
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
    .orderBy(desc(chats.lastMessageAt), asc(chatMembers.joinedAt))

  const byChat = new Map<string, SidebarChat>()
  for (const { chat, bot } of rows) {
    if (byChat.has(chat.id)) continue
    byChat.set(chat.id, {
      id: chat.id,
      kind: chat.kind,
      displayName: chat.name ?? bot.name,
      botAvatar: bot.avatar,
      lastMessagePreview: chat.lastMessagePreview,
      lastMessageAt: chat.lastMessageAt,
    })
  }

  return [...byChat.values()]
}
