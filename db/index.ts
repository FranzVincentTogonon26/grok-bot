import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (local) or to the Worker environment (production).",
  );
}

/**
 * HTTP (fetch) transport: one request per query, no connection state —
 * works identically under `next dev`, CI, and the Cloudflare Workers
 * runtime (OpenNext populates process.env from Worker bindings).
 * DATABASE_URL must be the POOLED endpoint for app queries.
 */
const client = neon(databaseUrl);

export const db = drizzle(client, { schema });
