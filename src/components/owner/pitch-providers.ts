export type Provider = "gmail" | "outlook" | "slack";

export const PROVIDERS: Provider[] = ["gmail", "outlook", "slack"];

export const providerMeta: Record<Provider, { name: string; logo: string; reply: string }> = {
  gmail: {
    name: "Gmail",
    logo: "/logos/gmail.svg",
    reply: "Replies come back to this Gmail thread. Wallspace checks for them every 10 minutes, and Nemotron sorts each one: confirmed, counter-offer, unavailable or question.",
  },
  outlook: {
    name: "Outlook",
    logo: "/logos/outlook.svg",
    reply: "Replies come back to this Outlook thread. Wallspace checks for them every 10 minutes, and Nemotron sorts each one: confirmed, counter-offer, unavailable or question.",
  },
  slack: {
    name: "Slack",
    logo: "/logos/slack.svg",
    reply: "Shared inside your Slack for the sales team. No e-mail leaves Wallspace.",
  },
};

/** A first note that names the brand; the owner edits it before sending. */
export function noteFor(brand: string, faceName: string, neighbourhood: string) {
  if (!brand) return "";
  return `Hi, I run the face at ${faceName} in ${neighbourhood}. Fans of ${brand} over-index among the people who live around it, so I think it fits your next Atlanta flight. Happy to hold dates or send a proof.`;
}
