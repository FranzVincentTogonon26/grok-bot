import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { chat } from "@trigger.dev/sdk/ai"
import { stepCountIs, type ModelMessage } from "ai"
import { z } from "zod"

import {
  getChatAgentContext,
  type ChatAgentContext,
} from "@/chats/agent-context"
import { createAgentTools } from "@/trigger/tools"

/** The static framing every bot gets, before its own role instructions. */
export function buildSystemPrompt({
  name,
  job,
  instructions,
  sandboxId,
}: ChatAgentContext) {
  const role = instructions?.trim()
  const sandbox = sandboxId
    ? `You have a dedicated Daytona sandbox reserved for you alone (sandbox ID: ${sandboxId}). It is an isolated Linux workspace, separate from the user's computer and from every other bot.`
    : "You have a dedicated Daytona sandbox reserved for you alone. It is an isolated Linux workspace, separate from the user's computer and from every other bot."

  return [
    `You are ${name}, an AI teammate.`,
    "",
    `Your job: ${job}`,
    "",
    "Your purpose: help the person you are chatting with do their best work in that role. Be clear, practical, and specific. Ask a question when a request is ambiguous, and be honest about what you don't know.",
    ...(role ? ["", "How you work:", role] : []),
    "",
    "Environment:",
    sandbox,
    "",
    "Your tools:",
    "You can work directly inside your sandbox. Use bash to run commands; use readFile, writeFile, and listFiles to work with files; and use the desktop tools to control the sandbox's graphical desktop.",
    "Call viewScreen before mouse or keyboard actions when you need to see the layout. Screenshot results include the display size, and coordinates are measured in pixels from the top-left corner. Use viewScreen to inspect the screen for yourself. Use showScreen only when the user asks to see the screen (or when sharing the screen is the point of the task), because showScreen renders the screenshot in the chat.",
    "After an action that changes the screen, call viewScreen again when you need to verify the result. Screenshots from earlier turns are omitted from your context, so call viewScreen again whenever you need the current screen.",
  ].join("\n")
}

const SCREENSHOT_TOOLS = new Set(["viewScreen", "showScreen"])
const OMITTED_SCREENSHOT =
  "[Earlier screenshot omitted from history. Call viewScreen to inspect the current screen, or showScreen to show it to the user.]"

/**
 * Screenshot results are large base64 images. They are useful in the turn that
 * captures them, but resending every old screenshot on every later turn would
 * waste context. Replace historical screenshot parts with a short reminder;
 * the agent can always call viewScreen again for the current desktop. The UI
 * transcript keeps its own copy, so `showScreen` still renders on reload.
 */
function stripOldScreenshots(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((message) => {
    if (message.role !== "tool") return message

    let changed = false
    const content = message.content.map((part) => {
      if (part.type !== "tool-result") return part
      if (!SCREENSHOT_TOOLS.has(part.toolName)) return part

      // Defensive fallback: if a conversion path ever leaves the raw output as
      // JSON instead of applying `toModelOutput`, do not keep the base64 image.
      if (part.output.type === "json") {
        const value = part.output.value
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          "image" in value
        ) {
          changed = true
          return {
            ...part,
            output: { type: "text" as const, value: OMITTED_SCREENSHOT },
          }
        }
        return part
      }

      if (part.output.type !== "content") return part

      const hasImage = part.output.value.some(
        (value) =>
          value.type === "image-data" ||
          value.type === "file-data" ||
          value.type === "media"
      )
      if (!hasImage) return part

      changed = true
      return {
        ...part,
        output: {
          type: "text" as const,
          value: OMITTED_SCREENSHOT,
        },
      }
    })

    return changed ? { ...message, content } : message
  })
}

/**
 * Per-message client data. Group chats pass the bot selected in the composer;
 * direct chats omit it and fall back to their only member.
 */
const chatClientDataSchema = z
  .object({
    botId: z.string().min(1).optional(),
  })
  .optional()

/**
 * The chat agent behind every chat page. Trigger.dev persists the transcript
 * per chat (the Session's `externalId` is our chat id), so a reload or a new
 * run picks the conversation up where it left off.
 */
export const chatAgent = chat.agent({
  id: "chat",
  clientDataSchema: chatClientDataSchema,
  tools: async ({ chatId, clientData }) => {
    const context = await getChatAgentContext(chatId, clientData?.botId)
    if (!context) throw new Error(`Chat ${chatId} not found`)
    if (!context.sandboxId) {
      throw new Error(`The bot for chat ${chatId} has no sandbox`)
    }

    return createAgentTools(context.sandboxId)
  },
  prepareMessages: ({ messages }) => stripOldScreenshots(messages),
  uiMessageStreamOptions: {
    onError: (error) => {
      console.error("Chat stream error:", error)
      return "Something went wrong. Please try again."
    },
  },
  run: async ({
    chatId,
    clientData,
    messages,
    tools,
    signal,
    streamText,
  }) => {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set")

    const context = await getChatAgentContext(chatId, clientData?.botId)
    if (!context) throw new Error(`Chat ${chatId} not found`)

    const google = createGoogleGenerativeAI({ apiKey })

    return streamText({
      model: google("gemini-flash-latest"),
      system: buildSystemPrompt(context),
      messages,
      tools,
      stopWhen: stepCountIs(25),
      abortSignal: signal,
    })
  },
})
