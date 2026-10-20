import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { auth } from "@clerk/nextjs/server"
import { convertToModelMessages, streamText, type UIMessage } from "ai"

export async function POST(request: Request) {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    return new Response("Unauthorized", { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response("GEMINI_API_KEY is not set", { status: 500 })
  }

  const { messages }: { messages: UIMessage[] } = await request.json()

  const google = createGoogleGenerativeAI({ apiKey })
  const result = streamText({
    model: google("gemini-flash-latest"),
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
