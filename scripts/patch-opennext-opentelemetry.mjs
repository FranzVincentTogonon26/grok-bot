/**
 * Patches a bug in @opennextjs/cloudflare 1.20.x.
 *
 * OpenNext traces `@opentelemetry/api` for the Node.js middleware, but the nft
 * copy only contains the CommonJS build (`build/src`). Its middleware esbuild
 * pass prefers the `module` field (`build/esm`), so once any dependency puts the
 * package in the tree (ai@6 does), the build fails with:
 *
 *   Could not resolve "@opentelemetry/api"
 *
 * OpenNext already falls back to Next's compiled copy; it just skips that alias
 * when the app has the real package installed. Force the alias for the
 * middleware bundle. No-op (with a warning) if upstream changes the code.
 */
import { readFileSync, writeFileSync } from "node:fs";

const file =
  "node_modules/@opennextjs/cloudflare/dist/cli/build/open-next/bundle-node-middleware.js";

const source = readFileSync(file, "utf8");
const check = /const hasOpentelemetry = existsSync\(.*?\);/s;

if (!check.test(source)) {
  console.warn(
    "[patch-opennext] hasOpentelemetry check not found — skipping (already patched or upstream changed).",
  );
} else {
  writeFileSync(
    file,
    source.replace(
      check,
      "const hasOpentelemetry = false; // patched by scripts/patch-opennext-opentelemetry.mjs",
    ),
  );
}
