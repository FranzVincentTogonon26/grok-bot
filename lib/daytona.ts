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

const VNC_PORT = 6080
const SANDBOX_START_TIMEOUT_SECONDS = 120
const VNC_URL_TTL_SECONDS = 60 * 60 * 24

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
 * A browser-openable noVNC URL for a bot's desktop.
 *
 * The signed URL embeds its own preview token, so it can be used directly as
 * an iframe source (an iframe cannot send the `x-daytona-preview-token`
 * header that the standard preview link requires).
 *
 * Starting an idle sandbox and its desktop processes is part of loading the
 * preview: a stopped sandbox has no container IP to proxy to. Starting is
 * idempotent, and the caller only invokes this for a chat it owns.
 */
export async function getSandboxVncUrl(sandboxId: string): Promise<string> {
  const daytona = await getDaytonaClient()
  const sandbox = await daytona.get(sandboxId)

  if (sandbox.state !== "started") {
    await sandbox.start(SANDBOX_START_TIMEOUT_SECONDS)
  }

  const desktop = await sandbox.computerUse.getStatus()
  if (desktop.status !== "active") {
    await sandbox.computerUse.start()
  }

  const { url } = await sandbox.getSignedPreviewUrl(
    VNC_PORT,
    VNC_URL_TTL_SECONDS
  )

  // `vnc_lite.html` is noVNC's minimal viewer: it connects immediately and
  // has no settings panel competing with the desktop. `scale` keeps the
  // remote screen fitted to the iframe as the panel and dialog resize.
  const preview = new URL(url)
  preview.pathname = `${preview.pathname.replace(/\/$/, "")}/vnc_lite.html`
  preview.searchParams.set("scale", "true")

  return preview.toString()
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
