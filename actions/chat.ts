"use server"

import { auth as clerkAuth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

import { getChatById } from "@/chats/queries"
import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import { groupChatFormSchema } from "@/db/validation"
import type { chatAgent } from "@/trigger/chat"

/**
 * The AI SDK chat helpers are heavy enough to matter on the Workers Free
 * memory budget. Import them only when an action runs, not when the page that
 * references these actions is server-rendered.
 */
function loadChatRuntime() {
  return import("@trigger.dev/sdk/ai")
}

/**
 * `chatId` comes from the browser, so each action re-checks that the
 * signed-in Clerk user owns it — getChatById scopes the query by userId.
 */
async function getOwnedChat(chatId: string) {
  const existing = await getChatById(chatId)
  if (!existing) throw new Error("Chat not found")
  return existing
}

async function assertChatAccess(chatId: string) {
  await getOwnedChat(chatId)
}

/**
 * Create a group chat from the sidebar dialog. The selected bots must all
 * belong to the signed-in user; the chat row and every membership row are
 * written in one Neon batch, so a partially-formed group never exists.
 */
export async function createGroupChat(input: {
  name: string
  memberIds: string[]
}) {
  const { isAuthenticated, userId } = await clerkAuth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const parsed = groupChatFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Give the group a name and pick at least two bots.",
    }
  }

  const memberIds = [...new Set(parsed.data.memberIds)]
  if (memberIds.length < 2) {
    return { ok: false as const, error: "Pick at least two bots." }
  }

  const ownedBots = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.userId, userId), inArray(bots.id, memberIds)))

  if (ownedBots.length !== memberIds.length) {
    return { ok: false as const, error: "Pick bots you own." }
  }

  const chatId = nanoid()

  await db.batch([
    db.insert(chats).values({
      id: chatId,
      kind: "group",
      name: parsed.data.name,
      userId,
    }),
    db.insert(chatMembers).values(
      memberIds.map((botId) => ({ chatId, botId })),
    ),
  ])

  revalidatePath("/")

  return { ok: true as const, chatId }
}

/**
 * Resolve the live desktop preview for this chat's bot. The Daytona SDK and
 * preview URL signing stay server-side; the browser only receives a URL that
 * is scoped to the one preview and expires.
 */
export async function getChatDesktopPreview({ chatId }: { chatId: string }) {
  const chat = await getOwnedChat(chatId)
  const bot = chat.bot

  if (!bot?.sandboxId) {
    return { ok: false as const, error: "This bot has no desktop yet." }
  }

  try {
    const { getSandboxVncUrl } = await import("@/lib/daytona")
    return {
      ok: true as const,
      url: await getSandboxVncUrl(bot.sandboxId),
    }
  } catch (error) {
    console.error("Could not load sandbox desktop", error)
    return {
      ok: false as const,
      error: "Couldn't start the desktop. Try again.",
    }
  }
}

/**
 * Creates (or resumes) the Trigger.dev session for this chat and returns the
 * session-scoped token the browser uses to append messages and read the stream.
 */
export async function startChatSession({ chatId }: { chatId: string }) {
  await assertChatAccess(chatId)

  const { chat } = await loadChatRuntime()
  return chat.createStartSessionAction<typeof chatAgent>("chat")({ chatId })
}

/** Pure mint — the transport calls this when a session token expires. */
export async function mintChatAccessToken(chatId: string) {
  await assertChatAccess(chatId)

  return triggerAuth.createPublicToken({
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

  const { chat, defaultStorage } = await loadChatRuntime()
  return chat.createLoadTranscriptAction(defaultStorage, { limit: 50 })({
    chatId,
    limit,
  })
}
