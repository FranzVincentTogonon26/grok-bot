import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { chat } from "@trigger.dev/sdk/ai"

/**
 * The chat agent behind every chat page. Trigger.dev persists the transcript
 * per chat (the Session's `externalId` is our chat id), so a reload or a new
 * run picks the conversation up where it left off.
 */
export const chatAgent = chat.agent({
  id: "chat",
  uiMessageStreamOptions: {
    onError: (error) => {
      console.error("Chat stream error:", error)
      return "Something went wrong. Please try again."
    },
  },
  run: async ({ messages, signal, streamText }) => {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set")

    const google = createGoogleGenerativeAI({ apiKey })

    return streamText({
      model: google("gemini-flash-latest"),
      messages,
      abortSignal: signal,
    })
  },
})
