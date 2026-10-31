import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext defaults: no incremental or tag cache. Wallspace keeps state in D1, KV and Durable Objects, not in Next's cache.
// The Worker entry that adds the Durable Objects, Workflows and the cron handler is worker/index.ts.
export default defineCloudflareConfig();
