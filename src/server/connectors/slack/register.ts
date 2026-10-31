import { registerProvider, registerSender } from "../composio/registry";
import { authTest, SlackError } from "./api";
import { slackSender } from "./send";

// Slack is an own app (Composio has no trigger for Block Kit clicks). Demo workspace: bot token from the vault,
// installed once from api.slack.com/apps with docs/slack-app-manifest.yaml.

let cached: { at: number; team: string | null; error: boolean } | null = null;

registerProvider({
  id: "slack", name: "Slack", category: "chat", realtime: "webhook",
  async status({ rt }) {
    const token = rt.env.WALLSPACE_SLACK_BOT_TOKEN;
    if (!token) return { status: "not-connected", account: null };
    if (!cached || Date.now() - cached.at > 60_000) {
      try {
        const me = await authTest((...a) => fetch(...a), token);
        cached = { at: Date.now(), team: me.team ?? null, error: false };
      } catch {
        cached = { at: Date.now(), team: null, error: true };
      }
    }
    return cached.error ? { status: "error", account: null } : { status: "connected", account: cached.team };
  },
  async connect() {
    throw new SlackError("Slack installs from api.slack.com/apps with the Wallspace manifest; the bot token is stored as a Worker secret", "slack_manual_install");
  },
  async disconnect() {
    throw new SlackError("Slack is installed as a Worker secret; uninstall the Wallspace app from the Slack workspace to disconnect", "slack_manual_install");
  },
});
registerSender("slack", slackSender());
