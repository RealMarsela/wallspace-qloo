import { defineConfig } from "@playwright/test";

// One end-to-end flow against a local OpenNext preview (real workerd, local D1 and KV). Build and serve it first:
//   NEXT_PUBLIC_DATA_MODE=app npx opennextjs-cloudflare build && npx wrangler d1 migrations apply WS_DB --local
//   npx opennextjs-cloudflare preview --port 3207      (needs WALLSPACE_AUTH_SECRET in .dev.vars)
// then `npx playwright test`. E2E_BASE_URL points the same flow at another deployment.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: 0,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3207", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
