import type { Metadata } from "next";
import { ConnectionsView } from "@/components/connections/ConnectionsView";
import { PageFrame } from "@/components/shell/PageHeader";

export const metadata: Metadata = {
  title: "Connections",
  description: "Connect the tools a plan goes out to: Slack approvals, Gmail and Outlook, HubSpot, Google Sheets, calendars and the OpenOOH export.",
};

export default function ConnectionsPage() {
  return (
    <PageFrame testId="connections-page" className="pt-6 lg:pt-10">
      <ConnectionsView />
    </PageFrame>
  );
}
