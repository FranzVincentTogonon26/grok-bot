import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare / OpenNext build output and local tooling:
    ".open-next/**",
    ".wrangler/**",
    ".opencode/**",
    // Vendored skill reference scripts — not application code.
    ".agents/**",
  ]),
  // Vendored shadcn registry components. The React Compiler rules flag
  // patterns this third-party code relies on (media refs, effect state sync).
  {
    files: ["components/ai-elements/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
]);

export default eslintConfig;
