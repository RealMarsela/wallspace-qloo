import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Each lane runs its own dev server; a separate distDir avoids the shared .next/dev/lock.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  agentRules: false, // product keeps no AGENTS.md (shared instructions rule)
  // cacheComponents / partialPrefetching are off: on OpenNext + Workers a page render hangs ("Worker code had hung", 30 Oct deploy test).
  // Moved routes keep working for links already sent (e-mails, Slack, bookmarks). 308 = permanent, method and query kept.
  async redirects() {
    const moved = (source: string, destination: string) => ({ source, destination, permanent: true });
    return [
      moved("/sign-in", "/signin"),
      moved("/sign-up", "/signin?mode=sign-up"),
      moved("/onboarding", "/app/onboarding"),
      moved("/owner", "/app/owner"),
      moved("/owner/faces/:faceId", "/faces/:faceId"),
      moved("/app/plans/plan-sample", "/sample"),
      moved("/app/plans/plan-sample/faces/:faceId", "/sample/faces/:faceId"),
      moved("/app/runs/run-sample", "/sample/run"),
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
