import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"

export type ChatAgentContext = {
  name: string
  job: string
  instructions: string | null
  sandboxId: string | null
}

/**
 * The bot behind a chat, for the chat agent's system prompt and tools.
 *
 * The agent reads this each turn, so edits to a bot's name, job, or
 * instructions take effect without starting a new chat session.
 *
 * Group chats pass the bot selected in the composer as `botId`; the membership
 * join keeps that selection inside the chat. Without a selection — direct
 * chats or legacy clients — the earliest member is the fallback.
 *
 * Authorization happens before the session exists: `startChatSession` checks
 * that the signed-in user owns the chat, and the agent only ever sees the
 * `chatId` stored as that session's external id.
 */
export async function getChatAgentContext(
  chatId: string,
  botId?: string,
): Promise<ChatAgentContext | null> {
  const [row] = await db
    .select({
      name: bots.name,
      job: bots.job,
      instructions: bots.instructions,
      sandboxId: bots.sandboxId,
    })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(and(eq(chats.id, chatId), botId ? eq(bots.id, botId) : undefined))
    .orderBy(asc(chatMembers.joinedAt), asc(chatMembers.botId))
    .limit(1)

  return row ?? null
}
