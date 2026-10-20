import type { NextConfig } from "next"
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

const nextConfig: NextConfig = {
  devIndicators: false,
}

export default nextConfig

// Prepares Cloudflare bindings for the `next dev` server so that
// `getCloudflareContext()` works during local development.
// https://opennext.js.org/cloudflare/bindings
initOpenNextCloudflareForDev()
