import type { Metadata } from "next";
import { HelpPage } from "@/components/learn/HelpPage";

export const metadata: Metadata = { title: "Help", description: "Briefs, the taste-only guard, labels, reading a plan, connectors and limits." };

// Public twin of /app/help for signed-out visitors of the sample plan.
export default function SampleHelpPage() {
  return <HelpPage variant="public" />;
}
