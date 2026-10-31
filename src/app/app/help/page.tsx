import type { Metadata } from "next";
import { HelpPage } from "@/components/learn/HelpPage";

export const metadata: Metadata = { title: "Help", description: "Briefs, the taste-only guard, labels, reading a plan, connectors and limits." };

export default function AppHelpPage() {
  return <HelpPage variant="app" />;
}
