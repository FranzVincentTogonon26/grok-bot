import "server-only"

import { getDaytonaClient } from "@/lib/daytona-client"

/**
 * Daytona sandboxes, one per bot.
 *
 * A bot owns exactly one sandbox: it is provisioned when the bot is created
 * and destroyed when the bot is deleted. The chat agent's computer-use tools
 * live in `trigger/tools.ts` and use the same shared client factory.
 *
 * The SDK is imported lazily inside `getDaytonaClient` so a page render never
 * pulls it into the Workers bundle (same reason as the chat runtime in
 * `actions/chat.ts`).
 */

/** Labels stamped on every sandbox so a leaked one is attributable. */
function sandboxLabels(botId: string) {
  return { app: "grok-bot", botId }
}

/**
 * True when Daytona rejects a sandbox create because the organization has no
 * default region. That is account setup, not a transient failure: the
 * `/organizations` endpoints only accept a user session (JWT), so an API key
 * cannot set the region — the account owner has to pick one in the dashboard.
 */
export function isMissingDefaultRegionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as { statusCode?: number }).statusCode === 400 &&
    error.message.includes("does not have a default region")
  )
}

/**
 * Create a sandbox for a freshly created bot and return its Daytona id.
 *
 * Throws when Daytona is unreachable, `DAYTONA_API_KEY` is missing, or the
 * org is out of quota — the caller decides whether bot creation should fail.
 */
export async function createBotSandbox(botId: string): Promise<string> {
  const daytona = await getDaytonaClient()

  const sandbox = await daytona.create({
    labels: sandboxLabels(botId),
  })

  return sandbox.id
}

/**
 * Delete a bot's sandbox. Safe to call twice: a sandbox that is already gone
 * resolves instead of throwing.
 */
export async function deleteBotSandbox(sandboxId: string): Promise<void> {
  const { DaytonaNotFoundError } = await import("@daytona/sdk")
  const daytona = await getDaytonaClient()

  try {
    await daytona.delete(await daytona.get(sandboxId))
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) return
    throw error
  }
}
