import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load the same env files Next does.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (local) or pass it in the environment (CI).",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  dbCredentials: {
    // DDL traffic (drizzle-kit push) must use the DIRECT (non-pooled)
    // endpoint: the -pooler host runs PgBouncer in transaction mode,
    // which breaks DDL tooling (prepared statements / session state).
    // No migrations in this project — schema changes are push-only
    // (see the Database rules in AGENTS.md).
    url: databaseUrl.replace("-pooler.", "."),
  },
});
