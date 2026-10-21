"use server"

import { auth } from "@trigger.dev/sdk"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"

import { getChatById } from "@/chats/queries"
import type { chatAgent } from "@/trigger/chat"

const startSession = chat.createStartSessionAction<typeof chatAgent>("chat")
const loadTranscript = chat.createLoadTranscriptAction(defaultStorage, {
  limit: 50,
})

/**
 * `chatId` comes from the browser, so each action re-checks that the
 * signed-in Clerk user owns it — getChatById scopes the query by userId.
 */
async function assertChatAccess(chatId: string) {
  const existing = await getChatById(chatId)
  if (!existing) throw new Error("Chat not found")
}

/**
 * Creates (or resumes) the Trigger.dev session for this chat and returns the
 * session-scoped token the browser uses to append messages and read the stream.
 */
export async function startChatSession({ chatId }: { chatId: string }) {
  await assertChatAccess(chatId)
  return startSession({ chatId })
}

/** Pure mint — the transport calls this when a session token expires. */
export async function mintChatAccessToken(chatId: string) {
  await assertChatAccess(chatId)

  return auth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  })
}

/** Reads the persisted Trigger.dev transcript for this chat. */
export async function loadChatTranscript({
  chatId,
  limit,
}: {
  chatId: string
  limit?: number
}) {
  await assertChatAccess(chatId)
  return loadTranscript({ chatId, limit })
}
