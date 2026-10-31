import type { Metadata } from "next";
import Link from "next/link";
import { Block, PublicPage } from "@/components/site/PublicPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Wallspace stores, what it never collects, and which third parties process data to run it.",
};

const CONTACT = "testerbuster564@gmail.com";

const thirdParties: [string, string][] = [
  ["Qloo", "Receives taste seeds (things an audience loves) and map coordinates of faces. No personal data."],
  ["Nebius Token Factory", "Runs the NVIDIA Nemotron and embedding models. Receives brief text, block taste tags, site photos and draft copy for inference."],
  ["Nebius AI Cloud (Serverless Jobs)", "Runs the NeMo Guardrails sign-off job over brief text and copy lines waiting for sign-off."],
  ["Tavily", "Receives neighbourhood names and date ranges as search queries for local events."],
  ["Cloudflare", "Hosts the app and stores plans, briefs, run logs, connection records and cached results."],
  ["Composio", "Our connection provider. Holds the OAuth tokens for connected Google, Microsoft, HubSpot and Notion accounts and carries out the actions you start."],
  ["Slack", "Receives plan approval messages in the workspace you connect; sends back button clicks and thread replies."],
  ["Google (Gmail, Google Sheets, Google Calendar)", "Receives the emails, sheets and calendar events you send from a plan; sends back replies, sheet edits and event changes."],
  ["Microsoft (Outlook mail and calendar)", "Same as Google, for Outlook accounts."],
  ["HubSpot and Notion", "Receive the deal or page Wallspace creates for a plan; send back stage or property changes on it."],
  ["OpenFreeMap", "Serves map tiles to your browser, so it sees your IP address like any website you load."],
];

export default function PrivacyPage() {
  return (
    <PublicPage
      testId="privacy"
      toc
      eyebrow="Effective 30 October 2026"
      title="Privacy"
      lede={
        <>
          Wallspace is a hackathon project that plans billboard and street-furniture campaigns by audience taste. It is not a
          production service and nothing is sold through it. This page says what it stores, what it never collects, and who
          processes data to run it. Questions or deletion requests:{" "}
          <a data-testid="privacy-contact" className="text-on-night underline underline-offset-4" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </>
      }
    >
      <Block title="In short" id="short">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Wallspace plans by aggregate taste by place. It never tracks devices or people and never targets by identity.</li>
          <li>It stores the briefs and plans you create, and labels for the accounts you connect. Your data is never sold.</li>
          <li>Tokens for connected Google, Microsoft, HubSpot and Notion accounts are held by our connection provider, Composio, not in the Wallspace database.</li>
          <li>You can disconnect any account at any time and ask us to delete everything.</li>
        </ul>
      </Block>

      <Block title="What Wallspace stores" id="stores">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-ink">Briefs:</strong> brand name, the audience description and the things it loves, budget, flight dates, brand voice, and any site photos or current creative you upload.</li>
          <li><strong className="text-ink">Plans and run logs:</strong> picked faces, scores, evidence, copy lines, guard verdicts, and for each model call the model name, token counts, time, cost and the provider&apos;s request id.</li>
          <li><strong className="text-ink">Connected accounts:</strong> the provider, a label for the account (for example the email address or workspace name shown by the provider), connection status, last sync time, and a short log of what Wallspace sent and what came back (for example &ldquo;plan emailed to 1 recipient&rdquo; or &ldquo;deal moved to Approved&rdquo;).</li>
          <li><strong className="text-ink">Tokens:</strong> OAuth tokens for Google, Microsoft, HubSpot and Notion are held by Composio. The Slack bot token for a connected workspace is stored server-side on Cloudflare and is never sent to a browser.</li>
          <li><strong className="text-ink">Cached results:</strong> Qloo and Tavily responses, kept server-side so repeat plans do not call those services again.</li>
        </ul>
      </Block>

      <Block title="What Wallspace reads from connected tools" id="reads">
        <p>
          Wallspace acts in a connected tool only when you press a button, such as sending a plan by email or posting it to
          Slack for approval. To keep the plan in sync it reads back only items tied to something it sent: replies to that
          email, clicks on that Slack message, changes to the CRM deal, sheet, page or calendar events it created. Anything
          else that reaches it is discarded and not stored.
        </p>
        <p>
          Wallspace&apos;s use and transfer of information received from Google APIs adheres to the{" "}
          <a className="underline" href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>,
          including the Limited Use requirements. Data from Google, Microsoft, Slack, HubSpot or Notion is used only to provide
          the features you use, is not used for advertising, is not sold, and is not used to train AI models.
        </p>
      </Block>

      <Block title="What Wallspace never collects" id="never">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>No device identifiers, phone-location data or tracking of any person&apos;s movements.</li>
          <li>No targeting or describing people by race, religion, sexuality, health or other identity. Briefs that ask for it are refused and rewritten as taste.</li>
          <li>No advertising or analytics trackers. The site keeps one browser storage item for your light or dark mode choice, and the session cookie described below; Cloudflare may set strictly necessary security cookies.</li>
          <li>Accounts are optional and free: reading the sample plan and the limits page needs no sign-in. If you sign up we store your name, email and a salted hash of your password (never the password), and set one httpOnly session cookie that lasts 14 days. Signing out removes it.</li>
        </ul>
      </Block>

      <Block title="Third parties that process data" id="third-parties">
        <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
          {thirdParties.map(([name, what]) => (
            <div key={name} className="bg-surface p-4">
              <dt className="text-small font-semibold text-ink">{name}</dt>
              <dd className="mt-1 text-small">{what}</dd>
            </div>
          ))}
        </dl>
        <p>Each of these services handles data under its own privacy policy.</p>
      </Block>

      <Block title="How long data is kept" id="retention">
        <p>
          This build runs through the hackathon judging period, which ends in December 2026. Briefs, plans, run logs and
          connection records are deleted when the project shuts down, or sooner if you ask. Disconnecting an account removes
          its connection at Composio or revokes the Slack token, and stops all syncing for it.
        </p>
      </Block>

      <Block title="Your choices" id="choices">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Disconnect any tool on the <Link data-testid="privacy-link-connections" className="underline" href="/app/connections">Connections</Link> page.</li>
          <li>Revoke access from the provider too: your Google Account&apos;s third-party access page, Microsoft account app permissions, Slack&apos;s app management, or HubSpot and Notion connected-app settings.</li>
          <li>Email <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> to get a copy of your data or have it deleted. We reply within 7 days.</li>
        </ul>
      </Block>

      <Block title="Children" id="children">
        <p>Wallspace is a business tool for media planners and media owners. It is not meant for anyone under 16.</p>
      </Block>

      <Block title="Changes" id="changes">
        <p>If this policy changes, the new version will be posted here with a new effective date.</p>
      </Block>
    </PublicPage>
  );
}
