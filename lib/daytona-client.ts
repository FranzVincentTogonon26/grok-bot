/**
 * Shared Daytona client factory.
 *
 * Kept out of `lib/daytona.ts` because that module is guarded with
 * `server-only`, which the Trigger.dev worker cannot import. Both the Next
 * server and the chat agent use this factory.
 */

const DEFAULT_API_URL = "https://app.daytona.io/api"

/**
 * The endpoint and key are passed explicitly: the SDK refuses to guess when a
 * working-directory `.env.local` sets `DAYTONA_API_URL` while the variable is
 * also in `process.env` (exactly what `next dev` produces).
 *
 * Imported lazily so a page render never pulls the SDK into the Workers bundle.
 */
export async function getDaytonaClient() {
  const { Daytona } = await import("@daytona/sdk")

  return new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL ?? DEFAULT_API_URL,
  })
}
