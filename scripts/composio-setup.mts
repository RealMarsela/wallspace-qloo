// Creates the wallspace-* Composio auth configs (managed auth) and prints one connect link per toolkit for the demo user.
// Usage: COMPOSIO_API_KEY from the vault, then `npx tsx scripts/composio-setup.mts gmail outlook [--links]`.
// Never prints the API key. Only objects named wallspace-* are created or read back.
import { ComposioClient } from "../src/server/connectors/composio/client";
import { DEMO_USER_ID } from "../src/contract/connectors-comms";

const args = process.argv.slice(2);
const links = args.includes("--links");
const toolkits = args.filter((a) => !a.startsWith("--"));
const callbackBase = process.env.APP_URL ?? "https://wallspace.pages.dev";
const client = new ComposioClient({ apiKey: process.env.COMPOSIO_API_KEY });

for (const toolkit of toolkits.length ? toolkits : ["gmail", "outlook"]) {
  const cfg = await client.ensureAuthConfig(toolkit);
  process.stdout.write(`${cfg.name}  ${cfg.id}  ${cfg.created ? "created" : "exists"}\n`);
  if (links) {
    const link = await client.connectLink(toolkit, DEMO_USER_ID, `${callbackBase}/api/connectors/composio/callback?provider=${toolkit}`);
    process.stdout.write(`  consent link (${toolkit}): ${link.redirectUrl}\n`);
  }
}
