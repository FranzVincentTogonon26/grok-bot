import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Incremental cache (ISR/SSG revalidation) is not configured yet, so
  // revalidated pages are cached in-memory per request. To enable durable
  // caching, follow https://opennext.js.org/cloudflare/caching and add the
  // R2 + KV bindings to wrangler.jsonc.
});
